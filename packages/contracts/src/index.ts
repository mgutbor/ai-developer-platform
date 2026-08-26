export interface HealthResponse {
  readonly status: 'ok';
  readonly service: 'api';
}

export type ApiObservationStatus = 'observed' | 'not_detected' | 'unknown' | 'insufficient_data';

export type ApiAnalysisSource = 'deterministic' | 'ai' | 'combined';
export type ApiFactType =
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
export type ApiEvidenceKind = 'file' | 'config' | 'metric' | 'metadata' | 'dependency' | 'workflow';
export type ApiConfidenceBand = 'low' | 'medium' | 'high';
export type ApiCoverage = 'complete' | 'partial' | 'insufficient';
export type ApiSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type ApiRecommendationPriority = 'low' | 'medium' | 'high';
export type ApiAnalysisDimension =
  | 'architecture'
  | 'maintainability'
  | 'testing'
  | 'documentation'
  | 'accessibility'
  | 'security'
  | 'dependencies'
  | 'code_quality';

export interface ApiSourcePosition {
  readonly line: number;
  readonly column: number;
}

export interface ApiSourceRange {
  readonly start: ApiSourcePosition;
  readonly end: ApiSourcePosition;
}

export interface ApiEvidenceLocation {
  readonly path: string;
  readonly range?: ApiSourceRange;
}

export interface ApiRepositorySnapshot {
  readonly id: string;
  readonly owner: string;
  readonly name: string;
  readonly repositoryUrl: string;
  readonly ref: string;
  readonly commitSha: string;
  readonly createdAt: string;
}

export interface ApiFact {
  readonly id: string;
  readonly type: ApiFactType;
  readonly key: string;
  readonly status: ApiObservationStatus;
  readonly value: string | number | boolean | readonly string[] | null;
  readonly provenance: ApiProvenance;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface ApiMetric {
  readonly id: string;
  readonly name: string;
  readonly status: ApiObservationStatus;
  readonly value: number | string | null;
  readonly unit: string | null;
  readonly sourceFactIds: readonly string[];
  readonly provenance: ApiProvenance;
  readonly ruleVersion: string;
}

export interface ApiProvenance {
  readonly source: ApiAnalysisSource;
  readonly method: string;
  readonly snapshotId: string;
  readonly ruleId?: string;
  readonly ruleVersion?: string;
}

export interface ApiEvidence {
  readonly id: string;
  readonly snapshotId: string;
  readonly kind: ApiEvidenceKind;
  readonly location: ApiEvidenceLocation | null;
  readonly excerptHash: string | null;
  readonly redactedExcerpt: string | null;
  readonly sourceId: string;
}

export interface ApiFinding {
  readonly id: string;
  readonly category: ApiAnalysisDimension;
  readonly severity: ApiSeverity;
  readonly title: string;
  readonly description: string;
  readonly impact: string;
  readonly evidenceIds: readonly string[];
  readonly recommendationIds: readonly string[];
  readonly confidence: ApiConfidenceBand;
  readonly source: ApiAnalysisSource;
  readonly ruleId: string | null;
  readonly ruleVersion: string | null;
  readonly provenance: ApiProvenance;
}

export interface ApiRecommendation {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly priority: ApiRecommendationPriority;
  readonly findingIds: readonly string[];
  readonly source: ApiAnalysisSource;
}

export interface ApiDimensionScore {
  readonly dimension: ApiAnalysisDimension;
  readonly score: number | null;
  readonly confidence: ApiConfidenceBand;
  readonly evidenceCount: number;
  readonly coverage: ApiCoverage;
  readonly limitations: readonly string[];
}

export interface AnalysisResultResponse {
  readonly id: string;
  readonly snapshot: ApiRepositorySnapshot;
  readonly facts: readonly ApiFact[];
  readonly metrics: readonly ApiMetric[];
  readonly evidence: readonly ApiEvidence[];
  readonly findings: readonly ApiFinding[];
  readonly recommendations: readonly ApiRecommendation[];
  readonly dimensionScores: readonly ApiDimensionScore[];
  readonly confidence: ApiConfidenceBand;
  readonly coverage: ApiCoverage;
  readonly ruleSetVersion: string;
  readonly analyzerVersion: string;
  readonly limitations: readonly string[];
  readonly createdAt: string;
}
