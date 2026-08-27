import { GitHubIngestionError } from './errors.js';
import type {
  GitHubBlobResponse,
  GitHubClient,
  GitHubRepository,
  GitHubTreeEntry,
  GitHubTreeResponse,
  IngestionLimits,
} from './types.js';
import { DEFAULT_INGESTION_LIMITS } from './policy.js';

const API_HOST = 'api.github.com';
const API_ORIGIN = `https://${API_HOST}`;
const API_VERSION = '2022-11-28';

type FetchFunction = typeof fetch;

export interface GitHubRestClientOptions {
  readonly token?: string;
  readonly fetch?: FetchFunction;
  readonly limits?: Partial<IngestionLimits>;
  readonly maxRateLimitRetries?: number;
  readonly maxRedirects?: number;
  readonly allowedRedirectHosts?: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRevisionSha(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[A-Fa-f0-9]{40}|[A-Fa-f0-9]{64})$/.test(value);
}

function isAbortError(value: unknown): boolean {
  return isRecord(value) && value['name'] === 'AbortError';
}

function encodePathPart(value: string): string {
  return encodeURIComponent(value);
}

function getErrorMessage(payload: unknown): string | undefined {
  if (!isRecord(payload) || typeof payload['message'] !== 'string') {
    return undefined;
  }
  return payload['message'];
}

async function readBoundedBody(
  response: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<string> {
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      throw new GitHubIngestionError(
        'invalid_response',
        'GitHub response exceeds the configured limit',
      );
    }
  }

  if (response.body === null) {
    return '';
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const cancelOnAbort = (): void => {
    void reader.cancel();
  };
  signal.addEventListener('abort', cancelOnAbort, { once: true });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value === undefined) {
        continue;
      }
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new GitHubIngestionError(
          'invalid_response',
          'GitHub response exceeds the configured limit',
        );
      }
      chunks.push(value);
    }
  } finally {
    signal.removeEventListener('abort', cancelOnAbort);
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function parseJson(body: string): unknown {
  if (body.length === 0) {
    return null;
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new GitHubIngestionError('invalid_response', 'GitHub returned malformed JSON');
  }
}

function validateRepository(payload: unknown): GitHubRepository {
  if (
    !isRecord(payload) ||
    !isRecord(payload['owner']) ||
    !isString(payload['owner']['login']) ||
    !isString(payload['name']) ||
    !isString(payload['html_url']) ||
    !isString(payload['default_branch']) ||
    typeof payload['private'] !== 'boolean' ||
    !isFiniteNumber(payload['size']) ||
    !Number.isInteger(payload['size']) ||
    payload['size'] < 0
  ) {
    throw new GitHubIngestionError('invalid_response', 'GitHub repository response is invalid');
  }

  return Object.freeze({
    defaultBranch: payload['default_branch'],
    htmlUrl: payload['html_url'],
    isPrivate: payload['private'],
    name: payload['name'],
    owner: payload['owner']['login'],
    sizeKb: payload['size'],
  });
}

function validateRefResponse(payload: unknown): string {
  if (!isRecord(payload) || !isRevisionSha(payload['sha'])) {
    throw new GitHubIngestionError('invalid_response', 'GitHub ref response is invalid');
  }
  return payload['sha'].toLowerCase();
}

function validateTreeResponse(payload: unknown): GitHubTreeResponse {
  if (
    !isRecord(payload) ||
    !isRevisionSha(payload['sha']) ||
    typeof payload['truncated'] !== 'boolean' ||
    !Array.isArray(payload['tree'])
  ) {
    throw new GitHubIngestionError('invalid_response', 'GitHub tree response is invalid');
  }

  const entries: GitHubTreeEntry[] = [];
  for (const item of payload['tree']) {
    if (
      !isRecord(item) ||
      !isString(item['path']) ||
      !isString(item['mode']) ||
      !isString(item['type']) ||
      !isRevisionSha(item['sha']) ||
      ('size' in item &&
        (!isFiniteNumber(item['size']) || !Number.isInteger(item['size']) || item['size'] < 0))
    ) {
      throw new GitHubIngestionError('invalid_response', 'GitHub tree entry is invalid');
    }
    const entry: GitHubTreeEntry = {
      mode: item['mode'],
      path: item['path'],
      sha: item['sha'],
      type: item['type'],
      ...(isFiniteNumber(item['size']) && Number.isInteger(item['size']) && item['size'] >= 0
        ? { size: item['size'] }
        : {}),
      ...(isString(item['url']) ? { url: item['url'] } : {}),
    };
    entries.push(Object.freeze(entry));
  }

  return Object.freeze({
    entries: Object.freeze(entries),
    sha: payload['sha'].toLowerCase(),
    truncated: payload['truncated'],
  });
}

function validateBlobResponse(payload: unknown): GitHubBlobResponse {
  if (
    !isRecord(payload) ||
    !isRevisionSha(payload['sha']) ||
    !isFiniteNumber(payload['size']) ||
    !Number.isInteger(payload['size']) ||
    payload['size'] < 0 ||
    !isString(payload['encoding']) ||
    typeof payload['content'] !== 'string'
  ) {
    throw new GitHubIngestionError('invalid_response', 'GitHub blob response is invalid');
  }

  return Object.freeze({
    content: payload['content'],
    encoding: payload['encoding'].toLowerCase(),
    sha: payload['sha'].toLowerCase(),
    size: payload['size'],
  });
}

function classifyHttpError(
  status: number,
  operation: 'repository' | 'ref' | 'tree' | 'blob',
  headers: Headers,
  payload: unknown,
): GitHubIngestionError {
  if (status >= 300 && status < 400) {
    return new GitHubIngestionError('security_rejected', 'GitHub API redirects are not allowed', {
      statusCode: status,
    });
  }
  if (status === 401 || status === 403 || status === 429) {
    const remaining = headers.get('x-ratelimit-remaining');
    if (status === 429 || remaining === '0') {
      const retryAfterHeader = headers.get('retry-after');
      const retryAfterSeconds = retryAfterHeader === null ? undefined : Number(retryAfterHeader);
      const options = {
        statusCode: status,
        ...(retryAfterSeconds !== undefined && Number.isFinite(retryAfterSeconds)
          ? { retryAfterSeconds }
          : {}),
      };
      return new GitHubIngestionError('rate_limited', 'GitHub API rate limit reached', options);
    }
  }
  if (status === 404) {
    return new GitHubIngestionError(
      operation === 'repository'
        ? 'repository_not_found'
        : operation === 'ref'
          ? 'invalid_ref'
          : operation === 'tree'
            ? 'tree_unavailable'
            : 'file_unavailable',
      'GitHub resource was not found',
      { statusCode: status },
    );
  }
  if (status >= 500) {
    return new GitHubIngestionError('github_unavailable', 'GitHub API is unavailable', {
      statusCode: status,
    });
  }

  const detail = getErrorMessage(payload);
  return new GitHubIngestionError(
    operation === 'repository'
      ? 'repository_not_found'
      : operation === 'ref'
        ? 'commit_resolution_failed'
        : operation === 'tree'
          ? 'tree_unavailable'
          : 'file_unavailable',
    detail === undefined ? 'GitHub API request failed' : 'GitHub API request was rejected',
    { statusCode: status },
  );
}

export class GitHubRestClient implements GitHubClient {
  private readonly fetchFunction: FetchFunction;
  private readonly token: string | undefined;
  private readonly limits: IngestionLimits;
  private readonly maxRateLimitRetries: number;
  private readonly maxRedirects: number;
  private readonly allowedRedirectHosts: readonly string[];
  private requestCount = 0;

  constructor(options: GitHubRestClientOptions = {}) {
    this.fetchFunction = options.fetch ?? fetch;
    this.token =
      options.token === undefined || options.token.trim().length === 0 ? undefined : options.token;
    this.limits = Object.freeze({ ...DEFAULT_INGESTION_LIMITS, ...options.limits });
    for (const [key, value] of Object.entries(this.limits)) {
      if (!Number.isInteger(value) || value <= 0) {
        throw new GitHubIngestionError(
          'ingestion_limit_reached',
          `${key} must be a positive integer`,
        );
      }
    }
    const maxRateLimitRetries = options.maxRateLimitRetries ?? 0;
    if (
      !Number.isInteger(maxRateLimitRetries) ||
      maxRateLimitRetries < 0 ||
      maxRateLimitRetries > 1
    ) {
      throw new GitHubIngestionError(
        'ingestion_limit_reached',
        'maxRateLimitRetries must be 0 or 1',
      );
    }
    this.maxRateLimitRetries = maxRateLimitRetries;
    const maxRedirects = options.maxRedirects ?? 3;
    if (!Number.isInteger(maxRedirects) || maxRedirects < 0) {
      throw new GitHubIngestionError(
        'ingestion_limit_reached',
        'maxRedirects must be a non-negative integer',
      );
    }
    this.maxRedirects = maxRedirects;
    const allowedRedirectHosts = options.allowedRedirectHosts ?? [API_HOST];
    if (
      allowedRedirectHosts.length === 0 ||
      allowedRedirectHosts.some((host) => typeof host !== 'string' || host.trim().length === 0)
    ) {
      throw new GitHubIngestionError(
        'ingestion_limit_reached',
        'allowedRedirectHosts must contain at least one hostname',
      );
    }
    this.allowedRedirectHosts = Object.freeze(
      [...allowedRedirectHosts].map((host) => host.toLowerCase()),
    );
  }

  get requestsMade(): number {
    return this.requestCount;
  }

  async getRepository(
    owner: string,
    repository: string,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<GitHubRepository> {
    const { payload, redirected } = await this.request(
      `/repos/${encodePathPart(owner)}/${encodePathPart(repository)}`,
      'repository',
      options.signal,
    );
    const result = validateRepository(payload);
    // GitHub canonical redirects (for renamed repositories) can change the
    // owner alias. When a safe canonical redirect was followed, the returned
    // identity is authoritative; otherwise the response must match the request.
    if (
      !redirected &&
      (result.owner.toLowerCase() !== owner.toLowerCase() ||
        result.name.toLowerCase() !== repository.toLowerCase() ||
        result.htmlUrl.toLowerCase() !==
          `https://github.com/${owner.toLowerCase()}/${repository.toLowerCase()}`)
    ) {
      throw new GitHubIngestionError(
        'invalid_response',
        'GitHub repository response does not match the request',
      );
    }
    if (result.isPrivate) {
      throw new GitHubIngestionError(
        'repository_not_public',
        'Only public GitHub repositories are supported',
      );
    }
    return result;
  }

  async resolveRef(
    owner: string,
    repository: string,
    ref: string,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<string> {
    const { payload } = await this.request(
      `/repos/${encodePathPart(owner)}/${encodePathPart(repository)}/commits/${encodePathPart(ref)}`,
      'ref',
      options.signal,
    );
    return validateRefResponse(payload);
  }

  async resolveTree(
    owner: string,
    repository: string,
    commitSha: string,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<string> {
    const { payload } = await this.request(
      `/repos/${encodePathPart(owner)}/${encodePathPart(repository)}/git/commits/${encodePathPart(commitSha)}`,
      'ref',
      options.signal,
    );
    if (
      !isRecord(payload) ||
      !isRecord(payload['tree']) ||
      !isRevisionSha(payload['tree']['sha'])
    ) {
      throw new GitHubIngestionError('invalid_response', 'GitHub commit response is invalid');
    }
    return payload['tree']['sha'].toLowerCase();
  }

  async getTree(
    owner: string,
    repository: string,
    treeSha: string,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<GitHubTreeResponse> {
    const { payload } = await this.request(
      `/repos/${encodePathPart(owner)}/${encodePathPart(repository)}/git/trees/${encodePathPart(treeSha)}`,
      'tree',
      options.signal,
    );
    return validateTreeResponse(payload);
  }

  async getBlob(
    owner: string,
    repository: string,
    blobSha: string,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<GitHubBlobResponse> {
    const { payload } = await this.request(
      `/repos/${encodePathPart(owner)}/${encodePathPart(repository)}/git/blobs/${encodePathPart(blobSha)}`,
      'blob',
      options.signal,
    );
    return validateBlobResponse(payload);
  }

  private async request(
    path: string,
    operation: 'repository' | 'ref' | 'tree' | 'blob',
    externalSignal?: AbortSignal,
  ): Promise<{ readonly payload: unknown; readonly redirected: boolean }> {
    let currentUrl = new URL(path, API_ORIGIN);
    if (
      currentUrl.protocol !== 'https:' ||
      currentUrl.hostname !== API_HOST ||
      currentUrl.port !== ''
    ) {
      throw new GitHubIngestionError('security_rejected', 'GitHub API target is not allowed');
    }

    let attempt = 0;
    let redirectCount = 0;
    let redirected = false;
    while (true) {
      if (externalSignal?.aborted) {
        throw new GitHubIngestionError('request_timeout', 'GitHub API request timed out');
      }
      if (this.requestCount >= this.limits.maxApiRequests) {
        throw new GitHubIngestionError(
          'ingestion_limit_reached',
          'GitHub API request limit reached',
        );
      }
      this.requestCount += 1;
      const controller = new AbortController();
      const abortFromExternal = (): void => controller.abort();
      externalSignal?.addEventListener('abort', abortFromExternal, { once: true });
      const timeoutId = setTimeout(() => controller.abort(), this.limits.requestTimeoutMs);
      let response: Response;
      try {
        response = await this.fetchFunction(currentUrl, {
          headers: {
            Accept: 'application/vnd.github+json',
            ...(this.token === undefined ? {} : { Authorization: `Bearer ${this.token}` }),
            'X-GitHub-Api-Version': API_VERSION,
          },
          redirect: 'manual',
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(timeoutId);
        externalSignal?.removeEventListener('abort', abortFromExternal);
        if (controller.signal.aborted || isAbortError(error)) {
          throw new GitHubIngestionError('request_timeout', 'GitHub API request timed out');
        }
        throw new GitHubIngestionError('github_unavailable', 'GitHub API request failed');
      }

      let body: string;
      try {
        body = await readBoundedBody(response, this.limits.maxJsonResponseBytes, controller.signal);
      } catch (error) {
        if (error instanceof GitHubIngestionError) {
          throw error;
        }
        if (controller.signal.aborted || isAbortError(error)) {
          throw new GitHubIngestionError('request_timeout', 'GitHub API request timed out');
        }
        throw new GitHubIngestionError('invalid_response', 'GitHub response could not be decoded');
      } finally {
        clearTimeout(timeoutId);
        externalSignal?.removeEventListener('abort', abortFromExternal);
      }
      const payload = parseJson(body);

      if (response.ok) {
        return { payload, redirected };
      }

      if (response.status >= 300 && response.status < 400) {
        if (redirectCount >= this.maxRedirects) {
          throw new GitHubIngestionError(
            'security_rejected',
            'GitHub API redirect limit exceeded',
            { statusCode: response.status },
          );
        }
        const location = response.headers.get('location');
        if (location === null || location.length === 0) {
          throw new GitHubIngestionError(
            'security_rejected',
            'GitHub API redirect is missing a location header',
            { statusCode: response.status },
          );
        }
        let nextUrl: URL;
        try {
          nextUrl = new URL(location, currentUrl);
        } catch {
          throw new GitHubIngestionError(
            'security_rejected',
            'GitHub API redirect target is invalid',
            { statusCode: response.status },
          );
        }
        if (
          nextUrl.protocol !== 'https:' ||
          !this.allowedRedirectHosts.includes(nextUrl.hostname.toLowerCase()) ||
          nextUrl.port !== ''
        ) {
          throw new GitHubIngestionError(
            'security_rejected',
            'GitHub API redirect target is not allowed',
            { statusCode: response.status },
          );
        }
        currentUrl = nextUrl;
        redirectCount += 1;
        redirected = true;
        continue;
      }

      const classified = classifyHttpError(response.status, operation, response.headers, payload);
      if (
        classified.category === 'rate_limited' &&
        attempt < this.maxRateLimitRetries &&
        (classified.retryAfterSeconds === undefined || classified.retryAfterSeconds <= 1)
      ) {
        attempt += 1;
        const delayMs =
          classified.retryAfterSeconds === undefined
            ? 100
            : Math.max(0, Math.round(classified.retryAfterSeconds * 1_000));
        await new Promise<void>((resolve, reject) => {
          const rejectOnAbort = (): void => {
            clearTimeout(retryTimeoutId);
            reject(new GitHubIngestionError('request_timeout', 'GitHub API request timed out'));
          };
          const resolveOnTimeout = (): void => {
            externalSignal?.removeEventListener('abort', rejectOnAbort);
            resolve();
          };
          const retryTimeoutId = setTimeout(resolveOnTimeout, delayMs);
          externalSignal?.addEventListener('abort', rejectOnAbort, { once: true });
          if (externalSignal?.aborted) {
            rejectOnAbort();
          }
        });
        continue;
      }
      throw classified;
    }
  }
}
