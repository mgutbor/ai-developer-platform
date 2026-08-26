import { GitHubIngestionError } from './errors.js';

export interface RepositoryReference {
  readonly owner: string;
  readonly repository: string;
  readonly ref?: string;
  readonly canonicalUrl: string;
}

function reject(message: string): never {
  throw new GitHubIngestionError('invalid_repository', message);
}

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127;
  });
}

function decodePathPart(value: string, field: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    reject(`repository ${field} is not valid URL encoding`);
  }
  if (
    decoded.length === 0 ||
    decoded !== decoded.trim() ||
    decoded.includes('\0') ||
    containsControlCharacter(decoded) ||
    decoded === '.' ||
    decoded === '..'
  ) {
    reject(`repository ${field} is invalid`);
  }
  return decoded;
}

function normalizeRepositoryPart(value: string, field: string, allowGitSuffix = false): string {
  const decoded = decodePathPart(value, field);
  const normalized = allowGitSuffix ? decoded.replace(/\.git$/i, '') : decoded;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(normalized)) {
    reject(`repository ${field} contains unsupported characters`);
  }
  return normalized.toLowerCase();
}

export function validateRef(value: string): string {
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) {
    reject('repository ref must be a non-empty trimmed string');
  }
  if (
    value.includes('\0') ||
    containsControlCharacter(value) ||
    value.startsWith('/') ||
    value.endsWith('/') ||
    value.includes('//') ||
    value.includes('..') ||
    value.includes('\\') ||
    value.includes('?') ||
    value.includes('#') ||
    value.includes('%') ||
    value.includes('~') ||
    value.includes('^') ||
    value.includes(':') ||
    value.includes('*') ||
    value.includes('[') ||
    value.includes('\\\\') ||
    value.includes('@{') ||
    value.includes(' ') ||
    value.endsWith('.') ||
    value.endsWith('.lock')
  ) {
    reject('repository ref contains unsupported characters');
  }
  return value;
}

export function parseRepositoryReference(input: string, explicitRef?: string): RepositoryReference {
  if (typeof input !== 'string' || input.trim() !== input || input.length === 0) {
    reject('repository URL must be a non-empty trimmed string');
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    reject('repository URL is invalid');
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 'github.com' ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    reject('only canonical public HTTPS GitHub URLs are supported');
  }

  const rawPath = url.pathname;
  if (rawPath.includes('//')) {
    reject('repository URL contains repeated path separators');
  }
  const parts = rawPath.replace(/^\//, '').replace(/\/+$/, '').split('/');
  if (parts.length !== 2 && parts.length < 4) {
    reject('repository URL must contain owner/repository or owner/repository/tree/ref');
  }
  if (parts.length !== 2 && parts[2] !== 'tree') {
    reject('only the GitHub tree ref URL form is supported');
  }
  if (parts.length !== 2 && parts.length === 4 && parts[3] === '') {
    reject('repository ref is empty');
  }

  const owner = normalizeRepositoryPart(parts[0] ?? '', 'owner');
  const repository = normalizeRepositoryPart(parts[1] ?? '', 'repository', true);
  const urlRef =
    parts.length === 2
      ? undefined
      : validateRef(
          parts
            .slice(3)
            .map((part) => decodePathPart(part, 'ref'))
            .join('/'),
        );
  const normalizedExplicitRef = explicitRef === undefined ? undefined : validateRef(explicitRef);

  if (
    urlRef !== undefined &&
    normalizedExplicitRef !== undefined &&
    urlRef !== normalizedExplicitRef
  ) {
    reject('URL ref and explicit ref do not match');
  }

  const resolvedRef = normalizedExplicitRef ?? urlRef;
  return {
    canonicalUrl: `https://github.com/${owner}/${repository}`,
    owner,
    repository,
    ...(resolvedRef === undefined ? {} : { ref: resolvedRef }),
  };
}
