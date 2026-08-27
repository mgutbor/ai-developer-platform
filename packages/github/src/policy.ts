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

export type FileSelectionPriority = 1 | 2 | 3 | 4 | 5;

/**
 * Maximum number of files kept per priority tier before the global
 * `maxTreeEntries` cap is applied. The caps guarantee that CI-heavy or
 * example-heavy repositories cannot consume the whole selection budget,
 * leaving room for source and test files. Priority 3 (source) is unbounded.
 */
export const DEFAULT_SELECTION_TIER_CAPS: Readonly<Record<FileSelectionPriority, number>> =
  Object.freeze({
    1: 8,
    2: 2,
    3: Number.POSITIVE_INFINITY,
    4: 8,
    5: 2,
  });

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function isTestFilePath(path: string): boolean {
  const lower = path.toLowerCase();
  const name = basename(lower);
  return (
    /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)/.test(lower) ||
    /\.(?:spec|test)\.[cm]?(?:ts|tsx|js|jsx)$/.test(name)
  );
}

/**
 * Deterministic selection priority for bounded snapshots.
 *
 * 1 — root repository metadata (package.json, lockfiles, README, tsconfig,
 *     angular.json, vite/next config)
 * 2 — CI and tooling metadata (.github/workflows, eslint/prettier/jest/vitest
 *     config at the root)
 * 3 — source files
 * 4 — test files
 * 5 — documentation, examples, and any other selectable file
 *
 * Within the same priority, files are ordered by path so the selection is
 * stable across runs. The ingestion limits are never removed; this only
 * decides which bounded set of files is fetched first.
 */
export function selectionPriority(path: string): FileSelectionPriority {
  const segments = path.split('/');
  const baseName = segments.at(-1) ?? '';
  const lowerName = baseName.toLowerCase();
  const atRoot = segments.length === 1;

  if (
    atRoot &&
    (lowerName === 'package.json' ||
      /^(?:pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lock(?:b)?)$/i.test(lowerName) ||
      /^readme(?:\.|$)/i.test(lowerName) ||
      /^tsconfig(?:\.|$)/i.test(lowerName) ||
      lowerName === 'angular.json' ||
      /^vite\.config\./i.test(lowerName) ||
      /^next\.config\./i.test(lowerName))
  ) {
    return 1;
  }

  if (
    /^\.github\/workflows\/[^/]+\.(?:ya?ml)$/i.test(path) ||
    (atRoot &&
      (/^\.eslintrc/i.test(lowerName) ||
        /^eslint\.config\./i.test(lowerName) ||
        /^\.prettierrc/i.test(lowerName) ||
        lowerName === '.prettierignore' ||
        /^vitest\.config\./i.test(lowerName) ||
        /^jest\.config\./i.test(lowerName) ||
        /^playwright\.config\./i.test(lowerName) ||
        lowerName === 'biome.json'))
  ) {
    return 2;
  }

  if (isTestFilePath(path)) {
    return 4;
  }
  if (/(?:^|\/)(?:examples?|fixtures?|demos?|samples?|docs?|documentation)(?:\/|$)/i.test(path)) {
    return 5;
  }
  if (/\.(?:[cm]?[jt]sx?)$/i.test(baseName)) {
    return 3;
  }
  return 5;
}

export const DEFAULT_FILE_SELECTION_POLICY: FileSelectionPolicy = Object.freeze({
  allowedExtensions: Object.freeze(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json']),
  metadataFileNames: Object.freeze([
    'package.json',
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'bun.lock',
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
  if (/^\.github\/workflows\/[^/]+\.(?:ya?ml)$/i.test(path)) {
    return true;
  }
  if (/^(?:README|CHANGELOG)(?:\.|$)/i.test(baseName)) {
    return true;
  }
  return policy.allowedExtensions.some((extension) => path.toLowerCase().endsWith(extension));
}
