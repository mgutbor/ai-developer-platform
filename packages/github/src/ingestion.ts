import { createRepositorySnapshot } from '@ai-developer-platform/domain';
import { GitHubIngestionError } from './errors.js';
import { parseRepositoryReference } from './reference.js';
import {
  DEFAULT_FILE_SELECTION_POLICY,
  DEFAULT_INGESTION_LIMITS,
  isSelectableFile,
  normalizeSelectedPath,
} from './policy.js';
import type {
  FileSelectionPolicy,
  GitHubBlobResponse,
  GitHubClient,
  GitHubTreeEntry,
  IngestionLimits,
  IngestionResult,
  RepositoryFile,
} from './types.js';

export interface IngestRepositoryOptions {
  readonly ref?: string;
  readonly limits?: Partial<IngestionLimits>;
  readonly policy?: FileSelectionPolicy;
}

function mergeLimits(overrides: Partial<IngestionLimits> | undefined): IngestionLimits {
  const limits = Object.freeze({ ...DEFAULT_INGESTION_LIMITS, ...overrides });
  const numericLimits: readonly (keyof IngestionLimits)[] = [
    'maxFileCount',
    'maxFileBytes',
    'maxTotalBytes',
    'maxTreeEntries',
    'maxApiRequests',
    'requestTimeoutMs',
    'ingestionTimeoutMs',
    'maxJsonResponseBytes',
  ];
  for (const key of numericLimits) {
    if (!Number.isInteger(limits[key]) || limits[key] <= 0) {
      throw new GitHubIngestionError(
        'ingestion_limit_reached',
        `${key} must be a positive integer`,
      );
    }
  }
  return limits;
}

function isLfsPointer(content: string): boolean {
  return /^version https:\/\/git-lfs\.github\.com\/spec\/v1\r?\n/.test(content);
}

function decodeBase64Text(blob: GitHubBlobResponse, maxFileBytes: number): string {
  if (blob.encoding !== 'base64') {
    throw new GitHubIngestionError('content_decode_failed', 'GitHub blob encoding is unsupported');
  }
  const normalized = blob.content.replace(/[\r\n\t ]/g, '');
  if (
    normalized.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)
  ) {
    throw new GitHubIngestionError(
      'content_decode_failed',
      'GitHub blob content is not valid base64',
    );
  }
  const bytes = Buffer.from(normalized, 'base64');
  if (bytes.byteLength !== blob.size) {
    throw new GitHubIngestionError(
      'invalid_response',
      'GitHub blob size does not match its content',
    );
  }
  if (bytes.byteLength > maxFileBytes) {
    throw new GitHubIngestionError(
      'file_too_large',
      'Repository file exceeds the configured size limit',
    );
  }
  if (bytes.some((byte) => byte === 0)) {
    throw new GitHubIngestionError('unsupported_file', 'Repository file contains binary data');
  }
  const controlBytes = bytes.filter(
    (byte) => byte < 32 && byte !== 9 && byte !== 10 && byte !== 12 && byte !== 13,
  ).length;
  if (bytes.byteLength > 0 && controlBytes / bytes.byteLength > 0.01) {
    throw new GitHubIngestionError('unsupported_file', 'Repository file contains binary data');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new GitHubIngestionError('content_decode_failed', 'Repository file is not valid UTF-8');
  }
}

function addLimitation(limitations: string[], value: string): void {
  if (!limitations.includes(value)) {
    limitations.push(value);
  }
}

function selectEntries(
  entries: readonly GitHubTreeEntry[],
  limits: IngestionLimits,
  policy: FileSelectionPolicy,
  limitations: string[],
): GitHubTreeEntry[] {
  const boundedEntries = entries.slice(0, limits.maxTreeEntries);
  if (entries.length > limits.maxTreeEntries) {
    addLimitation(limitations, 'tree_entry_limit_reached');
  }
  const selected: GitHubTreeEntry[] = [];
  for (const entry of boundedEntries) {
    try {
      if (isSelectableFile(entry, policy)) {
        selected.push(entry);
      }
    } catch (error) {
      if (error instanceof GitHubIngestionError && error.category === 'security_rejected') {
        addLimitation(limitations, `unsafe_path_excluded:${entry.path}`);
        continue;
      }
      throw error;
    }
  }
  return selected;
}

async function withIngestionTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new GitHubIngestionError('request_timeout', 'Repository ingestion timed out'));
    }, timeoutMs);
  });
  const operationPromise = operation(controller.signal);
  void operationPromise.catch(() => undefined);
  try {
    return await Promise.race([operationPromise, timeout]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    controller.abort();
  }
}

async function ingestRepositoryInternal(
  referenceInput: string,
  client: GitHubClient,
  options: IngestRepositoryOptions,
  signal: AbortSignal,
): Promise<IngestionResult> {
  const limits = mergeLimits(options.limits);
  const policy = options.policy ?? DEFAULT_FILE_SELECTION_POLICY;
  const reference = parseRepositoryReference(referenceInput, options.ref);
  let apiRequests = 0;
  const request = async <T>(operation: () => Promise<T>): Promise<T> => {
    if (signal.aborted) {
      throw new GitHubIngestionError('request_timeout', 'Repository ingestion timed out');
    }
    apiRequests += 1;
    if (apiRequests > limits.maxApiRequests) {
      throw new GitHubIngestionError('ingestion_limit_reached', 'GitHub API request limit reached');
    }
    return operation();
  };
  const repository = await request(() =>
    client.getRepository(reference.owner, reference.repository, { signal }),
  );
  if (repository.isPrivate) {
    throw new GitHubIngestionError(
      'repository_not_public',
      'Only public GitHub repositories are supported',
    );
  }
  const ref = reference.ref ?? repository.defaultBranch;
  const commitSha = await request(() =>
    client.resolveRef(reference.owner, reference.repository, ref, { signal }),
  );
  const tree = await request(() =>
    client.getTree(reference.owner, reference.repository, commitSha, { signal }),
  );
  const snapshot = createRepositorySnapshot({
    owner: reference.owner,
    name: reference.repository,
    repositoryUrl: reference.canonicalUrl,
    ref,
    commitSha,
  });
  const limitations: string[] = [];
  if (tree.truncated) {
    addLimitation(limitations, 'tree_truncated');
  }

  const selectedEntries = selectEntries(tree.entries, limits, policy, limitations);
  const files: RepositoryFile[] = [];
  let totalBytes = 0;
  for (const entry of selectedEntries) {
    if (files.length >= limits.maxFileCount) {
      addLimitation(limitations, 'file_count_limit_reached');
      break;
    }
    const path = normalizeSelectedPath(entry.path);
    if (entry.size !== undefined && entry.size > limits.maxFileBytes) {
      addLimitation(limitations, `file_too_large:${path}`);
      continue;
    }
    if (entry.size !== undefined && totalBytes + entry.size > limits.maxTotalBytes) {
      addLimitation(limitations, 'total_file_bytes_limit_reached');
      break;
    }

    let blob: GitHubBlobResponse;
    try {
      blob = await request(() =>
        client.getBlob(reference.owner, reference.repository, entry.sha, { signal }),
      );
    } catch (error) {
      if (error instanceof GitHubIngestionError && error.category === 'file_unavailable') {
        addLimitation(limitations, `file_unavailable:${path}`);
        continue;
      }
      throw error;
    }
    if (blob.sha !== entry.sha) {
      addLimitation(limitations, `blob_sha_mismatch:${path}`);
      continue;
    }
    if (blob.size > limits.maxFileBytes || totalBytes + blob.size > limits.maxTotalBytes) {
      addLimitation(
        limitations,
        blob.size > limits.maxFileBytes
          ? `file_too_large:${path}`
          : 'total_file_bytes_limit_reached',
      );
      if (blob.size <= limits.maxFileBytes) {
        break;
      }
      continue;
    }

    let content: string;
    try {
      content = decodeBase64Text(blob, limits.maxFileBytes);
    } catch (error) {
      if (
        error instanceof GitHubIngestionError &&
        (error.category === 'content_decode_failed' || error.category === 'unsupported_file')
      ) {
        addLimitation(limitations, `${error.category}:${path}`);
        continue;
      }
      throw error;
    }
    if (isLfsPointer(content)) {
      addLimitation(limitations, `git_lfs_unavailable:${path}`);
      continue;
    }

    files.push(
      Object.freeze({
        content,
        path,
        sha: blob.sha,
        size: blob.size,
        snapshotId: snapshot.id,
      }),
    );
    totalBytes += blob.size;
  }

  return Object.freeze({
    files: Object.freeze(files),
    limitations: Object.freeze(limitations),
    metadata: Object.freeze({
      repository: Object.freeze({
        defaultBranch: repository.defaultBranch,
        sizeKb: repository.sizeKb,
      }),
      selectedFileCount: files.length,
      totalBytes,
      treeEntriesSeen: tree.entries.length,
      treeTruncated: tree.truncated,
    }),
    snapshot,
  });
}

export function ingestRepository(
  referenceInput: string,
  client: GitHubClient,
  options: IngestRepositoryOptions = {},
): Promise<IngestionResult> {
  const limits = mergeLimits(options.limits);
  return withIngestionTimeout(
    (signal) => ingestRepositoryInternal(referenceInput, client, options, signal),
    limits.ingestionTimeoutMs,
  );
}

export { decodeBase64Text };
