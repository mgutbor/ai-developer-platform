import { DomainValidationError } from './errors.js';
import type {
  AnalysisDimension,
  AnalysisResult,
  AnalysisSource,
  ConfidenceBand,
  Coverage,
  DimensionScore,
  Evidence,
  EvidenceKind,
  EvidenceLocation,
  Fact,
  FactType,
  FactValue,
  Finding,
  FindingEvidenceStatus,
  InspectedScope,
  Metadata,
  Metric,
  ObservationStatus,
  Provenance,
  Recommendation,
  RecommendationPriority,
  RepositorySnapshot,
  Severity,
  SourcePosition,
  SourceRange,
} from './types.js';

export interface CreateRepositorySnapshotInput {
  readonly owner: string;
  readonly name: string;
  readonly repositoryUrl: string;
  readonly ref: string;
  readonly commitSha: string;
  readonly createdAt?: string;
}

export interface CreateProvenanceInput {
  readonly source: AnalysisSource;
  readonly method: string;
  readonly snapshotId: string;
  readonly ruleId?: string;
  readonly ruleVersion?: string;
}

export interface CreateFactInput {
  readonly id: string;
  readonly type: FactType;
  readonly key: string;
  readonly status: ObservationStatus;
  readonly value: FactValue | null;
  readonly provenance: Provenance;
  readonly metadata?: Metadata;
}

export interface CreateMetricInput {
  readonly id: string;
  readonly name: string;
  readonly status: ObservationStatus;
  readonly value: number | string | null;
  readonly unit?: string | null;
  readonly sourceFactIds: readonly string[];
  readonly provenance: Provenance;
  readonly ruleVersion: string;
}

export interface CreateEvidenceInput {
  readonly id: string;
  readonly snapshotId: string;
  readonly kind: EvidenceKind;
  readonly location: EvidenceLocation | null;
  readonly excerptHash?: string | null;
  readonly redactedExcerpt?: string | null;
  readonly sourceId: string;
}

export interface CreateFindingInput {
  readonly id: string;
  readonly category: AnalysisDimension;
  readonly severity: Severity;
  readonly title: string;
  readonly description: string;
  readonly impact: string;
  readonly evidenceIds: readonly string[];
  readonly recommendationIds?: readonly string[];
  readonly confidence: ConfidenceBand;
  readonly source: AnalysisSource;
  readonly ruleId?: string | null;
  readonly ruleVersion?: string | null;
  readonly provenance: Provenance;
  readonly evidenceStatus?: FindingEvidenceStatus;
}

export interface CreateRecommendationInput {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly priority: RecommendationPriority;
  readonly findingIds: readonly string[];
  readonly source: AnalysisSource;
  readonly verification?: string;
}

export interface CreateDimensionScoreInput {
  readonly dimension: AnalysisDimension;
  readonly score: number | null;
  readonly confidence: ConfidenceBand;
  readonly evidenceCount: number;
  readonly coverage: Coverage;
  readonly limitations: readonly string[];
}

export interface CreateAnalysisResultInput {
  readonly id: string;
  readonly snapshot: RepositorySnapshot;
  readonly facts: readonly Fact[];
  readonly metrics: readonly Metric[];
  readonly evidence: readonly Evidence[];
  readonly findings: readonly Finding[];
  readonly recommendations: readonly Recommendation[];
  readonly dimensionScores?: readonly DimensionScore[];
  readonly confidence: ConfidenceBand;
  readonly coverage: Coverage;
  readonly ruleSetVersion: string;
  readonly analyzerVersion: string;
  readonly limitations: readonly string[];
  readonly createdAt?: string;
  readonly inspectedScope?: InspectedScope;
}

const ANALYSIS_DIMENSIONS: readonly AnalysisDimension[] = [
  'architecture',
  'maintainability',
  'testing',
  'documentation',
  'accessibility',
  'security',
  'dependencies',
  'code_quality',
];
const ANALYSIS_SOURCES: readonly AnalysisSource[] = ['deterministic', 'ai', 'combined'];
const CONFIDENCE_BANDS: readonly ConfidenceBand[] = ['low', 'medium', 'high'];
const COVERAGE_VALUES: readonly Coverage[] = ['complete', 'partial', 'insufficient'];
const OBSERVATION_STATUSES: readonly ObservationStatus[] = [
  'observed',
  'not_detected',
  'unknown',
  'insufficient_data',
];
const SEVERITIES: readonly Severity[] = ['info', 'low', 'medium', 'high', 'critical'];
const RECOMMENDATION_PRIORITIES: readonly RecommendationPriority[] = ['low', 'medium', 'high'];
const FACT_TYPES: readonly FactType[] = [
  'language',
  'framework',
  'package_manager',
  'file_count',
  'configuration',
  'dependency',
  'test',
  'documentation',
  'ci',
  'tooling',
  'security',
  'accessibility',
];
const EVIDENCE_KINDS: readonly EvidenceKind[] = [
  'file',
  'config',
  'metric',
  'metadata',
  'dependency',
  'workflow',
];

function fail(message: string): never {
  throw new DomainValidationError(message);
}

function requiredText(value: string, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalText(value: string | undefined, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return requiredText(value, field);
}

function enumValue<T extends string>(value: T, values: readonly T[], field: string): T {
  if (!values.includes(value)) {
    fail(`${field} has an unsupported value`);
  }
  return value;
}

function immutable<T>(value: T): T {
  const seen = new WeakSet<object>();

  function freeze(current: T): T {
    if (current === null || typeof current !== 'object') {
      return current;
    }
    const object = current as object;
    if (seen.has(object)) {
      return current;
    }
    seen.add(object);
    for (const child of Object.values(object)) {
      freeze(child as T);
    }
    return Object.freeze(current);
  }

  return freeze(value);
}

function immutableArray<T>(values: readonly T[], field: string, allowEmpty = true): readonly T[] {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)) {
    fail(`${field} must ${allowEmpty ? 'be an array' : 'contain at least one item'}`);
  }
  return Object.freeze([...values]);
}

function uniqueIds(ids: readonly string[], field: string, allowEmpty = true): readonly string[] {
  const normalized = ids.map((id) => requiredText(id, `${field} item`));
  if (new Set(normalized).size !== normalized.length) {
    fail(`${field} must not contain duplicate IDs`);
  }
  return immutableArray(normalized, field, allowEmpty);
}

function validateIsoDate(value: string, field: string): string {
  const normalized = requiredText(value, field);
  if (Number.isNaN(Date.parse(normalized)) || !normalized.includes('T')) {
    fail(`${field} must be an ISO date-time`);
  }
  return normalized;
}

function validateVersion(value: string, field: string): string {
  return requiredText(value, field);
}

function validateSnapshotId(value: string): string {
  return requiredText(value, 'snapshotId');
}

function validateRepositoryPart(value: string, field: string): string {
  const normalized = requiredText(value, field);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(normalized)) {
    fail(`${field} contains unsupported characters`);
  }
  return normalized.toLowerCase();
}

function validateRepositoryUrl(value: string, owner: string, name: string): string {
  const normalized = requiredText(value, 'repositoryUrl');
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    fail('repositoryUrl must be a valid URL');
  }

  const pathname = url.pathname.replace(/\/+$/, '');
  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 'github.com' ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== '' ||
    pathname.toLowerCase() !== `/${owner}/${name}`
  ) {
    fail('repositoryUrl must be the canonical HTTPS URL of a public GitHub repository');
  }
  return `https://github.com/${owner}/${name}`;
}

function validateCommitSha(value: string): string {
  const normalized = requiredText(value, 'commitSha');
  if (!/^(?:[A-Fa-f0-9]{40}|[A-Fa-f0-9]{64})$/.test(normalized)) {
    fail('commitSha must be a full 40 or 64 character hexadecimal revision identifier');
  }
  return normalized.toLowerCase();
}

function validateRangePosition(value: SourcePosition, field: string): SourcePosition {
  if (!value || !Number.isInteger(value.line) || !Number.isInteger(value.column)) {
    fail(`${field} must contain integer line and column values`);
  }
  if (value.line < 1 || value.column < 1) {
    fail(`${field} line and column must be positive`);
  }
  return immutable({ line: value.line, column: value.column });
}

function validateRange(value: SourceRange): SourceRange {
  if (!value) {
    fail('range is required when a source range is provided');
  }
  const start = validateRangePosition(value.start, 'range.start');
  const end = validateRangePosition(value.end, 'range.end');
  if (end.line < start.line || (end.line === start.line && end.column < start.column)) {
    fail('range.end must not precede range.start');
  }
  return immutable({ end, start });
}

function validateInspectedScope(value: InspectedScope): InspectedScope {
  if (
    !Number.isInteger(value.fileCount) ||
    value.fileCount < 0 ||
    !Number.isInteger(value.treeEntriesSeen) ||
    value.treeEntriesSeen < 0 ||
    !Number.isFinite(value.totalBytes) ||
    value.totalBytes < 0
  ) {
    fail('inspectedScope must contain non-negative fileCount, treeEntriesSeen, and totalBytes');
  }
  return immutable({
    fileCount: value.fileCount,
    totalBytes: value.totalBytes,
    treeEntriesSeen: value.treeEntriesSeen,
  });
}

function validateLocation(value: EvidenceLocation | null): EvidenceLocation | null {
  if (value === null) {
    return null;
  }
  const path = requiredText(value.path, 'evidence.location.path').replaceAll('\\', '/');
  if (
    path.startsWith('/') ||
    /^[A-Za-z]:/.test(path) ||
    path.split('/').some((segment) => segment === '..' || segment === '.') ||
    path.split('/').some((segment) => segment === '')
  ) {
    fail('evidence location path must be a normalized relative path');
  }
  const range = value.range === undefined ? undefined : validateRange(value.range);
  return immutable(range === undefined ? { path } : { path, range });
}

function validateProvenance(input: CreateProvenanceInput): Provenance {
  const source = enumValue(input.source, ANALYSIS_SOURCES, 'provenance.source');
  const method = requiredText(input.method, 'provenance.method');
  const snapshotId = validateSnapshotId(input.snapshotId);
  const ruleId = optionalText(input.ruleId, 'provenance.ruleId');
  const ruleVersion = optionalText(input.ruleVersion, 'provenance.ruleVersion');

  if ((ruleId === undefined) !== (ruleVersion === undefined)) {
    fail('provenance.ruleId and provenance.ruleVersion must be provided together');
  }
  if (source === 'deterministic' && (ruleId === undefined || ruleVersion === undefined)) {
    fail('deterministic provenance requires ruleId and ruleVersion');
  }

  return immutable(
    ruleId === undefined || ruleVersion === undefined
      ? { method, snapshotId, source }
      : { method, ruleId, ruleVersion, snapshotId, source },
  );
}

function validateFactValue(value: FactValue | null): FactValue | null {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      fail('fact.value must be finite');
    }
    return value;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return immutableArray(value, 'fact.value');
  }
  fail('fact.value must be a string, number, boolean, string array, or null');
}

function validateMetadata(metadata: Metadata | undefined): Metadata | undefined {
  if (metadata === undefined) {
    return undefined;
  }
  const copy: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    requiredText(key, 'fact.metadata key');
    if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) {
      fail('fact.metadata values must be strings, numbers, booleans, or null');
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      fail('fact.metadata numeric values must be finite');
    }
    copy[key] = value;
  }
  return immutable(copy);
}

export function createRepositorySnapshot(input: CreateRepositorySnapshotInput): RepositorySnapshot {
  const owner = validateRepositoryPart(input.owner, 'owner');
  const rawName = requiredText(input.name, 'name');
  const name = validateRepositoryPart(rawName.replace(/\.git$/i, ''), 'name');
  const repositoryUrl = validateRepositoryUrl(input.repositoryUrl, owner, name);
  const ref = requiredText(input.ref, 'ref');
  const commitSha = validateCommitSha(input.commitSha);
  const id = `snapshot:${owner}/${name}@${commitSha}`;
  const createdAt =
    input.createdAt === undefined
      ? new Date().toISOString()
      : validateIsoDate(input.createdAt, 'createdAt');

  return immutable({ createdAt, id, name, owner, ref, repositoryUrl, commitSha });
}

export function createProvenance(input: CreateProvenanceInput): Provenance {
  return validateProvenance(input);
}

export function createFact(input: CreateFactInput): Fact {
  const id = requiredText(input.id, 'fact.id');
  const type = enumValue(input.type, FACT_TYPES, 'fact.type');
  const key = requiredText(input.key, 'fact.key');
  const status = enumValue(input.status, OBSERVATION_STATUSES, 'fact.status');
  const value = validateFactValue(input.value);
  const provenance = validateProvenance(input.provenance);
  const metadata = validateMetadata(input.metadata);

  if (status === 'observed' && value === null) {
    fail('observed fact must have a value');
  }
  if (status !== 'observed' && value !== null) {
    fail('non-observed fact must have a null value');
  }

  return immutable(
    metadata === undefined
      ? { id, key, provenance, status, type, value }
      : { id, key, metadata, provenance, status, type, value },
  );
}

export function createMetric(input: CreateMetricInput): Metric {
  const id = requiredText(input.id, 'metric.id');
  const name = requiredText(input.name, 'metric.name');
  const status = enumValue(input.status, OBSERVATION_STATUSES, 'metric.status');
  const value = input.value;
  if (value !== null && typeof value !== 'string' && typeof value !== 'number') {
    fail('metric.value must be a string, number, or null');
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    fail('metric.value must be finite');
  }
  if (status === 'observed' && value === null) {
    fail('observed metric must have a value');
  }
  if (status !== 'observed' && value !== null) {
    fail('non-observed metric must have a null value');
  }
  const unit =
    input.unit === undefined
      ? null
      : input.unit === null
        ? null
        : requiredText(input.unit, 'metric.unit');
  const sourceFactIds = uniqueIds(input.sourceFactIds, 'metric.sourceFactIds');
  const provenance = validateProvenance(input.provenance);
  const ruleVersion = validateVersion(input.ruleVersion, 'metric.ruleVersion');

  return immutable({ id, name, provenance, ruleVersion, sourceFactIds, status, unit, value });
}

export function createEvidence(input: CreateEvidenceInput): Evidence {
  const id = requiredText(input.id, 'evidence.id');
  const snapshotId = validateSnapshotId(input.snapshotId);
  const kind = enumValue(input.kind, EVIDENCE_KINDS, 'evidence.kind');
  const location = validateLocation(input.location);
  const excerptHash =
    input.excerptHash === undefined || input.excerptHash === null
      ? null
      : requiredText(input.excerptHash, 'evidence.excerptHash');
  const redactedExcerpt =
    input.redactedExcerpt === undefined || input.redactedExcerpt === null
      ? null
      : requiredText(input.redactedExcerpt, 'evidence.redactedExcerpt');
  const sourceId = requiredText(input.sourceId, 'evidence.sourceId');

  if (location === null && kind !== 'metric' && kind !== 'metadata') {
    fail('file, config, dependency, and workflow evidence require a location');
  }
  if (
    excerptHash === null &&
    redactedExcerpt === null &&
    kind !== 'metric' &&
    kind !== 'metadata'
  ) {
    fail('source evidence requires an excerpt hash or redacted excerpt');
  }
  if (excerptHash !== null && redactedExcerpt !== null) {
    fail('evidence must use an excerpt hash or a redacted excerpt, not both');
  }

  return immutable({ excerptHash, id, kind, location, redactedExcerpt, snapshotId, sourceId });
}

export function createFinding(input: CreateFindingInput): Finding {
  const id = requiredText(input.id, 'finding.id');
  const category = enumValue(input.category, ANALYSIS_DIMENSIONS, 'finding.category');
  const severity = enumValue(input.severity, SEVERITIES, 'finding.severity');
  const title = requiredText(input.title, 'finding.title');
  const description = requiredText(input.description, 'finding.description');
  const impact = requiredText(input.impact, 'finding.impact');
  const evidenceIds = uniqueIds(input.evidenceIds, 'finding.evidenceIds', false);
  const recommendationIds = uniqueIds(input.recommendationIds ?? [], 'finding.recommendationIds');
  const confidence = enumValue(input.confidence, CONFIDENCE_BANDS, 'finding.confidence');
  const source = enumValue(input.source, ANALYSIS_SOURCES, 'finding.source');
  const ruleId =
    input.ruleId === undefined || input.ruleId === null
      ? null
      : requiredText(input.ruleId, 'finding.ruleId');
  const ruleVersion =
    input.ruleVersion === undefined || input.ruleVersion === null
      ? null
      : requiredText(input.ruleVersion, 'finding.ruleVersion');
  const provenance = validateProvenance(input.provenance);

  if ((ruleId === null) !== (ruleVersion === null)) {
    fail('finding.ruleId and finding.ruleVersion must be provided together');
  }
  if (source === 'deterministic' && (ruleId === null || ruleVersion === null)) {
    fail('deterministic finding requires ruleId and ruleVersion');
  }
  if (provenance.source !== source) {
    fail('finding source must match provenance source');
  }
  if (provenance.snapshotId.trim().length === 0) {
    fail('finding provenance must reference a snapshot');
  }

  const evidenceStatus =
    input.evidenceStatus === undefined
      ? undefined
      : enumValue(
          input.evidenceStatus,
          ['verified', 'absence_based', 'not_inspected', 'not_verified'],
          'finding.evidenceStatus',
        );

  return immutable({
    category,
    confidence,
    description,
    evidenceIds,
    ...(evidenceStatus === undefined ? {} : { evidenceStatus }),
    id,
    impact,
    provenance,
    recommendationIds,
    ruleId,
    ruleVersion,
    severity,
    source,
    title,
  });
}

export function createRecommendation(input: CreateRecommendationInput): Recommendation {
  const id = requiredText(input.id, 'recommendation.id');
  const title = requiredText(input.title, 'recommendation.title');
  const description = requiredText(input.description, 'recommendation.description');
  const priority = enumValue(input.priority, RECOMMENDATION_PRIORITIES, 'recommendation.priority');
  const findingIds = uniqueIds(input.findingIds, 'recommendation.findingIds', false);
  const source = enumValue(input.source, ANALYSIS_SOURCES, 'recommendation.source');
  const verification =
    input.verification === undefined
      ? undefined
      : requiredText(input.verification, 'recommendation.verification');

  return immutable({
    description,
    findingIds,
    id,
    priority,
    source,
    title,
    ...(verification === undefined ? {} : { verification }),
  });
}

export function createDimensionScore(input: CreateDimensionScoreInput): DimensionScore {
  const dimension = enumValue(input.dimension, ANALYSIS_DIMENSIONS, 'dimensionScore.dimension');
  if (
    input.score !== null &&
    (!Number.isFinite(input.score) || input.score < 0 || input.score > 10)
  ) {
    fail('dimensionScore.score must be null or a number between 0 and 10');
  }
  const confidence = enumValue(input.confidence, CONFIDENCE_BANDS, 'dimensionScore.confidence');
  if (!Number.isInteger(input.evidenceCount) || input.evidenceCount < 0) {
    fail('dimensionScore.evidenceCount must be a non-negative integer');
  }
  const coverage = enumValue(input.coverage, COVERAGE_VALUES, 'dimensionScore.coverage');
  const limitations = immutableArray(
    input.limitations.map((limitation) =>
      requiredText(limitation, 'dimensionScore.limitations item'),
    ),
    'dimensionScore.limitations',
  );

  if (input.score === null && coverage !== 'insufficient') {
    fail('a null dimension score requires insufficient coverage');
  }
  if (input.score !== null && coverage === 'insufficient') {
    fail('a dimension with insufficient coverage must have a null score');
  }

  return immutable({
    confidence,
    coverage,
    dimension,
    evidenceCount: input.evidenceCount,
    limitations,
    score: input.score,
  });
}

function assertUniqueEntityIds<T extends { readonly id: string }>(
  items: readonly T[],
  field: string,
): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.id)) {
      fail(`${field} must not contain duplicate IDs`);
    }
    map.set(item.id, item);
  }
  return map;
}

function assertSameSnapshot(snapshotId: string, provenance: Provenance, field: string): void {
  if (provenance.snapshotId !== snapshotId) {
    fail(`${field} must reference the result snapshot`);
  }
}

export function createAnalysisResult(input: CreateAnalysisResultInput): AnalysisResult {
  const id = requiredText(input.id, 'analysisResult.id');
  const facts = immutableArray(input.facts, 'analysisResult.facts');
  const metrics = immutableArray(input.metrics, 'analysisResult.metrics');
  const evidence = immutableArray(input.evidence, 'analysisResult.evidence');
  const findings = immutableArray(input.findings, 'analysisResult.findings');
  const recommendations = immutableArray(input.recommendations, 'analysisResult.recommendations');
  const dimensionScores = immutableArray(
    input.dimensionScores ?? [],
    'analysisResult.dimensionScores',
  );
  const confidence = enumValue(input.confidence, CONFIDENCE_BANDS, 'analysisResult.confidence');
  const coverage = enumValue(input.coverage, COVERAGE_VALUES, 'analysisResult.coverage');
  const ruleSetVersion = validateVersion(input.ruleSetVersion, 'analysisResult.ruleSetVersion');
  const analyzerVersion = validateVersion(input.analyzerVersion, 'analysisResult.analyzerVersion');
  const limitations = immutableArray(
    input.limitations.map((limitation) =>
      requiredText(limitation, 'analysisResult.limitations item'),
    ),
    'analysisResult.limitations',
  );
  const createdAt =
    input.createdAt === undefined
      ? new Date().toISOString()
      : validateIsoDate(input.createdAt, 'createdAt');
  const inspectedScope =
    input.inspectedScope === undefined ? undefined : validateInspectedScope(input.inspectedScope);
  const snapshot = createRepositorySnapshot({
    owner: input.snapshot.owner,
    name: input.snapshot.name,
    repositoryUrl: input.snapshot.repositoryUrl,
    ref: input.snapshot.ref,
    commitSha: input.snapshot.commitSha,
    createdAt: input.snapshot.createdAt,
  });
  const snapshotId = validateSnapshotId(snapshot.id);
  const factMap = assertUniqueEntityIds(facts, 'analysisResult.facts');
  const metricMap = assertUniqueEntityIds(metrics, 'analysisResult.metrics');
  const evidenceMap = assertUniqueEntityIds(evidence, 'analysisResult.evidence');
  const findingMap = assertUniqueEntityIds(findings, 'analysisResult.findings');
  const recommendationMap = assertUniqueEntityIds(
    recommendations,
    'analysisResult.recommendations',
  );
  const allEntityIds = new Set<string>();
  for (const items of [facts, metrics, evidence, findings, recommendations]) {
    for (const item of items) {
      if (allEntityIds.has(item.id)) {
        fail(`analysisResult entity IDs must be unique across collections: ${item.id}`);
      }
      allEntityIds.add(item.id);
    }
  }
  const dimensions = new Set<AnalysisDimension>();
  for (const score of dimensionScores) {
    if (dimensions.has(score.dimension)) {
      fail(`analysisResult.dimensionScores must not contain duplicate dimensions`);
    }
    dimensions.add(score.dimension);
  }

  for (const fact of facts) {
    assertSameSnapshot(snapshotId, fact.provenance, `fact ${fact.id}`);
  }
  for (const metric of metrics) {
    assertSameSnapshot(snapshotId, metric.provenance, `metric ${metric.id}`);
    for (const factId of metric.sourceFactIds) {
      if (!factMap.has(factId)) {
        fail(`metric ${metric.id} references an unknown fact ${factId}`);
      }
    }
  }
  for (const item of evidence) {
    if (item.snapshotId !== snapshotId) {
      fail(`evidence ${item.id} must reference the result snapshot`);
    }
    if (!factMap.has(item.sourceId) && !metricMap.has(item.sourceId)) {
      fail(`evidence ${item.id} references an unknown source ${item.sourceId}`);
    }
  }
  const referencedEvidenceIds = new Set<string>();
  for (const finding of findings) {
    assertSameSnapshot(snapshotId, finding.provenance, `finding ${finding.id}`);
    for (const evidenceId of finding.evidenceIds) {
      if (!evidenceMap.has(evidenceId)) {
        fail(`finding ${finding.id} references an unknown evidence ${evidenceId}`);
      }
      referencedEvidenceIds.add(evidenceId);
    }
    for (const recommendationId of finding.recommendationIds) {
      if (!recommendationMap.has(recommendationId)) {
        fail(`finding ${finding.id} references an unknown recommendation ${recommendationId}`);
      }
    }
  }
  for (const item of evidence) {
    if (!referencedEvidenceIds.has(item.id)) {
      fail(`evidence ${item.id} is not referenced by a finding`);
    }
  }
  for (const recommendation of recommendations) {
    for (const findingId of recommendation.findingIds) {
      const finding = findingMap.get(findingId);
      if (finding === undefined) {
        fail(`recommendation ${recommendation.id} references an unknown finding ${findingId}`);
      }
      if (!finding.recommendationIds.includes(recommendation.id)) {
        fail(`recommendation ${recommendation.id} is not linked back from finding ${findingId}`);
      }
    }
  }
  for (const finding of findings) {
    for (const recommendationId of finding.recommendationIds) {
      const recommendation = recommendationMap.get(recommendationId);
      if (recommendation === undefined || !recommendation.findingIds.includes(finding.id)) {
        fail(`finding ${finding.id} is not linked back from recommendation ${recommendationId}`);
      }
    }
  }
  return immutable({
    analyzerVersion,
    confidence,
    createdAt,
    coverage,
    dimensionScores,
    evidence,
    facts,
    findings,
    id,
    ...(inspectedScope === undefined ? {} : { inspectedScope }),
    limitations,
    metrics,
    recommendations,
    ruleSetVersion,
    snapshot,
  });
}
