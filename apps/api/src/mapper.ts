import type {
  AnalysisJobResponse,
  AnalysisResultResponse,
  ApiDimensionScore,
  ApiEvidence,
  ApiFact,
  ApiFinding,
  ApiMetric,
  ApiProvenance,
  ApiRecommendation,
  ApiRepositorySnapshot,
  ApiSourceRange,
} from '@ai-developer-platform/contracts';
import type {
  AnalysisJob,
  AnalysisResult,
  DimensionScore,
  Evidence,
  Fact,
  Finding,
  Metric,
  Provenance,
  Recommendation,
  RepositorySnapshot,
  SourceRange,
} from '@ai-developer-platform/domain';

function mapRange(range: SourceRange | undefined): ApiSourceRange | undefined {
  return range === undefined
    ? undefined
    : {
        end: { column: range.end.column, line: range.end.line },
        start: { column: range.start.column, line: range.start.line },
      };
}

function mapProvenance(provenance: Provenance): ApiProvenance {
  return {
    method: provenance.method,
    ...(provenance.ruleId === undefined ? {} : { ruleId: provenance.ruleId }),
    ...(provenance.ruleVersion === undefined ? {} : { ruleVersion: provenance.ruleVersion }),
    snapshotId: provenance.snapshotId,
    source: provenance.source,
  };
}

function mapSnapshot(snapshot: RepositorySnapshot): ApiRepositorySnapshot {
  return { ...snapshot };
}

function mapFact(fact: Fact): ApiFact {
  return {
    ...(fact.metadata === undefined ? {} : { metadata: { ...fact.metadata } }),
    id: fact.id,
    key: fact.key,
    provenance: mapProvenance(fact.provenance),
    status: fact.status,
    type: fact.type,
    value: fact.value,
  };
}

function mapMetric(metric: Metric): ApiMetric {
  return {
    id: metric.id,
    name: metric.name,
    provenance: mapProvenance(metric.provenance),
    ruleVersion: metric.ruleVersion,
    sourceFactIds: [...metric.sourceFactIds],
    status: metric.status,
    unit: metric.unit,
    value: metric.value,
  };
}

function mapLocation(location: Evidence['location']): ApiEvidence['location'] {
  if (location === null) {
    return null;
  }
  const range = mapRange(location.range);
  return range === undefined ? { path: location.path } : { path: location.path, range };
}

function mapEvidence(evidence: Evidence): ApiEvidence {
  return {
    excerptHash: evidence.excerptHash,
    id: evidence.id,
    kind: evidence.kind,
    location: mapLocation(evidence.location),
    redactedExcerpt: evidence.redactedExcerpt,
    snapshotId: evidence.snapshotId,
    sourceId: evidence.sourceId,
  };
}

function mapFinding(finding: Finding): ApiFinding {
  return {
    ...finding,
    evidenceIds: [...finding.evidenceIds],
    recommendationIds: [...finding.recommendationIds],
    provenance: mapProvenance(finding.provenance),
    ...(finding.evidenceStatus === undefined ? {} : { evidenceStatus: finding.evidenceStatus }),
  };
}

function mapRecommendation(recommendation: Recommendation): ApiRecommendation {
  return { ...recommendation, findingIds: [...recommendation.findingIds] };
}

function mapDimensionScore(score: DimensionScore): ApiDimensionScore {
  return { ...score, limitations: [...score.limitations] };
}

export function mapJob(job: AnalysisJob): AnalysisJobResponse {
  return {
    analyzerVersion: job.analyzerVersion,
    commitSha: job.commitSha,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
    errorCode: job.errorCode,
    id: job.id,
    requestedRef: job.requestedRef,
    repository: { name: job.repository, owner: job.owner },
    resultAvailable: job.resultId !== null,
    ruleSetVersion: job.ruleSetVersion,
    startedAt: job.startedAt,
    status: job.status,
  };
}

export function mapAnalysisResult(result: AnalysisResult): AnalysisResultResponse {
  return {
    analyzerVersion: result.analyzerVersion,
    confidence: result.confidence,
    createdAt: result.createdAt,
    dimensionScores: result.dimensionScores.map(mapDimensionScore),
    evidence: result.evidence.map(mapEvidence),
    facts: result.facts.map(mapFact),
    findings: result.findings.map(mapFinding),
    id: result.id,
    limitations: [...result.limitations],
    metrics: result.metrics.map(mapMetric),
    recommendations: result.recommendations.map(mapRecommendation),
    ruleSetVersion: result.ruleSetVersion,
    snapshot: mapSnapshot(result.snapshot),
    coverage: result.coverage,
    ...(result.inspectedScope === undefined
      ? {}
      : {
          inspectedScope: {
            fileCount: result.inspectedScope.fileCount,
            totalBytes: result.inspectedScope.totalBytes,
            treeEntriesSeen: result.inspectedScope.treeEntriesSeen,
          },
        }),
  };
}

export function mapFindings(result: AnalysisResult): readonly ApiFinding[] {
  return result.findings.map(mapFinding);
}

export function mapRecommendations(result: AnalysisResult): readonly ApiRecommendation[] {
  return result.recommendations.map(mapRecommendation);
}

export function mapFacts(result: AnalysisResult): readonly ApiFact[] {
  return result.facts.map(mapFact);
}

export function mapEvidenceItems(result: AnalysisResult): readonly ApiEvidence[] {
  return result.evidence.map(mapEvidence);
}
