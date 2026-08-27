import {
  createAnalysisResult,
  createEvidence,
  createFact,
  createFinding,
  createMetric,
  createProvenance,
  createRecommendation,
  type AnalysisResult,
  type AnalysisDimension,
  type ConfidenceBand,
  type Coverage,
  type Evidence,
  type Fact,
  type FindingEvidenceStatus,
  type Metric,
  type Recommendation,
  type Finding,
  type ObservationStatus,
} from '@ai-developer-platform/domain';
import {
  ANALYZER_RULE_IDS,
  classifyFiles,
  isJavaScriptFile,
  isPotentialSecretPath,
  isSourceLikeFile,
  isTypeScriptFile,
} from './classification.js';
import type {
  AnalyzerFile,
  AnalyzerInput,
  AnalyzerLimits,
  AnalyzerOptions,
  ClassifiedFile,
  ImportReference,
} from './types.js';
import { DEFAULT_ANALYZER_OPTIONS } from './types.js';

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

const DEFAULTS: typeof DEFAULT_ANALYZER_OPTIONS = {
  analyzerVersion: '0.1.0',
  maxImportCount: 40,
  maxSourceFileLines: 400,
  maxTodoCount: 10,
  ruleSetVersion: '0.1.0',
};

const METRIC_RULE_ID = 'AN-METRIC-001';
const SIGNAL_RULE_ID = 'AN-SIGNAL-001';
const IMPORT_RULE_ID = 'AN-ARCH-002';
const SECURITY_RULE_ID = 'AN-SEC-002';
const TESTING_FRAMEWORKS = [
  'vitest',
  'jest',
  'jasmine',
  'karma',
  'mocha',
  'playwright',
  'cypress',
] as const;
const ACCESSIBILITY_MARKERS = [
  'axe',
  'eslint-plugin-jsx-a11y',
  '@angular/cdk',
  '@testing-library',
  'playwright',
] as const;

interface PackageManifest {
  readonly dependencies: readonly string[];
  readonly devDependencies: readonly string[];
  readonly peerDependencies: readonly string[];
  readonly optionalDependencies: readonly string[];
  readonly scripts: readonly string[];
  readonly packageManager?: string;
  readonly hasNodeEngine: boolean;
  readonly angular: boolean;
  readonly react: boolean;
  readonly nodeSignal: boolean;
}

interface ParsedConfig {
  readonly path: string;
  readonly value: Record<string, unknown>;
}

interface Signals {
  readonly files: readonly ClassifiedFile[];
  readonly sourceFiles: readonly ClassifiedFile[];
  readonly testFiles: readonly ClassifiedFile[];
  readonly documentationFiles: readonly ClassifiedFile[];
  readonly configFiles: readonly ClassifiedFile[];
  readonly ciFiles: readonly ClassifiedFile[];
  readonly typescriptFiles: readonly ClassifiedFile[];
  readonly javascriptFiles: readonly ClassifiedFile[];
  readonly generatedFiles: readonly ClassifiedFile[];
  readonly imports: readonly ImportReference[];
  readonly unresolvedRelativeImports: readonly ImportReference[];
  readonly packageJson: ClassifiedFile | undefined;
  readonly packageManifest: PackageManifest | undefined;
  readonly parsedConfigs: readonly ParsedConfig[];
  readonly malformedConfigPaths: readonly string[];
  readonly lockfilePaths: readonly string[];
  readonly todoCount: number;
  readonly tsIgnoreCount: number;
  readonly anyCount: number;
  readonly consoleCount: number;
  readonly deepestSourcePath: ClassifiedFile | undefined;
  readonly maxSourceLines: number;
  readonly securitySignals: readonly ClassifiedFile[];
  readonly potentialSecretFiles: readonly {
    readonly file: ClassifiedFile;
    readonly signal: SecretSignal;
  }[];
  readonly frameworkSignals: readonly string[];
  readonly testFrameworks: readonly string[];
  readonly tooling: readonly string[];
  readonly ciCapabilities: readonly string[];
  readonly accessibilityTooling: readonly string[];
  readonly securityTooling: readonly string[];
  readonly limitations: readonly string[];
}

interface FindingSpec {
  readonly key: string;
  readonly ruleId: string;
  readonly dimension: AnalysisDimension;
  readonly severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  readonly confidence?: 'low' | 'medium' | 'high' | undefined;
  readonly title: string;
  readonly description: string;
  readonly impact: string;
  readonly sourceId: string;
  readonly sourcePath?: string | undefined;
  readonly line?: number | undefined;
  readonly recommendationTitle: string;
  readonly recommendationDescription: string;
  readonly priority: 'low' | 'medium' | 'high';
  /**
   * Semantic nature of the finding's evidence. Defaults to `verified` when a
   * concrete source path was observed, otherwise the spec must declare it.
   */
  readonly evidenceStatus?: FindingEvidenceStatus | undefined;
}

interface AnalyzerContext {
  readonly snapshotId: string;
  readonly ruleSetVersion: string;
  readonly analyzerVersion: string;
  readonly signals: Signals;
  readonly facts: readonly Fact[];
  readonly metrics: readonly Metric[];
}

function mergeOptions(options: AnalyzerOptions | undefined): AnalyzerLimits & {
  readonly analyzerVersion: string;
  readonly ruleSetVersion: string;
} {
  const merged = { ...DEFAULTS, ...options };
  for (const key of ['maxSourceFileLines', 'maxTodoCount', 'maxImportCount'] as const) {
    if (!Number.isInteger(merged[key]) || merged[key] <= 0) {
      throw new TypeError(`${key} must be a positive integer`);
    }
  }
  if (merged.analyzerVersion.trim().length === 0 || merged.ruleSetVersion.trim().length === 0) {
    throw new TypeError('analyzerVersion and ruleSetVersion must be non-empty');
  }
  return Object.freeze(merged);
}

function isSafeAnalyzerPath(path: string): boolean {
  if (path.length === 0 || path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
    return false;
  }
  const normalized = path.replaceAll('\\', '/');
  return !normalized
    .split('/')
    .some((segment) => segment.length === 0 || segment === '.' || segment === '..');
}

function isValidAnalyzerFile(file: AnalyzerFile, snapshotId: string): boolean {
  return (
    file.snapshotId === snapshotId &&
    isSafeAnalyzerPath(file.path) &&
    Number.isInteger(file.size) &&
    file.size >= 0 &&
    typeof file.content === 'string' &&
    typeof file.sha === 'string' &&
    file.sha.length > 0
  );
}

function lineAt(content: string, index: number): number {
  let line = 1;
  for (let position = 0; position < index; position += 1) {
    if (content[position] === '\n') {
      line += 1;
    }
  }
  return line;
}

function columnAt(content: string, index: number): number {
  const previousBreak = content.lastIndexOf('\n', index - 1);
  return index - previousBreak;
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function jsonRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringKeys(value: unknown): readonly string[] {
  const record = jsonRecord(value);
  return record === undefined
    ? []
    : Object.keys(record).sort((left, right) => left.localeCompare(right));
}

function isJsonConfigFile(file: ClassifiedFile): boolean {
  const name = basename(file.path).toLowerCase();
  return name.endsWith('.json') || name === '.eslintrc' || name === '.prettierrc';
}

function parseJsonConfig(file: ClassifiedFile): ParsedConfig | undefined {
  if (!isJsonConfigFile(file)) {
    return undefined;
  }
  try {
    const value = jsonRecord(JSON.parse(file.content) as unknown);
    return value === undefined ? undefined : Object.freeze({ path: file.path, value });
  } catch {
    return undefined;
  }
}

function manifestFrom(file: ClassifiedFile): PackageManifest | undefined {
  try {
    const value = jsonRecord(JSON.parse(file.content) as unknown);
    if (value === undefined) {
      return undefined;
    }
    const dependencies = stringKeys(value['dependencies']);
    const devDependencies = stringKeys(value['devDependencies']);
    const peerDependencies = stringKeys(value['peerDependencies']);
    const optionalDependencies = stringKeys(value['optionalDependencies']);
    const allNames = new Set([
      ...dependencies,
      ...devDependencies,
      ...peerDependencies,
      ...optionalDependencies,
    ]);
    const packageManager =
      typeof value['packageManager'] === 'string' ? value['packageManager'] : undefined;
    const engines = jsonRecord(value['engines']);
    const hasNodeEngine = engines !== undefined && typeof engines['node'] === 'string';
    return Object.freeze({
      angular: allNames.has('@angular/core') || allNames.has('@angular/cli'),
      dependencies,
      devDependencies,
      hasNodeEngine,
      nodeSignal:
        hasNodeEngine ||
        allNames.has('@types/node') ||
        allNames.has('typescript') ||
        typeof value['name'] === 'string' ||
        stringKeys(value['scripts']).some((script) => /(?:^|:)node(?:\s|$)|node:/i.test(script)) ||
        Object.keys(value).length > 0,
      optionalDependencies,
      ...(packageManager === undefined ? {} : { packageManager }),
      peerDependencies,
      react: allNames.has('react') || allNames.has('react-dom'),
      scripts: stringKeys(value['scripts']),
    });
  } catch {
    return undefined;
  }
}

function hasAny(content: string, values: readonly string[]): boolean {
  const lower = content.toLowerCase();
  return values.some((value) => lower.includes(value.toLowerCase()));
}

function importsFrom(file: ClassifiedFile): readonly ImportReference[] {
  if (!isSourceLikeFile(file)) {
    return [];
  }
  const patterns: readonly RegExp[] = [
    /\bimport\s+(?:type\s+)?(?:[^'"\n]*?\sfrom\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+(?:[^'"\n]*?\sfrom\s+)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  const references: ImportReference[] = [];
  for (const pattern of patterns) {
    for (const match of file.content.matchAll(pattern)) {
      const path = match[1];
      const index = match.index;
      if (path === undefined || index === undefined) {
        continue;
      }
      references.push(
        Object.freeze({
          column: columnAt(file.content, index),
          kind: path.startsWith('.') ? 'relative' : 'external',
          line: lineAt(file.content, index),
          path,
          sourcePath: file.path,
        }),
      );
    }
  }
  return Object.freeze(
    references.sort(
      (left, right) =>
        left.sourcePath.localeCompare(right.sourcePath) ||
        left.line - right.line ||
        left.path.localeCompare(right.path),
    ),
  );
}

function normalizeRelativePath(sourcePath: string, importPath: string): string | undefined {
  const sourceParts = sourcePath.split('/');
  sourceParts.pop();
  for (const part of importPath.split('/')) {
    if (part === '' || part === '.') {
      continue;
    }
    if (part === '..') {
      if (sourceParts.length === 0) {
        return undefined;
      }
      sourceParts.pop();
    } else {
      sourceParts.push(part);
    }
  }
  return sourceParts.join('/');
}

function hasModule(files: ReadonlySet<string>, path: string): boolean {
  const extensionlessPath = path.replace(/\.(?:[cm]?ts|[cm]?js|jsx)$/i, '');
  const candidates = [
    path,
    extensionlessPath,
    `${extensionlessPath}.ts`,
    `${extensionlessPath}.tsx`,
    `${extensionlessPath}.mts`,
    `${extensionlessPath}.cts`,
    `${extensionlessPath}.js`,
    `${extensionlessPath}.jsx`,
    `${extensionlessPath}.mjs`,
    `${extensionlessPath}.cjs`,
    `${extensionlessPath}.d.ts`,
    `${extensionlessPath}/index.ts`,
    `${extensionlessPath}/index.tsx`,
    `${extensionlessPath}/index.js`,
    `${extensionlessPath}/index.jsx`,
  ];
  return candidates.some((candidate) => files.has(candidate));
}

type SecretSignalKind = 'committed' | 'possible' | 'placeholder' | 'demo';

interface SecretSignal {
  readonly confidence: 'high' | 'medium' | 'low';
  readonly kind: SecretSignalKind;
  readonly severity: 'high' | 'medium' | 'low';
}

const HIGH_CONFIDENCE_SECRET_PATTERN =
  /(?:gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
const GENERIC_SECRET_PATTERN =
  /(?:api[_-]?key|secret|token|password|access[_-]?key)\s*[:=]\s*["']([^"']{12,})["']/i;
const PLACEHOLDER_VALUE_PATTERN =
  /\b(?:changeme|replaceme|your[-_][a-z]+|example|sample|placeholder|xxxxx+|todo|<[^>]+>)\b/i;
const DEMO_FILE_PATH_PATTERN =
  /(?:^|\/)(?:examples?|fixtures?|demos?|samples?|test|tests|__tests__|spec)(?:\/|$)|(?:\.(?:test|spec)\.[cm]?(?:ts|tsx|js|jsx))$/i;

/**
 * GitHub Actions secret expressions (`${{ secrets.X }}`, `${{ github.token }}`,
 * `${{ env.X }}`, `${{ vars.X }}`) reference platform-managed secrets and are
 * not committed credentials. They are removed before pattern matching so they
 * never trigger AN-SEC-003.
 */
function stripGitHubExpressions(content: string): string {
  return content.replace(/\$\{\{[^}]*\}\}/g, '');
}

function detectSecretSignal(file: ClassifiedFile): SecretSignal | undefined {
  const content = stripGitHubExpressions(file.content);
  const committed = HIGH_CONFIDENCE_SECRET_PATTERN.test(content);
  const genericMatch = GENERIC_SECRET_PATTERN.exec(content);
  const value = genericMatch?.[1] ?? '';
  const placeholder = genericMatch !== null && PLACEHOLDER_VALUE_PATTERN.test(value);
  if (!committed && genericMatch === null) {
    return undefined;
  }
  if (DEMO_FILE_PATH_PATTERN.test(file.path)) {
    return Object.freeze({ confidence: 'low', kind: 'demo', severity: 'low' });
  }
  if (committed) {
    return Object.freeze({ confidence: 'high', kind: 'committed', severity: 'high' });
  }
  if (placeholder) {
    return Object.freeze({ confidence: 'low', kind: 'placeholder', severity: 'low' });
  }
  return Object.freeze({ confidence: 'medium', kind: 'possible', severity: 'medium' });
}

function countMatches(content: string, pattern: RegExp): number {
  return [...content.matchAll(pattern)].length;
}

function extractSignals(input: AnalyzerInput, maxImportCount: number): Signals {
  const validFiles = input.files.filter((file) => isValidAnalyzerFile(file, input.snapshot.id));
  const files = classifyFiles(validFiles);
  const sourceFiles = files.filter((file) => file.classification === 'source');
  const testFiles = files.filter((file) => file.classification === 'test');
  const documentationFiles = files.filter((file) => file.classification === 'documentation');
  const configFiles = files.filter((file) => file.classification === 'config');
  const ciFiles = files.filter((file) => file.classification === 'ci');
  const typescriptFiles = files.filter(isTypeScriptFile);
  const javascriptFiles = files.filter(isJavaScriptFile);
  const generatedFiles = files.filter((file) => file.classification === 'generated');
  const packageJson = files.find((file) => file.path.toLowerCase() === 'package.json');
  const packageManifest = packageJson === undefined ? undefined : manifestFrom(packageJson);
  const parsedConfigs = configFiles
    .map(parseJsonConfig)
    .filter((config): config is ParsedConfig => config !== undefined);
  const malformedConfigPaths = configFiles
    .filter((file) => isJsonConfigFile(file) && parseJsonConfig(file) === undefined)
    .map((file) => file.path)
    .sort((left, right) => left.localeCompare(right));
  const lockfilePaths = files
    .filter((file) =>
      /^(?:pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lock(?:b)?)$/i.test(
        basename(file.path),
      ),
    )
    .map((file) => file.path)
    .sort((left, right) => left.localeCompare(right));
  const imports = Object.freeze(files.flatMap(importsFrom).slice(0, maxImportCount));
  const filePaths = new Set(files.map((file) => file.path));
  const unresolvedRelativeImports = imports.filter((reference) => {
    if (reference.kind !== 'relative') {
      return false;
    }
    const normalized = normalizeRelativePath(reference.sourcePath, reference.path);
    return normalized === undefined || !hasModule(filePaths, normalized);
  });
  const sourceContent = sourceFiles.map((file) => file.content).join('\n');
  const allContent = files.map((file) => file.content).join('\n');
  const parsedPackageContent = packageJson?.content ?? '';
  const configNames = new Set(configFiles.map((file) => basename(file.path).toLowerCase()));
  const tooling = [
    ...(configNames.has('biome.json') ? ['biome'] : []),
    ...(configFiles.some((file) => /^eslint\.config\.|^\.eslintrc/i.test(basename(file.path))) ||
    packageManifest?.scripts.some((script) => script === 'lint')
      ? ['eslint']
      : []),
    ...(configFiles.some((file) =>
      /^prettier\.config\.|^\.prettierrc/i.test(basename(file.path)),
    ) || packageManifest?.scripts.some((script) => script.startsWith('format'))
      ? ['prettier']
      : []),
    ...(typescriptFiles.length > 0 ||
    configFiles.some((file) => /^tsconfig/i.test(basename(file.path)))
      ? ['typescript']
      : []),
    ...(configFiles.some((file) => /stylelint/i.test(basename(file.path))) ? ['stylelint'] : []),
  ];
  const testFrameworks = TESTING_FRAMEWORKS.filter((framework) =>
    hasAny(`${parsedPackageContent}\n${allContent}`, [framework]),
  );
  const accessibilityTooling = ACCESSIBILITY_MARKERS.filter((marker) =>
    hasAny(`${parsedPackageContent}\n${allContent}`, [marker]),
  );
  const securityTooling = [
    ...(hasAny(`${parsedPackageContent}\n${allContent}`, [
      'dependabot',
      'codeql',
      'audit-ci',
      'npm audit',
      'pnpm audit',
      'secret scanning',
    ])
      ? ['security-audit']
      : []),
  ];
  const ciCapabilities = [
    ...(ciFiles.length > 0 ? ['ci'] : []),
    ...(ciFiles.some((file) => /\btest\b|npm test|pnpm test|yarn test/i.test(file.content))
      ? ['test']
      : []),
    ...(ciFiles.some((file) => /\blint\b|eslint|prettier/i.test(file.content)) ? ['lint'] : []),
    ...(ciFiles.some((file) => /\bbuild\b|npm run build|pnpm build|yarn build/i.test(file.content))
      ? ['build']
      : []),
    ...(ciFiles.some((file) => /typecheck|tsc --noEmit/i.test(file.content)) ? ['typecheck'] : []),
    ...(ciFiles.some((file) => /audit|codeql|dependabot|secret/i.test(file.content))
      ? ['security']
      : []),
  ];
  const frameworkSignals = [
    ...(packageManifest?.angular ||
    files.some((file) => basename(file.path).toLowerCase() === 'angular.json')
      ? ['angular']
      : []),
    ...(packageManifest?.react ? ['react'] : []),
    ...(packageManifest?.nodeSignal ? ['node.js'] : []),
  ];
  const deepestSourcePath = sourceFiles
    .map((file) => ({ file, depth: file.path.split('/').length }))
    .sort(
      (left, right) => right.depth - left.depth || left.file.path.localeCompare(right.file.path),
    )[0]?.file;
  const sourceLineCounts = sourceFiles.map((file) => ({
    file,
    lines: file.content.length === 0 ? 0 : file.content.split('\n').length,
  }));
  const maxSourceLines = sourceLineCounts.reduce(
    (maximum, current) => Math.max(maximum, current.lines),
    0,
  );
  const securitySignals = files.filter(
    (file) => isPotentialSecretPath(file.path) || /^\.env(?:\.|$)/i.test(basename(file.path)),
  );
  const potentialSecretFiles = files
    .map((file) => ({ file, signal: detectSecretSignal(file) }))
    .filter(
      (candidate): candidate is { file: ClassifiedFile; signal: SecretSignal } =>
        candidate.signal !== undefined,
    );
  const limitations = [
    ...(input.limitations ?? []),
    ...(validFiles.length !== input.files.length ? ['invalid_input_files_excluded'] : []),
    ...(packageJson !== undefined && packageManifest === undefined
      ? ['malformed_package_json']
      : []),
    ...(imports.length >= maxImportCount ? ['import_count_limit_reached'] : []),
    ...malformedConfigPaths.map((path) => `malformed_config:${path}`),
    ...(unresolvedRelativeImports.length > 0 ? ['relative_import_resolution_is_heuristic'] : []),
    ...(files.some((file) => file.classification === 'unknown')
      ? ['unknown_file_types_not_analyzed']
      : []),
  ];

  return Object.freeze({
    accessibilityTooling: Object.freeze([...accessibilityTooling].sort()),
    anyCount: countMatches(sourceContent, /\bany\b/g),
    ciCapabilities: Object.freeze([...new Set(ciCapabilities)]),
    ciFiles: Object.freeze(ciFiles),
    configFiles: Object.freeze(configFiles),
    consoleCount: countMatches(sourceContent, /\bconsole\.[A-Za-z]+\s*\(/g),
    documentationFiles: Object.freeze(documentationFiles),
    files: Object.freeze(files),
    frameworkSignals: Object.freeze([...new Set(frameworkSignals)]),
    generatedFiles: Object.freeze(generatedFiles),
    imports,
    javascriptFiles: Object.freeze(javascriptFiles),
    lockfilePaths: Object.freeze(lockfilePaths),
    malformedConfigPaths: Object.freeze(malformedConfigPaths),
    maxSourceLines,
    packageJson,
    packageManifest,
    parsedConfigs: Object.freeze(parsedConfigs),
    potentialSecretFiles: Object.freeze(potentialSecretFiles),
    securitySignals: Object.freeze(securitySignals),
    securityTooling: Object.freeze([...new Set(securityTooling)]),
    sourceFiles: Object.freeze(sourceFiles),
    testFiles: Object.freeze(testFiles),
    testFrameworks: Object.freeze([...testFrameworks].sort()),
    todoCount: countMatches(sourceContent, /\b(?:TODO|FIXME)\b/gi),
    tooling: Object.freeze([...new Set(tooling)].sort()),
    tsIgnoreCount: countMatches(allContent, /@ts-ignore\b/g),
    typescriptFiles: Object.freeze(typescriptFiles),
    unresolvedRelativeImports: Object.freeze(unresolvedRelativeImports),
    deepestSourcePath,
    limitations: Object.freeze([...new Set(limitations)].sort()),
  });
}

function factId(key: string): string {
  return `fact:${key}`;
}

function metricId(name: string): string {
  return `metric:${name}`;
}

function makeProvenance(
  snapshotId: string,
  ruleId: string,
  ruleSetVersion: string,
  method: string,
) {
  return createProvenance({
    method,
    ruleId,
    ruleVersion: ruleSetVersion,
    snapshotId,
    source: 'deterministic',
  });
}

function addFact(
  facts: Fact[],
  snapshotId: string,
  ruleSetVersion: string,
  key: string,
  type: Parameters<typeof createFact>[0]['type'],
  status: ObservationStatus,
  value: Parameters<typeof createFact>[0]['value'],
): Fact {
  const fact = createFact({
    id: factId(key),
    key,
    provenance: makeProvenance(snapshotId, SIGNAL_RULE_ID, ruleSetVersion, 'deterministic-signal'),
    status,
    type,
    value,
  });
  facts.push(fact);
  return fact;
}

function addMetric(
  metrics: Metric[],
  snapshotId: string,
  ruleSetVersion: string,
  name: string,
  value: number | string | null,
  status: ObservationStatus,
  sourceFactIds: readonly string[],
  unit: string | null = null,
): Metric {
  const metric = createMetric({
    id: metricId(name),
    name,
    provenance: makeProvenance(snapshotId, METRIC_RULE_ID, ruleSetVersion, 'deterministic-metric'),
    ruleVersion: ruleSetVersion,
    sourceFactIds,
    status,
    unit,
    value,
  });
  metrics.push(metric);
  return metric;
}

function countFact(
  facts: Fact[],
  snapshotId: string,
  ruleSetVersion: string,
  key: string,
  type: Parameters<typeof createFact>[0]['type'],
  value: number,
): Fact {
  return addFact(facts, snapshotId, ruleSetVersion, key, type, 'observed', value);
}

function booleanFact(
  facts: Fact[],
  snapshotId: string,
  ruleSetVersion: string,
  key: string,
  type: Parameters<typeof createFact>[0]['type'],
  value: boolean,
): Fact {
  return addFact(
    facts,
    snapshotId,
    ruleSetVersion,
    key,
    type,
    value ? 'observed' : 'not_detected',
    value ? true : null,
  );
}

function listFact(
  facts: Fact[],
  snapshotId: string,
  ruleSetVersion: string,
  key: string,
  type: Parameters<typeof createFact>[0]['type'],
  values: readonly string[],
): Fact {
  const normalized = [...new Set(values)].sort((left, right) => left.localeCompare(right));
  return addFact(
    facts,
    snapshotId,
    ruleSetVersion,
    key,
    type,
    normalized.length === 0 ? 'not_detected' : 'observed',
    normalized.length === 0 ? null : normalized,
  );
}

function buildFactsAndMetrics(
  snapshotId: string,
  ruleSetVersion: string,
  signals: Signals,
): { readonly facts: readonly Fact[]; readonly metrics: readonly Metric[] } {
  const facts: Fact[] = [];
  const metrics: Metric[] = [];
  const totalFiles = countFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'total_file_count',
    'file_count',
    signals.files.length,
  );
  const sourceFiles = countFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'source_file_count',
    'file_count',
    signals.sourceFiles.length,
  );
  const testFiles = countFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'test_file_count',
    'test',
    signals.testFiles.length,
  );
  const documentationFiles = countFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'documentation_file_count',
    'documentation',
    signals.documentationFiles.length,
  );
  const configFiles = countFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'config_file_count',
    'configuration',
    signals.configFiles.length,
  );
  const tsFiles = countFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'typescript_file_count',
    'language',
    signals.typescriptFiles.length,
  );
  const jsFiles = countFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'javascript_file_count',
    'language',
    signals.javascriptFiles.length,
  );
  const sourceBytes = signals.sourceFiles.reduce((total, file) => total + file.size, 0);
  const sourceBytesFact = countFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'source_byte_count',
    'file_count',
    sourceBytes,
  );
  const importFact = countFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'import_count',
    'tooling',
    signals.imports.length,
  );
  const todoFact = countFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'todo_fixme_count',
    'tooling',
    signals.todoCount,
  );
  const anyFact = countFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'any_usage_count',
    'tooling',
    signals.anyCount,
  );
  const consoleFact = countFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'console_usage_count',
    'tooling',
    signals.consoleCount,
  );
  const tsIgnoreFact = countFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'ts_ignore_count',
    'tooling',
    signals.tsIgnoreCount,
  );
  const generatedFact = countFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'generated_file_count',
    'file_count',
    signals.generatedFiles.length,
  );
  const lockfileFact = booleanFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'lockfile_present',
    'package_manager',
    signals.lockfilePaths.length > 0,
  );
  const manifestFact = booleanFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'package_json_present',
    'configuration',
    signals.packageJson !== undefined,
  );
  const readmeFact = booleanFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'readme_present',
    'documentation',
    signals.documentationFiles.some((file) => /^readme(?:\.|$)/i.test(basename(file.path))),
  );
  const ciFact = booleanFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'ci_workflow_present',
    'ci',
    signals.ciFiles.length > 0,
  );
  const testToolingFact = listFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'test_tooling',
    'test',
    signals.testFrameworks,
  );
  const lintFact = listFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'lint_tooling',
    'tooling',
    signals.tooling.filter((tool) => ['eslint', 'biome', 'stylelint'].includes(tool)),
  );
  const prettierFact = listFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'formatting_tooling',
    'tooling',
    signals.tooling.filter((tool) => tool === 'prettier'),
  );
  const tsConfigFact = booleanFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'typescript_config_present',
    'configuration',
    signals.configFiles.some((file) => /^tsconfig(?:\.|$)/i.test(basename(file.path))),
  );
  const frameworkFact = listFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'framework_detected',
    'framework',
    signals.frameworkSignals,
  );
  const packageManagerFact = listFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'package_manager',
    'package_manager',
    signals.packageManifest?.packageManager === undefined
      ? signals.lockfilePaths.map((path) =>
          path.toLowerCase().startsWith('pnpm-')
            ? 'pnpm'
            : path.toLowerCase() === 'yarn.lock'
              ? 'yarn'
              : path.toLowerCase().startsWith('bun.')
                ? 'bun'
                : 'npm',
        )
      : [signals.packageManifest.packageManager],
  );
  const securityToolingFact = listFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'security_tooling',
    'security',
    signals.securityTooling,
  );
  const accessibilityFact = listFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'accessibility_tooling',
    'accessibility',
    signals.accessibilityTooling,
  );
  const ciCapabilitiesFact = listFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'ci_capabilities',
    'ci',
    signals.ciCapabilities,
  );
  const strictConfig = signals.parsedConfigs.find((config) =>
    /^tsconfig(?:\.|$)/i.test(basename(config.path)),
  );
  const compilerOptions =
    strictConfig === undefined ? undefined : jsonRecord(strictConfig.value['compilerOptions']);
  const strictValue = compilerOptions?.['strict'];
  const strictFact = addFact(
    facts,
    snapshotId,
    ruleSetVersion,
    'typescript_strict',
    'configuration',
    typeof strictValue === 'boolean' ? 'observed' : 'unknown',
    typeof strictValue === 'boolean' ? strictValue : null,
  );
  const manifest = signals.packageManifest;
  const dependencyCount =
    manifest === undefined
      ? addFact(
          facts,
          snapshotId,
          ruleSetVersion,
          'dependency_count',
          'dependency',
          'insufficient_data',
          null,
        )
      : countFact(
          facts,
          snapshotId,
          ruleSetVersion,
          'dependency_count',
          'dependency',
          new Set([
            ...manifest.dependencies,
            ...manifest.devDependencies,
            ...manifest.peerDependencies,
            ...manifest.optionalDependencies,
          ]).size,
        );
  const directDependencyCount =
    manifest === undefined
      ? addFact(
          facts,
          snapshotId,
          ruleSetVersion,
          'direct_dependency_count',
          'dependency',
          'insufficient_data',
          null,
        )
      : countFact(
          facts,
          snapshotId,
          ruleSetVersion,
          'direct_dependency_count',
          'dependency',
          manifest.dependencies.length,
        );
  const devDependencyCount =
    manifest === undefined
      ? addFact(
          facts,
          snapshotId,
          ruleSetVersion,
          'dev_dependency_count',
          'dependency',
          'insufficient_data',
          null,
        )
      : countFact(
          facts,
          snapshotId,
          ruleSetVersion,
          'dev_dependency_count',
          'dependency',
          manifest.devDependencies.length,
        );
  const peerDependencyCount =
    manifest === undefined
      ? addFact(
          facts,
          snapshotId,
          ruleSetVersion,
          'peer_dependency_count',
          'dependency',
          'insufficient_data',
          null,
        )
      : countFact(
          facts,
          snapshotId,
          ruleSetVersion,
          'peer_dependency_count',
          'dependency',
          manifest.peerDependencies.length,
        );
  const optionalDependencyCount =
    manifest === undefined
      ? addFact(
          facts,
          snapshotId,
          ruleSetVersion,
          'optional_dependency_count',
          'dependency',
          'insufficient_data',
          null,
        )
      : countFact(
          facts,
          snapshotId,
          ruleSetVersion,
          'optional_dependency_count',
          'dependency',
          manifest.optionalDependencies.length,
        );
  addMetric(
    metrics,
    snapshotId,
    ruleSetVersion,
    'total_file_count',
    totalFiles.value as number,
    'observed',
    [totalFiles.id],
    'files',
  );
  addMetric(
    metrics,
    snapshotId,
    ruleSetVersion,
    'source_file_count',
    sourceFiles.value as number,
    'observed',
    [sourceFiles.id],
    'files',
  );
  addMetric(
    metrics,
    snapshotId,
    ruleSetVersion,
    'test_file_count',
    testFiles.value as number,
    'observed',
    [testFiles.id],
    'files',
  );
  addMetric(
    metrics,
    snapshotId,
    ruleSetVersion,
    'documentation_file_count',
    documentationFiles.value as number,
    'observed',
    [documentationFiles.id],
    'files',
  );
  addMetric(
    metrics,
    snapshotId,
    ruleSetVersion,
    'config_file_count',
    configFiles.value as number,
    'observed',
    [configFiles.id],
    'files',
  );
  addMetric(
    metrics,
    snapshotId,
    ruleSetVersion,
    'typescript_file_count',
    tsFiles.value as number,
    'observed',
    [tsFiles.id],
    'files',
  );
  addMetric(
    metrics,
    snapshotId,
    ruleSetVersion,
    'javascript_file_count',
    jsFiles.value as number,
    'observed',
    [jsFiles.id],
    'files',
  );
  addMetric(
    metrics,
    snapshotId,
    ruleSetVersion,
    'source_byte_count',
    sourceBytesFact.value as number,
    'observed',
    [sourceBytesFact.id],
    'bytes',
  );
  addMetric(
    metrics,
    snapshotId,
    ruleSetVersion,
    'import_count',
    importFact.value as number,
    'observed',
    [importFact.id],
    'imports',
  );
  addMetric(
    metrics,
    snapshotId,
    ruleSetVersion,
    'todo_fixme_count',
    todoFact.value as number,
    'observed',
    [todoFact.id],
    'occurrences',
  );
  for (const [name, fact] of [
    ['any_usage_count', anyFact],
    ['console_usage_count', consoleFact],
    ['ts_ignore_count', tsIgnoreFact],
    ['generated_file_count', generatedFact],
  ] as const) {
    addMetric(
      metrics,
      snapshotId,
      ruleSetVersion,
      name,
      fact.value as number,
      'observed',
      [fact.id],
      'occurrences',
    );
  }
  addMetric(
    metrics,
    snapshotId,
    ruleSetVersion,
    'dependency_count',
    dependencyCount.value as number | null,
    dependencyCount.status,
    [dependencyCount.id],
    'dependencies',
  );
  for (const [name, fact] of [
    ['direct_dependency_count', directDependencyCount],
    ['dev_dependency_count', devDependencyCount],
    ['peer_dependency_count', peerDependencyCount],
    ['optional_dependency_count', optionalDependencyCount],
  ] as const) {
    addMetric(
      metrics,
      snapshotId,
      ruleSetVersion,
      name,
      fact.value as number | null,
      fact.status,
      [fact.id],
      'dependencies',
    );
  }
  const testRatio =
    signals.sourceFiles.length === 0 ? null : signals.testFiles.length / signals.sourceFiles.length;
  addMetric(
    metrics,
    snapshotId,
    ruleSetVersion,
    'test_source_ratio',
    testRatio,
    testRatio === null ? 'insufficient_data' : 'observed',
    [sourceFiles.id, testFiles.id],
    'ratio',
  );
  const averageSourceSize =
    signals.sourceFiles.length === 0 ? null : sourceBytes / signals.sourceFiles.length;
  addMetric(
    metrics,
    snapshotId,
    ruleSetVersion,
    'average_source_file_size',
    averageSourceSize,
    averageSourceSize === null ? 'insufficient_data' : 'observed',
    [sourceBytesFact.id, sourceFiles.id],
    'bytes',
  );
  const largestSourceFile = signals.sourceFiles
    .map((file) => file.size)
    .reduce<number | null>(
      (largest, size) => (largest === null || size > largest ? size : largest),
      null,
    );
  addMetric(
    metrics,
    snapshotId,
    ruleSetVersion,
    'max_source_file_size',
    largestSourceFile,
    largestSourceFile === null ? 'insufficient_data' : 'observed',
    [sourceBytesFact.id],
    'bytes',
  );
  void todoFact;
  void anyFact;
  void consoleFact;
  void tsIgnoreFact;
  void generatedFact;
  void lockfileFact;
  void manifestFact;
  void readmeFact;
  void ciFact;
  void testToolingFact;
  void lintFact;
  void prettierFact;
  void tsConfigFact;
  void frameworkFact;
  void packageManagerFact;
  void securityToolingFact;
  void accessibilityFact;
  void ciCapabilitiesFact;
  void strictFact;
  return Object.freeze({ facts: Object.freeze(facts), metrics: Object.freeze(metrics) });
}

function findingId(key: string): string {
  return `finding:${key}`;
}

function recommendationId(key: string): string {
  return `recommendation:${key}`;
}

function buildFindingSpecs(
  context: AnalyzerContext,
  limits: AnalyzerLimits,
): readonly FindingSpec[] {
  const { signals, facts, metrics } = context;
  const specs: FindingSpec[] = [];
  const factByKey = new Map(facts.map((fact) => [fact.key, fact]));
  const metricByName = new Map(metrics.map((metric) => [metric.name, metric]));
  const readme = factByKey.get('readme_present');
  if (readme?.status === 'not_detected') {
    specs.push({
      description: 'No README file was detected in the bounded repository snapshot.',
      dimension: 'documentation',
      impact: 'Users and maintainers may lack an entry point for understanding the repository.',
      key: 'missing-readme',
      priority: 'low',
      recommendationDescription:
        'Add a concise README covering purpose, setup, development commands, and limitations.',
      recommendationTitle: 'Add a repository README',
      ruleId: 'AN-DOC-001',
      severity: 'low',
      sourceId: readme.id,
      title: 'README was not detected',
    });
  }
  const testCount = metricByName.get('test_file_count');
  if (testCount?.value === 0) {
    const testToolingFact = factByKey.get('test_tooling');
    const hasTestTooling = testToolingFact?.status === 'observed';
    specs.push({
      description: hasTestTooling
        ? `Test files matching the supported conventions were not included in the bounded snapshot, but test tooling (${(testToolingFact!.value as readonly string[]).join(', ')}) was detected.`
        : 'No test files matching the supported TypeScript/JavaScript test conventions were detected.',
      dimension: 'testing',
      impact: hasTestTooling
        ? 'Test files may exist but were not observed in the bounded snapshot.'
        : 'Important behavior may lack visible automated regression coverage.',
      key: 'missing-tests',
      priority: 'low',
      recommendationDescription: hasTestTooling
        ? 'The bounded snapshot did not include test files; this may be a limitation of the ingestion limits.'
        : 'Add focused automated tests for critical behavior and run them in the project workflow.',
      recommendationTitle: hasTestTooling
        ? 'Consider increasing ingestion limits to include test files'
        : 'Add automated tests for critical behavior',
      ruleId: 'AN-TEST-001',
      severity: hasTestTooling ? 'low' : 'medium',
      sourceId: testCount.id,
      evidenceStatus: hasTestTooling ? 'not_inspected' : 'absence_based',
      title: hasTestTooling
        ? 'Test files were not included in the bounded snapshot'
        : 'Test files were not detected',
    });
  }
  const testTooling = factByKey.get('test_tooling');
  if (testTooling?.status === 'not_detected') {
    specs.push({
      description: 'No recognizable test framework configuration or dependency was detected.',
      dimension: 'testing',
      impact: 'The repository provides no visible testing entry point for future contributors.',
      key: 'missing-test-tooling',
      priority: 'low',
      recommendationDescription:
        'Document and configure a test tool appropriate for the project, without assuming a specific framework.',
      recommendationTitle: 'Document a testing entry point',
      ruleId: 'AN-TEST-002',
      severity: 'low',
      sourceId: testTooling.id,
      title: 'Test tooling was not detected',
    });
  }
  const lintTooling = factByKey.get('lint_tooling');
  if (lintTooling?.status === 'not_detected') {
    specs.push({
      description:
        'No ESLint, Biome, or equivalent lint configuration was detected in the snapshot.',
      dimension: 'code_quality',
      impact: 'The repository has no visible deterministic check for common code-quality issues.',
      key: 'missing-lint-tooling',
      priority: 'low',
      recommendationDescription:
        'Introduce a deterministic lint configuration and document how it is run in CI.',
      recommendationTitle: 'Add deterministic linting',
      ruleId: ANALYZER_RULE_IDS.tooling,
      severity: 'low',
      sourceId: lintTooling.id,
      title: 'Lint configuration was not detected',
    });
  }
  const manifest = factByKey.get('package_json_present');
  const lockfile = factByKey.get('lockfile_present');
  if (manifest?.status === 'observed' && lockfile?.status === 'not_detected') {
    const lockfileExcludedBySize = signals.limitations.some((limitation) =>
      /^file_too_large:.*(?:lock|pnpm-lock|package-lock|yarn\.lock|bun\.lock)/i.test(limitation),
    );
    if (!lockfileExcludedBySize) {
      specs.push({
        description: 'A package manifest is present, but no supported lockfile was detected.',
        dimension: 'dependencies',
        impact: 'Dependency resolution may vary between environments and is harder to reproduce.',
        key: 'missing-lockfile',
        priority: 'medium',
        recommendationDescription:
          'Add and commit the lockfile matching the repository package manager.',
        recommendationTitle: 'Commit a dependency lockfile',
        ruleId: ANALYZER_RULE_IDS.dependencies,
        severity: 'medium',
        sourceId: lockfile.id,
        sourcePath: signals.packageJson?.path,
        evidenceStatus: 'absence_based',
        title: 'Package manifest has no detected lockfile',
      });
    }
  }
  const strict = factByKey.get('typescript_strict');
  if (signals.typescriptFiles.length > 0 && strict?.status !== 'observed') {
    specs.push({
      description:
        'TypeScript source was detected, but strict compiler configuration could not be verified.',
      dimension: 'code_quality',
      impact: 'Type errors may be caught later or inconsistently across environments.',
      key: 'typescript-strict-unknown',
      priority: 'low',
      recommendationDescription:
        'Document or enable the TypeScript compiler checks that the project intentionally relies on.',
      recommendationTitle: 'Make TypeScript checks explicit',
      ruleId: 'AN-CQ-002',
      severity: 'low',
      sourceId: strict?.id ?? factId('typescript_config_present'),
      sourcePath: signals.configFiles.find((file) => /^tsconfig/i.test(basename(file.path)))?.path,
      evidenceStatus: 'not_inspected',
      title: 'TypeScript strictness was not verified',
    });
  } else if (strict?.status === 'observed' && strict.value === false) {
    specs.push({
      description: 'The detected TypeScript configuration explicitly sets strict mode to false.',
      dimension: 'code_quality',
      impact:
        'A broad class of TypeScript checks is intentionally disabled for this configuration.',
      key: 'typescript-strict-disabled',
      priority: 'low',
      recommendationDescription:
        'Review whether strict mode can be enabled incrementally and document any deliberate exceptions.',
      recommendationTitle: 'Review disabled TypeScript strictness',
      ruleId: 'AN-CQ-003',
      severity: 'low',
      sourceId: strict.id,
      sourcePath: signals.configFiles.find((file) => /^tsconfig/i.test(basename(file.path)))?.path,
      evidenceStatus: 'verified',
      title: 'TypeScript strict mode is disabled',
    });
  }
  if (signals.maxSourceLines > limits.maxSourceFileLines) {
    const largest = signals.sourceFiles
      .map((file) => ({
        file,
        lines: file.content.length === 0 ? 0 : file.content.split('\n').length,
      }))
      .sort(
        (left, right) => right.lines - left.lines || left.file.path.localeCompare(right.file.path),
      )[0];
    const sourceMetric = metricByName.get('max_source_file_size');
    if (largest !== undefined) {
      specs.push({
        description: `${largest.file.path} contains ${largest.lines} lines, above the initial ${limits.maxSourceFileLines}-line heuristic threshold.`,
        dimension: 'maintainability',
        impact: 'Large modules can make review, ownership, and isolated testing more difficult.',
        key: `large-source-file-${stableHash(largest.file.path)}`,
        line: largest.lines,
        priority: 'medium',
        recommendationDescription:
          'Review the module boundaries and split the file only where that improves cohesive ownership.',
        recommendationTitle: 'Review the oversized source module',
        ruleId: 'AN-MAINT-001',
        severity: 'medium',
        sourceId: sourceMetric?.id ?? factId('source_file_count'),
        sourcePath: largest.file.path,
        title: 'Source file exceeds the initial size heuristic',
      });
    }
  }
  if (signals.todoCount > limits.maxTodoCount) {
    const todoFact = factByKey.get('todo_fixme_count');
    specs.push({
      description: `${signals.todoCount} TODO/FIXME markers were detected across the bounded snapshot.`,
      dimension: 'code_quality',
      impact: 'Accumulated deferred work can make maintenance risks less visible.',
      key: 'high-todo-count',
      priority: 'low',
      recommendationDescription:
        'Review TODO/FIXME markers and turn actionable items into tracked work or remove stale markers.',
      recommendationTitle: 'Review accumulated TODO and FIXME markers',
      ruleId: 'AN-CQ-004',
      severity: 'low',
      sourceId: todoFact?.id ?? factId('todo_fixme_count'),
      evidenceStatus: 'verified',
      title: 'Many TODO/FIXME markers were detected',
    });
  }
  if (signals.tsIgnoreCount > 0) {
    specs.push({
      description: `${signals.tsIgnoreCount} TypeScript ignore directive(s) were detected.`,
      dimension: 'code_quality',
      impact: 'Ignore directives can hide type errors at specific source locations.',
      key: 'ts-ignore-directives',
      priority: 'low',
      recommendationDescription:
        'Review each ignore directive and replace it with a narrower type-safe explanation where possible.',
      recommendationTitle: 'Review TypeScript ignore directives',
      ruleId: 'AN-CQ-005',
      severity: 'low',
      sourceId: factByKey.get('typescript_file_count')?.id ?? factId('typescript_file_count'),
      sourcePath: signals.typescriptFiles[0]?.path,
      title: 'TypeScript ignore directives were detected',
    });
  }
  if (signals.unresolvedRelativeImports.length > 0) {
    const reference = signals.unresolvedRelativeImports[0];
    if (reference === undefined) {
      return Object.freeze(specs);
    }
    specs.push({
      confidence: 'medium',
      description: `The relative import ${reference.path} from ${reference.sourcePath} could not be matched using the bounded static resolution policy.`,
      dimension: 'architecture',
      impact:
        'The import may fail at runtime or may rely on resolution rules outside the analyzer scope.',
      key: `unresolved-relative-import-${stableHash(`${reference.sourcePath}:${reference.path}`)}`,
      line: reference.line,
      priority: 'medium',
      recommendationDescription:
        'Verify the import path and the project resolver configuration; this analyzer does not execute module resolution.',
      recommendationTitle: 'Verify the unresolved relative import',
      ruleId: IMPORT_RULE_ID,
      severity: 'medium',
      sourceId: factByKey.get('import_count')?.id ?? factId('import_count'),
      sourcePath: reference.sourcePath,
      evidenceStatus: 'not_verified',
      title: 'A relative import could not be resolved statically',
    });
  }
  if (
    signals.deepestSourcePath !== undefined &&
    signals.deepestSourcePath.path.split('/').length > 6
  ) {
    specs.push({
      description: `${signals.deepestSourcePath.path} is nested more than six path segments deep.`,
      dimension: 'architecture',
      impact:
        'Deep nesting can increase navigation and ownership overhead, although it is not proof of a structural defect.',
      key: `deep-source-path-${stableHash(signals.deepestSourcePath.path)}`,
      priority: 'low',
      recommendationDescription:
        'Review the directory boundary only if the depth reflects unclear ownership or repeated traversal.',
      recommendationTitle: 'Review deeply nested source paths',
      ruleId: ANALYZER_RULE_IDS.architecture,
      severity: 'low',
      sourceId: factByKey.get('source_file_count')?.id ?? factId('source_file_count'),
      sourcePath: signals.deepestSourcePath.path,
      title: 'A source path is unusually deeply nested',
    });
  }
  const sensitiveFile = signals.securitySignals[0];
  if (sensitiveFile !== undefined) {
    const file = sensitiveFile;
    specs.push({
      description: `A potentially sensitive filename was present in the bounded snapshot: ${file.path}.`,
      dimension: 'security',
      impact:
        'Credential or private-key material may be committed and exposed to repository consumers.',
      key: `sensitive-file-${stableHash(file.path)}`,
      priority: 'high',
      recommendationDescription:
        'Remove sensitive material from version control, rotate any exposed credential, and add an appropriate ignore or secret-management policy.',
      recommendationTitle: 'Review the potentially sensitive file',
      ruleId: SECURITY_RULE_ID,
      severity: 'high',
      sourceId: factByKey.get('security_tooling')?.id ?? factId('total_file_count'),
      sourcePath: file.path,
      title: 'A potentially sensitive filename was detected',
    });
  }
  const SECRET_KIND_TEXT: Readonly<
    Record<
      SecretSignalKind,
      {
        readonly description: string;
        readonly impact: string;
        readonly recommendationDescription: string;
        readonly recommendationTitle: string;
        readonly title: string;
      }
    >
  > = Object.freeze({
    committed: {
      description:
        'A high-confidence credential pattern was detected; the analyzer stores only a hash as evidence.',
      impact: 'A committed credential could allow unauthorized access if it is valid.',
      recommendationDescription:
        'Verify and rotate the suspected credential, remove it from version control, and use a managed secret mechanism.',
      recommendationTitle: 'Investigate and rotate the suspected credential',
      title: 'A potential committed secret was detected',
    },
    possible: {
      description:
        'A content pattern resembling a credential was detected; the analyzer stores only a hash as evidence.',
      impact: 'A secret-like value may be a committed credential and should be verified.',
      recommendationDescription:
        'Verify whether the value is a real credential; if it is, rotate it and remove it from version control.',
      recommendationTitle: 'Verify whether the detected value is a real credential',
      title: 'A possible secret-like value was detected',
    },
    placeholder: {
      description:
        'A secret-like value that looks like a placeholder was detected; the analyzer stores only a hash as evidence.',
      impact:
        'Placeholder credentials are low risk but can be copied into real deployments by mistake.',
      recommendationDescription:
        'Replace obvious placeholder values with explicit configuration or documentation that explains what is expected.',
      recommendationTitle: 'Replace placeholder credentials with explicit configuration',
      title: 'A placeholder secret-like value was detected',
    },
    demo: {
      description:
        'A secret-like pattern was detected in demo, example, or test content; the analyzer stores only a hash as evidence.',
      impact: 'Demo credentials are low risk but can be copied into real deployments by mistake.',
      recommendationDescription:
        'Replace hard-coded demo credentials with placeholder references or clearly documented example values.',
      recommendationTitle: 'Replace demo credentials with placeholder references',
      title: 'Secret-like demo or test content was detected',
    },
  });
  for (const { file, signal } of signals.potentialSecretFiles.slice(0, 5)) {
    const text = SECRET_KIND_TEXT[signal.kind];
    specs.push({
      confidence: signal.confidence,
      description: text.description,
      dimension: 'security',
      impact: text.impact,
      key: `potential-secret-${stableHash(file.path)}`,
      priority:
        signal.severity === 'high' ? 'high' : signal.severity === 'medium' ? 'medium' : 'low',
      recommendationDescription: text.recommendationDescription,
      recommendationTitle: text.recommendationTitle,
      ruleId: 'AN-SEC-003',
      severity: signal.severity,
      sourceId: factByKey.get('total_file_count')?.id ?? factId('total_file_count'),
      sourcePath: file.path,
      title: text.title,
    });
  }
  return Object.freeze(specs);
}

function createFindingBundle(
  context: AnalyzerContext,
  specs: readonly FindingSpec[],
): {
  readonly evidence: readonly Evidence[];
  readonly findings: readonly Finding[];
  readonly recommendations: readonly Recommendation[];
} {
  const evidence: Evidence[] = [];
  const findings: Finding[] = [];
  const recommendations: Recommendation[] = [];
  for (const spec of specs) {
    const findingKey = findingId(spec.key);
    const recommendationKey = recommendationId(spec.key);
    const evidenceKey = `evidence:${spec.key}`;
    const sourcePath = spec.sourcePath;
    const evidenceItem = createEvidence({
      excerptHash: stableHash(
        `${context.snapshotId}|${sourcePath ?? 'repository'}|${spec.ruleId}|${spec.line ?? 0}`,
      ),
      id: evidenceKey,
      kind: sourcePath === undefined ? 'metadata' : 'file',
      location:
        sourcePath === undefined
          ? null
          : {
              path: sourcePath,
              ...(spec.line === undefined
                ? {}
                : {
                    range: {
                      start: { column: 1, line: spec.line },
                      end: { column: 1, line: spec.line },
                    },
                  }),
            },
      snapshotId: context.snapshotId,
      sourceId: spec.sourceId,
    });
    const recommendation = createRecommendation({
      description: spec.recommendationDescription,
      findingIds: [findingKey],
      id: recommendationKey,
      priority: spec.priority,
      source: 'deterministic',
      title: spec.recommendationTitle,
    });
    const finding = createFinding({
      category: spec.dimension,
      confidence: spec.confidence ?? 'high',
      description: spec.description,
      evidenceIds: [evidenceItem.id],
      evidenceStatus:
        spec.evidenceStatus ?? (sourcePath === undefined ? 'absence_based' : 'verified'),
      id: findingKey,
      impact: spec.impact,
      recommendationIds: [recommendation.id],
      provenance: makeProvenance(
        context.snapshotId,
        spec.ruleId,
        context.ruleSetVersion,
        'deterministic-rule',
      ),
      ruleId: spec.ruleId,
      ruleVersion: context.ruleSetVersion,
      severity: spec.severity,
      source: 'deterministic',
      title: spec.title,
    });
    evidence.push(evidenceItem);
    findings.push(finding);
    recommendations.push(recommendation);
  }
  return Object.freeze({
    evidence: Object.freeze(evidence),
    findings: Object.freeze(findings),
    recommendations: Object.freeze(recommendations),
  });
}

function analyzerCoverage(signals: Signals): {
  readonly coverage: Coverage;
  readonly confidence: ConfidenceBand;
} {
  if (signals.files.length === 0 || signals.sourceFiles.length === 0) {
    return { confidence: 'low', coverage: 'insufficient' };
  }
  if (signals.limitations.length > 0 || signals.malformedConfigPaths.length > 0) {
    return { confidence: 'medium', coverage: 'partial' };
  }
  return { confidence: 'high', coverage: 'complete' };
}

export function analyze(input: AnalyzerInput, options?: AnalyzerOptions): AnalysisResult {
  const limits = mergeOptions(options);
  if (input.snapshot.id.trim().length === 0) {
    throw new TypeError('input.snapshot.id must be non-empty');
  }
  const signals = extractSignals(input, limits.maxImportCount);
  const { facts, metrics } = buildFactsAndMetrics(
    input.snapshot.id,
    limits.ruleSetVersion,
    signals,
  );
  const context: AnalyzerContext = {
    analyzerVersion: limits.analyzerVersion,
    facts,
    metrics,
    ruleSetVersion: limits.ruleSetVersion,
    signals,
    snapshotId: input.snapshot.id,
  };
  const specs = buildFindingSpecs(context, limits);
  const bundle = createFindingBundle(context, specs);
  const { coverage, confidence } = analyzerCoverage(signals);
  return createAnalysisResult({
    analyzerVersion: limits.analyzerVersion,
    confidence,
    coverage,
    createdAt: input.snapshot.createdAt,
    dimensionScores: [],
    evidence: bundle.evidence,
    facts,
    findings: bundle.findings,
    id: `analysis:${input.snapshot.id}`,
    ...(input.inspectedScope === undefined ? {} : { inspectedScope: input.inspectedScope }),
    limitations: signals.limitations,
    metrics,
    recommendations: bundle.recommendations,
    ruleSetVersion: limits.ruleSetVersion,
    snapshot: input.snapshot,
  });
}

export function analyzeImports(files: readonly AnalyzerFile[]): readonly ImportReference[] {
  return Object.freeze(classifyFiles(files).flatMap(importsFrom));
}

export function getAnalyzerLimits(options?: AnalyzerOptions): AnalyzerLimits {
  const limits = mergeOptions(options);
  return Object.freeze({
    maxImportCount: limits.maxImportCount,
    maxSourceFileLines: limits.maxSourceFileLines,
    maxTodoCount: limits.maxTodoCount,
  });
}
