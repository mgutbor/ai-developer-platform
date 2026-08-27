import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DomainValidationError,
  createAnalysisResult,
  createDimensionScore,
  createEvidence,
  createFact,
  createFinding,
  createMetric,
  createProvenance,
  createRecommendation,
  createRepositorySnapshot,
  type Evidence,
  type Fact,
  type Finding,
  type Metric,
  type Recommendation,
} from './index.js';

const snapshot = createRepositorySnapshot({
  owner: 'Example-Org',
  name: 'Health-Report.git',
  repositoryUrl: 'https://github.com/example-org/health-report/',
  ref: 'main',
  commitSha: 'abcdef1234567890abcdef1234567890abcdef12',
  createdAt: '2026-08-26T10:00:00.000Z',
});

const provenance = createProvenance({
  source: 'deterministic',
  method: 'test-fixture',
  snapshotId: snapshot.id,
  ruleId: 'test.rule',
  ruleVersion: '0.1.0',
});

function createFixtureResult(
  overrides: Partial<{
    evidence: readonly Evidence[];
    facts: readonly Fact[];
    findings: readonly Finding[];
    metrics: readonly Metric[];
    recommendations: readonly Recommendation[];
  }> = {},
) {
  const fact = createFact({
    id: 'fact:readme',
    type: 'documentation',
    key: 'readme_exists',
    status: 'observed',
    value: true,
    provenance,
  });
  const metric = createMetric({
    id: 'metric:documentation-count',
    name: 'documentation_file_count',
    status: 'observed',
    value: 1,
    unit: 'file',
    sourceFactIds: [fact.id],
    provenance,
    ruleVersion: '0.1.0',
  });
  const evidence = createEvidence({
    id: 'evidence:readme',
    snapshotId: snapshot.id,
    kind: 'file',
    location: {
      path: 'README.md',
      range: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } },
    },
    redactedExcerpt: '# Health',
    sourceId: fact.id,
  });
  const recommendation = createRecommendation({
    id: 'recommendation:docs',
    title: 'Improve documentation coverage',
    description: 'Document the project setup and supported workflows.',
    priority: 'medium',
    findingIds: ['finding:docs'],
    source: 'deterministic',
  });
  const finding = createFinding({
    id: 'finding:docs',
    category: 'documentation',
    severity: 'low',
    title: 'Documentation is incomplete',
    description: 'The repository has limited documentation coverage.',
    impact: 'New contributors may need more time to understand the project.',
    evidenceIds: [evidence.id],
    recommendationIds: [recommendation.id],
    confidence: 'high',
    source: 'deterministic',
    ruleId: 'documentation.coverage',
    ruleVersion: '0.1.0',
    provenance,
  });

  return createAnalysisResult({
    id: 'analysis:fixture',
    snapshot,
    facts: overrides.facts ?? [fact],
    metrics: overrides.metrics ?? [metric],
    evidence: overrides.evidence ?? [evidence],
    findings: overrides.findings ?? [finding],
    recommendations: overrides.recommendations ?? [recommendation],
    dimensionScores: [
      createDimensionScore({
        dimension: 'documentation',
        score: 7,
        confidence: 'high',
        evidenceCount: 1,
        coverage: 'complete',
        limitations: [],
      }),
    ],
    confidence: 'high',
    coverage: 'complete',
    ruleSetVersion: '0.1.0',
    analyzerVersion: '0.1.0',
    limitations: [],
    createdAt: '2026-08-26T10:01:00.000Z',
  });
}

function assertDomainError(action: () => unknown, message: string): void {
  assert.throws(action, (error: unknown) => error instanceof DomainValidationError, message);
}

describe('RepositorySnapshot', () => {
  it('normalizes the canonical public GitHub identity and derives a stable ID', () => {
    assert.equal(snapshot.owner, 'example-org');
    assert.equal(snapshot.name, 'health-report');
    assert.equal(snapshot.repositoryUrl, 'https://github.com/example-org/health-report');
    assert.equal(snapshot.commitSha, 'abcdef1234567890abcdef1234567890abcdef12');
    assert.equal(
      snapshot.id,
      'snapshot:example-org/health-report@abcdef1234567890abcdef1234567890abcdef12',
    );
  });

  it('rejects missing identity, revision, and non-canonical repository URLs', () => {
    assertDomainError(() => createRepositorySnapshot({ ...snapshot, owner: '' }), 'missing owner');
    assertDomainError(
      () => createRepositorySnapshot({ ...snapshot, name: '' }),
      'missing repository name',
    );
    assertDomainError(
      () => createRepositorySnapshot({ ...snapshot, commitSha: '' }),
      'missing commit SHA',
    );
    assertDomainError(
      () =>
        createRepositorySnapshot({
          ...snapshot,
          commitSha: 'abcdef1234567890',
        }),
      'abbreviated commit SHA',
    );
    assertDomainError(
      () =>
        createRepositorySnapshot({
          ...snapshot,
          repositoryUrl: 'http://github.com/example-org/health-report',
        }),
      'non-HTTPS GitHub URL',
    );
    assertDomainError(
      () =>
        createRepositorySnapshot({
          ...snapshot,
          repositoryUrl: 'https://github.com/example-org/other',
        }),
      'URL does not match identity',
    );
  });

  it('does not expose writable state at runtime', () => {
    assert.equal(Object.isFrozen(snapshot), true);
    assert.throws(() => {
      (snapshot as { owner: string }).owner = 'changed';
    }, TypeError);
    assert.equal(Object.isFrozen(provenance), true);
  });
});

describe('Fact and Metric', () => {
  it('preserve observation status and provenance', () => {
    const fact = createFact({
      id: 'fact:typescript-count',
      type: 'file_count',
      key: 'typescript_file_count',
      status: 'observed',
      value: 42,
      provenance,
      metadata: { source: 'tree', generated: false },
    });
    const metric = createMetric({
      id: 'metric:test-ratio',
      name: 'test_file_ratio',
      status: 'observed',
      value: 0.18,
      unit: 'ratio',
      sourceFactIds: [fact.id],
      provenance,
      ruleVersion: '0.1.0',
    });

    assert.equal(fact.value, 42);
    assert.equal(fact.provenance.snapshotId, snapshot.id);
    assert.equal(metric.value, 0.18);
    assert.equal(metric.ruleVersion, '0.1.0');
  });

  it('represents unknown and insufficient data without converting either to false or zero', () => {
    const unknownFact = createFact({
      id: 'fact:coverage',
      type: 'test',
      key: 'coverage',
      status: 'unknown',
      value: null,
      provenance,
    });
    const insufficientMetric = createMetric({
      id: 'metric:test-ratio',
      name: 'test_file_ratio',
      status: 'insufficient_data',
      value: null,
      sourceFactIds: [],
      provenance,
      ruleVersion: '0.1.0',
    });

    assert.equal(unknownFact.value, null);
    assert.equal(unknownFact.status, 'unknown');
    assert.equal(insufficientMetric.value, null);
    assert.equal(insufficientMetric.status, 'insufficient_data');
  });

  it('rejects values that contradict observation status', () => {
    assertDomainError(
      () =>
        createFact({
          id: 'fact:invalid',
          type: 'test',
          key: 'x',
          status: 'unknown',
          value: false,
          provenance,
        }),
      'unknown fact with a value',
    );
    assertDomainError(
      () =>
        createMetric({
          id: 'metric:invalid',
          name: 'x',
          status: 'observed',
          value: null,
          sourceFactIds: [],
          provenance,
          ruleVersion: '0.1.0',
        }),
      'observed metric without a value',
    );
    assertDomainError(
      () =>
        createFact({
          id: 'fact:nan',
          type: 'file_count',
          key: 'count',
          status: 'observed',
          value: Number.NaN,
          provenance,
        }),
      'non-finite fact value',
    );
  });
});

describe('Evidence', () => {
  it('requires snapshot-scoped, relative, minimized source evidence', () => {
    const evidence = createEvidence({
      id: 'evidence:package',
      snapshotId: snapshot.id,
      kind: 'config',
      location: { path: 'package.json' },
      excerptHash: 'sha256:abc',
      sourceId: 'fact:package',
    });
    assert.equal(evidence.location?.path, 'package.json');
    assert.equal(evidence.snapshotId, snapshot.id);
  });

  it('rejects absolute paths, traversal, invalid ranges, and unminimized evidence', () => {
    const base = {
      id: 'evidence:x',
      snapshotId: snapshot.id,
      kind: 'file' as const,
      location: { path: 'src/app.ts' },
      sourceId: 'fact:x',
    };
    assertDomainError(
      () => createEvidence({ ...base, location: { path: '/etc/passwd' }, excerptHash: 'hash' }),
      'absolute path',
    );
    assertDomainError(
      () => createEvidence({ ...base, location: { path: '../secret' }, excerptHash: 'hash' }),
      'path traversal',
    );
    assertDomainError(
      () =>
        createEvidence({
          ...base,
          location: {
            path: 'src/app.ts',
            range: { start: { line: 3, column: 1 }, end: { line: 2, column: 1 } },
          },
          excerptHash: 'hash',
        }),
      'backwards range',
    );
    assertDomainError(
      () => createEvidence({ ...base, location: { path: './src/app.ts' }, excerptHash: 'hash' }),
      'non-normalized dot segment',
    );
    assertDomainError(
      () => createEvidence({ ...base, location: { path: 'C:src/app.ts' }, excerptHash: 'hash' }),
      'drive-relative path',
    );
    assertDomainError(
      () => createEvidence({ ...base, location: { path: 'src/app.ts' } }),
      'missing excerpt',
    );
    assertDomainError(
      () =>
        createEvidence({
          ...base,
          location: { path: 'src/app.ts' },
          excerptHash: 'hash',
          redactedExcerpt: 'text',
        }),
      'both excerpt representations',
    );
  });
});

describe('Finding and Recommendation', () => {
  it('requires controlled values, evidence, and matching deterministic provenance', () => {
    const finding = createFinding({
      id: 'finding:valid',
      category: 'testing',
      severity: 'medium',
      title: 'Tests are not configured',
      description: 'No test configuration was detected.',
      impact: 'Regression risk is harder to control.',
      evidenceIds: ['evidence:test'],
      confidence: 'medium',
      source: 'deterministic',
      ruleId: 'testing.configuration',
      ruleVersion: '0.1.0',
      provenance,
    });
    assert.equal(finding.severity, 'medium');
    assert.equal(finding.evidenceStatus, undefined);

    assertDomainError(
      () => createFinding({ ...finding, evidenceStatus: 'invalid' as never }),
      'invalid evidenceStatus',
    );
    assertDomainError(
      () => createFinding({ ...finding, severity: 'invalid' as never }),
      'invalid severity',
    );
    assertDomainError(
      () => createFinding({ ...finding, evidenceIds: [] }),
      'finding without evidence',
    );
    assertDomainError(
      () => createFinding({ ...finding, provenance: { ...provenance, source: 'ai' } }),
      'source mismatch',
    );

    const absenceFinding = createFinding({
      ...finding,
      evidenceStatus: 'absence_based',
    });
    assert.equal(absenceFinding.evidenceStatus, 'absence_based');

    const recommendation = createRecommendation({
      id: 'recommendation:valid',
      title: 'Add test configuration',
      description: 'Add a documented test command and configuration.',
      priority: 'high',
      findingIds: [finding.id],
      source: 'deterministic',
    });
    assert.equal(recommendation.priority, 'high');
    assertDomainError(
      () => createRecommendation({ ...recommendation, findingIds: [] }),
      'recommendation without findings',
    );

    // Verification guidance is optional (backward compatibility) and validated when set.
    assert.equal(recommendation.verification, undefined);
    const withVerification = createRecommendation({
      ...recommendation,
      verification: 'Re-run the analysis to confirm the test configuration is detected.',
    });
    assert.equal(
      withVerification.verification,
      'Re-run the analysis to confirm the test configuration is detected.',
    );
    assertDomainError(
      () => createRecommendation({ ...recommendation, verification: '   ' }),
      'verification',
    );
  });
});

describe('AnalysisResult', () => {
  it('accepts a complete result and keeps a nullable dimension score explicit', () => {
    const result = createFixtureResult();
    const insufficientScore = createDimensionScore({
      dimension: 'security',
      score: null,
      confidence: 'low',
      evidenceCount: 0,
      coverage: 'insufficient',
      limitations: ['No security tooling was detected.'],
    });

    assert.equal(result.findings[0]?.evidenceIds[0], 'evidence:readme');
    assert.equal(insufficientScore.score, null);
    assert.equal(insufficientScore.coverage, 'insufficient');
    assert.equal(result.analyzerVersion, '0.1.0');
    assert.equal(result.ruleSetVersion, '0.1.0');
    assert.equal(Object.isFrozen(result.findings), true);
    assert.equal(Object.isFrozen(result.findings[0]!.provenance), true);
  });

  it('rejects orphan references, cross-snapshot provenance, and non-reciprocal relationships', () => {
    const result = createFixtureResult();
    assertDomainError(
      () =>
        createAnalysisResult({
          ...result,
          findings: [{ ...result.findings[0]!, evidenceIds: ['missing'] }],
        }),
      'unknown evidence reference',
    );
    assertDomainError(
      () =>
        createAnalysisResult({
          ...result,
          recommendations: [{ ...result.recommendations[0]!, findingIds: [] }],
        }),
      'orphan recommendation relationship',
    );
    assertDomainError(
      () =>
        createAnalysisResult({
          ...result,
          facts: [{ ...result.facts[0]!, provenance: { ...provenance, snapshotId: 'other' } }],
        }),
      'cross-snapshot fact',
    );
    assertDomainError(
      () =>
        createAnalysisResult({
          ...result,
          evidence: [
            ...result.evidence,
            {
              ...result.evidence[0]!,
              id: 'evidence:orphan',
              sourceId: result.metrics[0]!.id,
            },
          ],
        }),
      'orphan evidence',
    );
  });

  it('rejects invalid score states and duplicate IDs', () => {
    assertDomainError(
      () =>
        createDimensionScore({
          dimension: 'testing',
          score: null,
          confidence: 'low',
          evidenceCount: 0,
          coverage: 'partial',
          limitations: [],
        }),
      'null score with partial coverage',
    );
    const result = createFixtureResult();
    assertDomainError(
      () => createAnalysisResult({ ...result, facts: [result.facts[0]!, result.facts[0]!] }),
      'duplicate fact ID',
    );
    assertDomainError(
      () =>
        createAnalysisResult({
          ...result,
          metrics: [{ ...result.metrics[0]!, id: result.facts[0]!.id }],
        }),
      'cross-collection duplicate ID',
    );

    const suppliedSnapshot = { ...snapshot };
    const normalizedResult = createAnalysisResult({ ...result, snapshot: suppliedSnapshot });
    suppliedSnapshot.owner = 'mutated';
    assert.equal(normalizedResult.snapshot.owner, 'example-org');
    assert.equal(Object.isFrozen(normalizedResult.snapshot), true);
  });
});
