import { createRepositorySnapshot } from '@ai-developer-platform/domain';
import { GitHubIngestionError } from './errors.js';
import { parseRepositoryReference } from './reference.js';
import {
  DEFAULT_FILE_SELECTION_POLICY,
  DEFAULT_INGESTION_LIMITS,
  DEFAULT_SELECTION_TIER_CAPS,
  isSelectableFile,
  normalizeSelectedPath,
  selectionPriority,
  type FileSelectionPriority,
} from './policy.js';
import type {
  FileSelectionPolicy,
  GitHubBlobResponse,
  GitHubClient,
  GitHubTreeEntry,
  GitHubTreeResponse,
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

/**
 * Conservative lower bound on the smallest possible selectable path inside a
 * pending subtree. Every entry inside the subtree has a path whose separator
 * at position `path.length` is `/`, while any already-accumulated file path is
 * either outside the subtree or (for a file sharing the subtree prefix) has a
 * different character there. Under the project's `localeCompare`-based ordering
 * this makes `path + "/"` compare to any such file exactly like the smallest
 * possible entry inside the subtree, so it is a sound bound for proving that a
 * subtree cannot displace a selected entry.
 */
function subtreeBound(path: string): string {
  return `${path}/`;
}

function hasSegment(path: string, pattern: RegExp): boolean {
  return path.split('/').some((segment) => pattern.test(segment));
}

const TEST_DIRECTORY_SEGMENT = /^(?:test|tests|__tests__)$/i;
const NON_SOURCE_DIRECTORY_SEGMENT =
  /^(?:examples?|fixtures?|demos?|samples?|docs?|documentation)$/i;

/**
 * The smallest priority tier any selectable entry inside a pending subtree
 * could belong to. Root metadata (tier 1) is impossible because tier 1 is
 * restricted to root-level files. CI workflows (tier 2) can only appear under
 * `.github`. Test and documentation directory segments force every entry below
 * the source tier.
 */
function minimumPossibleTier(path: string): FileSelectionPriority {
  if (path === '.github' || path.startsWith('.github/')) {
    return 2;
  }
  if (hasSegment(path, TEST_DIRECTORY_SEGMENT) || hasSegment(path, NON_SOURCE_DIRECTORY_SEGMENT)) {
    return 4;
  }
  return 3;
}

/**
 * Whether a pending subtree could contain a selectable entry of the given
 * tier. Tier 1 requires root-level files, so it is never possible inside a
 * subtree. Tier 2 only exists under `.github/workflows`. Tier 3 (source) is
 * impossible when a test or documentation segment forces every entry into a
 * lower tier. Tiers 4 and 5 are always possible because test files and
 * selectable non-source files (for example `.json`) can appear anywhere.
 */
function tierPossibleInsideSubtree(path: string, tier: FileSelectionPriority): boolean {
  if (tier === 1) {
    return false;
  }
  if (tier === 2) {
    return path === '.github' || path.startsWith('.github/workflows');
  }
  if (hasSegment(path, TEST_DIRECTORY_SEGMENT)) {
    return false;
  }
  if (tier === 3 && hasSegment(path, NON_SOURCE_DIRECTORY_SEGMENT)) {
    return false;
  }
  return true;
}

function isExcludedSubtreePath(path: string, policy: FileSelectionPolicy): boolean {
  return path
    .split('/')
    .some((segment) => policy.excludedDirectories.includes(segment.toLowerCase()));
}

/**
 * Decides whether the pending queue can be abandoned without changing the
 * observable file selection. The observable selection is the first
 * `maxFileCount` entries of the existing `selectEntries()` result (the entries
 * that blob acquisition would fetch). A pending subtree can only change that
 * window if it could contribute an entry of a tier that is already present in
 * the window and whose smallest possible path sorts before the window's worst
 * path of that tier, or if it could contribute an entry of a tier below one
 * already present in the window (it would displace a higher-tier entry).
 *
 * The check is intentionally conservative: whenever a bound cannot be
 * established, traversal continues.
 */
function canTerminateTraversalSafely(
  entries: readonly GitHubTreeEntry[],
  pending: readonly { readonly path: string; readonly treeSha: string }[],
  limits: IngestionLimits,
  policy: FileSelectionPolicy,
): boolean {
  if (pending.length === 0) {
    return true;
  }
  const selected = selectEntries(entries, limits, policy, []);
  const windowSize = Math.min(limits.maxFileCount, limits.maxTreeEntries);
  if (selected.length < windowSize) {
    return false;
  }
  const windowCount = new Map<FileSelectionPriority, number>();
  const windowWorst = new Map<FileSelectionPriority, string>();
  for (let index = 0; index < windowSize; index += 1) {
    const entry = selected[index]!;
    const tier = selectionPriority(entry.path);
    windowCount.set(tier, (windowCount.get(tier) ?? 0) + 1);
    windowWorst.set(tier, entry.path);
  }
  for (const subtree of pending) {
    const minTier = minimumPossibleTier(subtree.path);
    for (let tier = minTier as number; tier <= 5; tier += 1) {
      const priority = tier as FileSelectionPriority;
      if (!tierPossibleInsideSubtree(subtree.path, priority)) {
        continue;
      }
      let hasHigherTierInWindow = false;
      for (let higher = tier + 1; higher <= 5; higher += 1) {
        if ((windowCount.get(higher as FileSelectionPriority) ?? 0) > 0) {
          hasHigherTierInWindow = true;
          break;
        }
      }
      if (hasHigherTierInWindow) {
        return false;
      }
      const worst = windowWorst.get(priority);
      if (worst === undefined) {
        continue;
      }
      if (subtreeBound(subtree.path).localeCompare(worst) < 0) {
        return false;
      }
    }
  }
  return true;
}

function selectEntries(
  entries: readonly GitHubTreeEntry[],
  limits: IngestionLimits,
  policy: FileSelectionPolicy,
  limitations: string[],
): GitHubTreeEntry[] {
  const selectable: GitHubTreeEntry[] = [];
  for (const entry of entries) {
    try {
      if (isSelectableFile(entry, policy)) {
        selectable.push(entry);
      }
    } catch (error) {
      if (error instanceof GitHubIngestionError && error.category === 'security_rejected') {
        addLimitation(limitations, `unsafe_path_excluded:${entry.path}`);
        continue;
      }
      throw error;
    }
  }
  selectable.sort(
    (left, right) =>
      selectionPriority(left.path) - selectionPriority(right.path) ||
      left.path.localeCompare(right.path),
  );
  // Per-tier caps keep CI-heavy or example-heavy repositories from consuming
  // the whole bounded budget before source and test files are considered.
  const capped: GitHubTreeEntry[] = [];
  const tierCounts = new Map<FileSelectionPriority, number>();
  for (const entry of selectable) {
    const tier = selectionPriority(entry.path);
    const used = tierCounts.get(tier) ?? 0;
    if (used >= DEFAULT_SELECTION_TIER_CAPS[tier]) {
      continue;
    }
    tierCounts.set(tier, used + 1);
    capped.push(entry);
  }
  if (capped.length > limits.maxTreeEntries) {
    addLimitation(limitations, 'tree_entry_limit_reached');
  }
  return capped.slice(0, limits.maxTreeEntries);
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

async function acquireTree(
  owner: string,
  name: string,
  commitSha: string,
  client: GitHubClient,
  limits: IngestionLimits,
  policy: FileSelectionPolicy,
  request: <T>(operation: () => Promise<T>) => Promise<T>,
  signal: AbortSignal,
  limitations: string[],
): Promise<GitHubTreeResponse> {
  if (client.resolveTree === undefined) {
    throw new GitHubIngestionError('invalid_response', 'GitHub tree resolution is unavailable');
  }
  const rootTreeSha = await request(() => client.resolveTree!(owner, name, commitSha, { signal }));
  addLimitation(limitations, 'tree_segmented_acquisition');
  const entries: GitHubTreeEntry[] = [];
  const pending: { readonly path: string; readonly treeSha: string }[] = [
    { path: '', treeSha: rootTreeSha },
  ];
  const visited = new Set<string>();
  let truncated = false;
  let earlyTerminated = false;
  while (pending.length > 0 && entries.length < limits.maxTreeEntries) {
    const current = pending.shift();
    if (current === undefined || visited.has(current.treeSha)) continue;
    visited.add(current.treeSha);
    const subtree = await request(() => client.getTree(owner, name, current.treeSha, { signal }));
    truncated ||= subtree.truncated;
    for (const entry of subtree.entries) {
      const path = current.path === '' ? entry.path : `${current.path}/${entry.path}`;
      if (entry.type === 'blob') {
        try {
          if (isSelectableFile({ ...entry, path }, policy))
            entries.push(Object.freeze({ ...entry, path }));
        } catch (error) {
          if (error instanceof GitHubIngestionError && error.category === 'security_rejected') {
            addLimitation(limitations, `unsafe_path_excluded:${path}`);
            continue;
          }
          throw error;
        }
      } else if (entry.type === 'tree') {
        // Subtrees inside excluded directories can never contain selectable
        // files, so skipping them is semantics-preserving and avoids wasted
        // requests on node_modules/dist/vendor style directories.
        if (!isExcludedSubtreePath(path, policy)) {
          pending.push({ path, treeSha: entry.sha });
        }
      }
    }
    pending.sort((left, right) => left.path.localeCompare(right.path));
    // Never stop early on truncated data: a truncated response is incomplete,
    // so the bounded snapshot must be produced by the existing limits instead.
    if (
      !truncated &&
      pending.length > 0 &&
      canTerminateTraversalSafely(entries, pending, limits, policy)
    ) {
      earlyTerminated = true;
      break;
    }
  }
  if (earlyTerminated) {
    truncated = true;
    addLimitation(limitations, 'tree_segmented_early_termination');
  } else if (pending.length > 0 || entries.length >= limits.maxTreeEntries) {
    truncated = true;
    addLimitation(limitations, 'tree_entry_limit_reached');
  }
  return Object.freeze({ entries: Object.freeze(entries), sha: rootTreeSha, truncated });
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
  // After a safe canonical redirect the returned identity is authoritative
  // (e.g. facebook/react is canonicalized to react/react).
  const owner = repository.owner;
  const name = repository.name;
  const ref = reference.ref ?? repository.defaultBranch;
  const commitSha = await request(() => client.resolveRef(owner, name, ref, { signal }));
  const limitations: string[] = [];
  const tree = await acquireTree(
    owner,
    name,
    commitSha,
    client,
    limits,
    policy,
    request,
    signal,
    limitations,
  );
  const snapshot = createRepositorySnapshot({
    owner,
    name,
    repositoryUrl: repository.htmlUrl,
    ref,
    commitSha,
  });
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
      blob = await request(() => client.getBlob(owner, name, entry.sha, { signal }));
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

export { decodeBase64Text, selectEntries };
