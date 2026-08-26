import type { AnalyzerFile, FileClassification } from './types.js';
import type { ClassifiedFile } from './types.js';

const SOURCE_EXTENSIONS = new Map<string, 'typescript' | 'javascript'>([
  ['.ts', 'typescript'],
  ['.tsx', 'typescript'],
  ['.mts', 'typescript'],
  ['.cts', 'typescript'],
  ['.js', 'javascript'],
  ['.jsx', 'javascript'],
  ['.mjs', 'javascript'],
  ['.cjs', 'javascript'],
]);

const CONFIG_FILE_PATTERNS = [
  /^\.eslintrc(?:\..+)?$/i,
  /^\.prettierrc(?:\..+)?$/i,
  /^biome\.json$/i,
  /^eslint\.config\..+$/i,
  /^prettier\.config\..+$/i,
  /^stylelint\.config\..+$/i,
  /^tsconfig(?:\..+)?\.json$/i,
  /^angular\.json$/i,
  /^(?:vite|vitest|jest|karma|playwright|cypress)\.config\..+$/i,
];

const DOCUMENTATION_FILE_PATTERNS = [
  /^readme(?:\..+)?$/i,
  /^contributing(?:\..+)?$/i,
  /^change(?:log|s)(?:\..+)?$/i,
  /^license(?:\..+)?$/i,
];

const GENERATED_FILE_PATTERNS = [
  /\.min\.(?:js|css)$/i,
  /\.map$/i,
  /(?:^|[._-])generated(?:[._-]|$)/i,
  /(?:^|[._-])compiled(?:[._-]|$)/i,
];

const DEPENDENCY_METADATA_NAMES = new Set([
  'bun.lock',
  'bun.lockb',
  'package-lock.json',
  'package.json',
  'pnpm-lock.yaml',
  'yarn.lock',
]);

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function extension(path: string): string {
  const name = basename(path).toLowerCase();
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot);
}

function isTestPath(path: string): boolean {
  const lower = path.toLowerCase();
  const name = basename(lower);
  return (
    /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)/.test(lower) ||
    /\.(?:spec|test)\.[cm]?(?:ts|tsx|js|jsx)$/.test(name)
  );
}

function isCiPath(path: string): boolean {
  return /^\.github\/workflows\/[^/]+\.(?:ya?ml)$/i.test(path);
}

function isConfigPath(path: string): boolean {
  const name = basename(path);
  return CONFIG_FILE_PATTERNS.some((pattern) => pattern.test(name));
}

function isDocumentationPath(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    lower.startsWith('docs/') ||
    DOCUMENTATION_FILE_PATTERNS.some((pattern) => pattern.test(basename(path)))
  );
}

function isGeneratedPath(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    lower.split('/').some((part) => ['build', 'coverage', 'dist', 'generated'].includes(part)) ||
    GENERATED_FILE_PATTERNS.some((pattern) => pattern.test(basename(path)))
  );
}

export function classifyFile(file: AnalyzerFile): ClassifiedFile {
  const normalizedPath = file.path.replaceAll('\\', '/');
  const fileWithoutPath = { ...file, path: normalizedPath };
  const name = basename(normalizedPath);
  const lowerName = name.toLowerCase();
  const sourceLanguage = SOURCE_EXTENSIONS.get(extension(normalizedPath));

  let classification: FileClassification = 'unknown';
  if (isGeneratedPath(normalizedPath)) {
    classification = 'generated';
  } else if (isCiPath(normalizedPath)) {
    classification = 'ci';
  } else if (isTestPath(normalizedPath) && sourceLanguage !== undefined) {
    classification = 'test';
  } else if (DEPENDENCY_METADATA_NAMES.has(lowerName)) {
    classification = 'dependency_metadata';
  } else if (isConfigPath(normalizedPath)) {
    classification = 'config';
  } else if (isDocumentationPath(normalizedPath)) {
    classification = 'documentation';
  } else if (sourceLanguage !== undefined) {
    classification = 'source';
  }

  return Object.freeze({
    ...fileWithoutPath,
    classification,
    ...(sourceLanguage === undefined ? {} : { language: sourceLanguage }),
  });
}

export function classifyFiles(files: readonly AnalyzerFile[]): readonly ClassifiedFile[] {
  return Object.freeze(
    [...files]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((file) => classifyFile(file)),
  );
}

export function isTypeScriptFile(file: ClassifiedFile): boolean {
  return file.language === 'typescript';
}

export function isJavaScriptFile(file: ClassifiedFile): boolean {
  return file.language === 'javascript';
}

export function isSourceLikeFile(file: ClassifiedFile): boolean {
  return file.classification === 'source' || file.classification === 'test';
}

export function isKnownConfigFile(file: ClassifiedFile): boolean {
  return file.classification === 'config' || file.path.toLowerCase() === 'package.json';
}

export function isPotentialSecretPath(path: string): boolean {
  const name = basename(path);
  return (
    /^\.env(?:\.|$)/i.test(name) ||
    /(?:^|[._-])(?:credentials?|secrets?|private|token|npmrc|netrc)(?:[._-]|$)/i.test(name) ||
    /\.(?:pem|key|p12|pfx|der|crt|cer)$/i.test(name)
  );
}

export const ANALYZER_RULE_IDS = Object.freeze({
  architecture: 'AN-ARCH-001',
  codeQuality: 'AN-CQ-001',
  dependencies: 'AN-DEP-001',
  documentation: 'AN-DOC-001',
  security: 'AN-SEC-001',
  testing: 'AN-TEST-001',
  tooling: 'AN-TOOL-001',
});
