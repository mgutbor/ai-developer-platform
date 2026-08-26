import { GitHubIngestionError } from './errors.js';
import type { FileSelectionPolicy, GitHubTreeEntry, IngestionLimits } from './types.js';

export const DEFAULT_INGESTION_LIMITS: IngestionLimits = Object.freeze({
  maxFileCount: 50,
  maxFileBytes: 256 * 1024,
  maxTotalBytes: 2 * 1024 * 1024,
  maxTreeEntries: 5_000,
  maxApiRequests: 125,
  requestTimeoutMs: 10_000,
  ingestionTimeoutMs: 60_000,
  maxJsonResponseBytes: 4 * 1024 * 1024,
});

export const DEFAULT_FILE_SELECTION_POLICY: FileSelectionPolicy = Object.freeze({
  allowedExtensions: Object.freeze(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json']),
  metadataFileNames: Object.freeze([
    'package.json',
    'angular.json',
    'README',
    'CHANGELOG',
    'tsconfig.json',
    'vite.config.js',
    'vite.config.ts',
    'eslint.config.js',
    'eslint.config.mjs',
    '.eslintrc.json',
    '.prettierrc',
    'vitest.config.ts',
    'jest.config.js',
    'playwright.config.ts',
  ]),
  excludedDirectories: Object.freeze([
    '.git',
    '.cache',
    'build',
    'coverage',
    'dist',
    'node_modules',
    'vendor',
    'credentials',
    'secrets',
    '.aws',
    '.ssh',
  ]),
  excludedFilePatterns: Object.freeze([
    /\.min\.(?:js|css)$/i,
    /\.map$/i,
    /(?:^|[._-])(credentials?|secrets?|private|token)(?:[._-]|$)/i,
    /(?:^|[._-])(?:npmrc|netrc)(?:[._-]|$)/i,
    /^\.env(?:\.|$)/i,
    /\.(?:pem|key|p12|pfx|der|crt|cer|exe|dll|so|dylib|zip|tar|gz|png|jpe?g|gif|webp|ico|pdf|woff2?)$/i,
  ]),
});

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127;
  });
}

function normalizeRepositoryPath(path: string): string {
  if (
    typeof path !== 'string' ||
    path.length === 0 ||
    path.includes('\0') ||
    containsControlCharacter(path)
  ) {
    throw new GitHubIngestionError(
      'security_rejected',
      'repository path contains unsafe characters',
    );
  }
  const normalized = path.replaceAll('\\', '/');
  const segments = normalized.split('/');
  if (
    normalized.startsWith('/') ||
    segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..') ||
    /^[A-Za-z]:/.test(normalized)
  ) {
    throw new GitHubIngestionError(
      'security_rejected',
      'repository path must be normalized and relative',
    );
  }
  return normalized;
}

function hasBinaryExtension(path: string): boolean {
  return /\.(?:png|jpe?g|gif|webp|ico|pdf|zip|tar|gz|bz2|7z|woff2?|ttf|eot|mp3|mp4|mov|avi|wasm|exe|dll|so|dylib)$/i.test(
    path,
  );
}

export function normalizeSelectedPath(path: string): string {
  return normalizeRepositoryPath(path);
}

export function isSelectableFile(
  entry: GitHubTreeEntry,
  policy: FileSelectionPolicy = DEFAULT_FILE_SELECTION_POLICY,
): boolean {
  if (entry.type !== 'blob' || entry.mode === '120000' || entry.mode === '160000') {
    return false;
  }
  const path = normalizeRepositoryPath(entry.path);
  const segments = path.split('/');
  if (segments.some((segment) => policy.excludedDirectories.includes(segment.toLowerCase()))) {
    return false;
  }
  const baseName = segments.at(-1) ?? '';
  if (policy.excludedFilePatterns.some((pattern) => pattern.test(baseName))) {
    return false;
  }
  if (hasBinaryExtension(path)) {
    return false;
  }
  if (policy.metadataFileNames.some((name) => name.toLowerCase() === baseName.toLowerCase())) {
    return true;
  }
  if (/^(?:README|CHANGELOG)(?:\.|$)/i.test(baseName)) {
    return true;
  }
  return policy.allowedExtensions.some((extension) => path.toLowerCase().endsWith(extension));
}
