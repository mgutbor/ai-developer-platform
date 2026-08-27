export interface HealthResponse {
  readonly status: 'ok';
  readonly service: 'api';
}

export interface AnalysisRequest {
  readonly repositoryUrl: string;
  readonly ref?: string;
}

export type AnalysisJobStatus =
  'queued' | 'running' | 'completed' | 'completed_with_limitations' | 'failed' | 'cancelled';

export interface AnalysisJobResponse {
  readonly id: string;
  readonly status: AnalysisJobStatus;
  readonly repository: {
    readonly owner: string;
    readonly name: string;
  };
  readonly requestedRef: string;
  readonly commitSha: string | null;
  readonly analyzerVersion: string;
  readonly ruleSetVersion: string;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly errorCode: string | null;
  readonly resultAvailable: boolean;
}

export interface ApiErrorResponse {
  readonly status: 'error';
  readonly code: string;
  readonly message: string;
}

export interface AnalysisCreatedResponse {
  readonly id: string;
  readonly status: AnalysisJobStatus;
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
export type ApiFindingEvidenceStatus =
  'verified' | 'absence_based' | 'not_inspected' | 'not_verified';
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

export interface ApiInspectedScope {
  readonly fileCount: number;
  readonly treeEntriesSeen: number;
  readonly totalBytes: number;
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
  /** Semantic nature of the finding's evidence (verified / absence-based / not inspected / not verified). */
  readonly evidenceStatus?: ApiFindingEvidenceStatus;
}

export interface ApiRecommendation {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly priority: ApiRecommendationPriority;
  readonly findingIds: readonly string[];
  readonly source: ApiAnalysisSource;
  /** Deterministic guidance on how the developer can verify the recommended action. */
  readonly verification?: string;
}

export interface ApiDimensionScore {
  readonly dimension: ApiAnalysisDimension;
  readonly score: number | null;
  readonly confidence: ApiConfidenceBand;
  readonly evidenceCount: number;
  readonly coverage: ApiCoverage;
  readonly limitations: readonly string[];
}

export type AiInterpretationStatus = 'completed' | 'failed' | 'unavailable';

export interface AiInsightResponse {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly severity: ApiSeverity;
  readonly findingIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly recommendationIds: readonly string[];
}

export interface AiPriorityResponse {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly findingIds: readonly string[];
  readonly recommendationIds: readonly string[];
}

export interface AiInterpretationResponse {
  readonly status: AiInterpretationStatus;
  readonly summary: string | null;
  readonly keyInsights: readonly AiInsightResponse[];
  readonly priorities: readonly AiPriorityResponse[];
  readonly limitations: readonly string[];
  readonly evidenceReferences: readonly string[];
  readonly provider: string | null;
  readonly model: string | null;
  readonly promptVersion: string | null;
  readonly contextVersion: string | null;
  readonly generatedAt: string | null;
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
  /** What portion of the repository was actually inspected. Optional for backward compatibility. */
  readonly inspectedScope?: ApiInspectedScope;
}
