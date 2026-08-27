import {
  createAnalysisResult,
  createDimensionScore,
  type AnalysisDimension,
  type AnalysisResult,
  type ConfidenceBand,
  type Coverage,
  type DimensionScore,
  type Finding,
} from '@ai-developer-platform/domain';

export const SCORING_RULE_SET_VERSION = '0.1.0';

export interface ScoringOptions {
  readonly ruleSetVersion?: string;
}

const SCORED_DIMENSIONS: readonly AnalysisDimension[] = [
  'architecture',
  'maintainability',
  'testing',
  'documentation',
  'dependencies',
  'code_quality',
];

const SEVERITY_PENALTIES: Readonly<Record<Finding['severity'], number>> = Object.freeze({
  info: 0.25,
  low: 0.5,
  medium: 1,
  high: 2,
  critical: 3,
});

function clamp(value: number): number {
  return Math.max(0, Math.min(10, value));
}

const DIMENSION_SIGNAL_KEYS: Readonly<Record<AnalysisDimension, readonly string[]>> = Object.freeze(
  {
    accessibility: ['accessibility_tooling'],
    architecture: ['source_file_count', 'import_count'],
    code_quality: ['source_file_count', 'typescript_strict'],
    dependencies: ['dependency_count'],
    documentation: ['documentation_file_count', 'readme_present'],
    maintainability: ['source_file_count', 'max_source_file_size'],
    security: ['security_tooling'],
    testing: ['test_file_count', 'test_tooling'],
  },
);

function scoreForFindings(result: AnalysisResult, dimension: AnalysisDimension): DimensionScore {
  const relevant = result.findings.filter((finding) => finding.category === dimension);
  const availableFacts = new Map(result.facts.map((fact) => [fact.key, fact]));
  const requiredKeys = DIMENSION_SIGNAL_KEYS[dimension];
  const hasObservedSignal = requiredKeys.some(
    (key) => availableFacts.get(key)?.status === 'observed',
  );
  if (!hasObservedSignal) {
    return createDimensionScore({
      confidence: 'low',
      coverage: 'insufficient',
      dimension,
      evidenceCount: relevant.reduce((total, finding) => total + finding.evidenceIds.length, 0),
      limitations: ['Insufficient deterministic signals were available for this dimension.'],
      score: null,
    });
  }
  const penalty = relevant.reduce(
    (total, finding) => total + SEVERITY_PENALTIES[finding.severity],
    0,
  );
  const limitations = [
    ...(result.coverage !== 'complete'
      ? [
          'Snapshot coverage is partial; this score does not represent a complete repository evaluation.',
        ]
      : []),
    ...(relevant.length === 0
      ? [
          'Score is based on available deterministic signals; absence of findings is not proof of quality.',
        ]
      : ['Score reflects only deterministic findings in this result.']),
  ];
  const score = clamp(10 - penalty);
  const confidence: ConfidenceBand = relevant.some((finding) => finding.confidence === 'low')
    ? 'low'
    : 'high';
  const coverage: Coverage = result.coverage === 'complete' ? 'complete' : 'partial';
  return createDimensionScore({
    confidence,
    coverage,
    dimension,
    evidenceCount: relevant.reduce((total, finding) => total + finding.evidenceIds.length, 0),
    limitations,
    score,
  });
}

export function scoreAnalysis(
  result: AnalysisResult,
  options: ScoringOptions = {},
): AnalysisResult {
  const ruleSetVersion = options.ruleSetVersion ?? SCORING_RULE_SET_VERSION;
  if (ruleSetVersion.trim().length === 0) {
    throw new TypeError('ruleSetVersion must be non-empty');
  }
  const dimensionScores = SCORED_DIMENSIONS.map((dimension) => scoreForFindings(result, dimension));
  return createAnalysisResult({
    analyzerVersion: result.analyzerVersion,
    confidence: result.confidence,
    coverage: result.coverage,
    createdAt: result.createdAt,
    dimensionScores,
    evidence: result.evidence,
    facts: result.facts,
    findings: result.findings,
    id: result.id,
    limitations: [
      ...result.limitations,
      'Global score is intentionally not calculated in the MVP.',
    ].filter((limitation, index, values) => values.indexOf(limitation) === index),
    metrics: result.metrics,
    recommendations: result.recommendations,
    ruleSetVersion,
    snapshot: result.snapshot,
    ...(result.inspectedScope === undefined ? {} : { inspectedScope: result.inspectedScope }),
  });
}

export function scoreDimensions(result: AnalysisResult): readonly DimensionScore[] {
  return Object.freeze(SCORED_DIMENSIONS.map((dimension) => scoreForFindings(result, dimension)));
}
