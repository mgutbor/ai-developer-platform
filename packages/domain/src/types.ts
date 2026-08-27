export type ObservationStatus = 'observed' | 'not_detected' | 'unknown' | 'insufficient_data';

export type AnalysisSource = 'deterministic' | 'ai' | 'combined';

export type ConfidenceBand = 'low' | 'medium' | 'high';

export type Coverage = 'complete' | 'partial' | 'insufficient';

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type RecommendationPriority = 'low' | 'medium' | 'high';

export type AnalysisDimension =
  | 'architecture'
  | 'maintainability'
  | 'testing'
  | 'documentation'
  | 'accessibility'
  | 'security'
  | 'dependencies'
  | 'code_quality';

export type FactType =
  | 'language'
  | 'framework'
  | 'package_manager'
  | 'file_count'
  | 'configuration'
  | 'dependency'
  | 'test'
  | 'documentation'
  | 'ci'
  | 'tooling'
  | 'security'
  | 'accessibility';

export type EvidenceKind = 'file' | 'config' | 'metric' | 'metadata' | 'dependency' | 'workflow';

/**
 * Semantic nature of a finding's evidence, oriented to the developer:
 *
 * - `verified`        — concrete evidence of presence is available (a path/location was observed).
 * - `absence_based`   — an element was not detected *within the inspected scope*; this does NOT
 *                       prove absence in the whole repository.
 * - `not_inspected`   — there is not enough information to claim absence; the relevant files were
 *                       not acquired in the snapshot.
 * - `not_verified`    — the finding is based on an inspection that could not be verified with the
 *                       available data (e.g. heuristic resolution); it must not be read as proven.
 */
export type FindingEvidenceStatus = 'verified' | 'absence_based' | 'not_inspected' | 'not_verified';

export interface InspectedScope {
  /** Files whose content was actually acquired and inspected. */
  readonly fileCount: number;
  /** Tree entries seen during acquisition (approximate repository coverage). */
  readonly treeEntriesSeen: number;
  /** Total bytes of inspected file content. */
  readonly totalBytes: number;
}

export type FactValue = string | number | boolean | readonly string[];

export type MetadataValue = string | number | boolean | null;
export type Metadata = Readonly<Record<string, MetadataValue>>;

export interface SourcePosition {
  readonly line: number;
  readonly column: number;
}

export interface SourceRange {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

export interface Provenance {
  readonly source: AnalysisSource;
  readonly method: string;
  readonly snapshotId: string;
  readonly ruleId?: string;
  readonly ruleVersion?: string;
}

export interface RepositorySnapshot {
  readonly id: string;
  readonly owner: string;
  readonly name: string;
  readonly repositoryUrl: string;
  readonly ref: string;
  readonly commitSha: string;
  readonly createdAt: string;
}

export interface Fact {
  readonly id: string;
  readonly type: FactType;
  readonly key: string;
  readonly status: ObservationStatus;
  readonly value: FactValue | null;
  readonly provenance: Provenance;
  readonly metadata?: Metadata;
}

export interface Metric {
  readonly id: string;
  readonly name: string;
  readonly status: ObservationStatus;
  readonly value: number | string | null;
  readonly unit: string | null;
  readonly sourceFactIds: readonly string[];
  readonly provenance: Provenance;
  readonly ruleVersion: string;
}

export interface EvidenceLocation {
  readonly path: string;
  readonly range?: SourceRange;
}

export interface Evidence {
  readonly id: string;
  readonly snapshotId: string;
  readonly kind: EvidenceKind;
  readonly location: EvidenceLocation | null;
  readonly excerptHash: string | null;
  readonly redactedExcerpt: string | null;
  readonly sourceId: string;
}

export interface Finding {
  readonly id: string;
  readonly category: AnalysisDimension;
  readonly severity: Severity;
  readonly title: string;
  readonly description: string;
  readonly impact: string;
  readonly evidenceIds: readonly string[];
  readonly recommendationIds: readonly string[];
  readonly confidence: ConfidenceBand;
  readonly source: AnalysisSource;
  readonly ruleId: string | null;
  readonly ruleVersion: string | null;
  readonly provenance: Provenance;
  /**
   * Semantic nature of the finding's evidence. Optional to preserve compatibility
   * with previously persisted results; the analyzer always sets it explicitly.
   */
  readonly evidenceStatus?: FindingEvidenceStatus;
}

export interface Recommendation {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly priority: RecommendationPriority;
  readonly findingIds: readonly string[];
  readonly source: AnalysisSource;
}

export interface DimensionScore {
  readonly dimension: AnalysisDimension;
  readonly score: number | null;
  readonly confidence: ConfidenceBand;
  readonly evidenceCount: number;
  readonly coverage: Coverage;
  readonly limitations: readonly string[];
}

export interface AnalysisResult {
  readonly id: string;
  readonly snapshot: RepositorySnapshot;
  readonly facts: readonly Fact[];
  readonly metrics: readonly Metric[];
  readonly evidence: readonly Evidence[];
  readonly findings: readonly Finding[];
  readonly recommendations: readonly Recommendation[];
  readonly dimensionScores: readonly DimensionScore[];
  readonly confidence: ConfidenceBand;
  readonly coverage: Coverage;
  readonly ruleSetVersion: string;
  readonly analyzerVersion: string;
  readonly limitations: readonly string[];
  readonly createdAt: string;
  /** What portion of the repository was actually inspected. Optional for backward compatibility. */
  readonly inspectedScope?: InspectedScope;
}
