/**
 * Phase 13 — Real-world product validation runner.
 *
 * Uses only the existing ingestion/analyzer/scoring mechanism against real
 * public GitHub repositories. It never executes, installs or builds anything
 * from the analyzed repositories.
 *
 * The file cap and request cap are reduced from the API defaults so the
 * benchmark fits within the unauthenticated GitHub rate limit (60 req/h).
 *
 * Run with:
 *   pnpm --filter @ai-developer-platform/api exec tsx src/validate-real-repos.ts
 * Optional positional args filter the dataset, e.g.:
 *   pnpm --filter @ai-developer-platform/api exec tsx src/validate-real-repos.ts facebook/react
 */
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import {
  GitHubRestClient,
  ingestRepository,
  type IngestionResult,
} from '@ai-developer-platform/github';
import { analyze } from '@ai-developer-platform/analyzer';
import { scoreAnalysis } from '@ai-developer-platform/scoring';
import type { AnalysisResult } from '@ai-developer-platform/domain';

const DATASET: readonly { readonly owner: string; readonly repo: string; readonly note: string }[] =
  Object.freeze([
    { owner: 'octocat', repo: 'Hello-World', note: 'tiny baseline, no tests' },
    { owner: 'sindresorhus', repo: 'type-fest', note: 'clean TypeScript, tests' },
    { owner: 'expressjs', repo: 'express', note: 'JavaScript/Node.js, tests, CI' },
    { owner: 'angular', repo: 'angular', note: 'large TypeScript, Angular' },
    { owner: 'facebook', repo: 'react', note: 'large JavaScript, React' },
  ]);

const LIMITS = Object.freeze({
  maxFileCount: 10,
  maxTotalBytes: 1024 * 1024,
  maxApiRequests: 14,
});

const KEY_FACTS = Object.freeze([
  'readme_present',
  'package_json_present',
  'lockfile_present',
  'test_tooling',
  'lint_tooling',
  'formatting_tooling',
  'typescript_config_present',
  'typescript_strict',
  'framework_detected',
  'ci_workflow_present',
  'test_file_count',
]);

interface RepoResult {
  readonly owner: string;
  readonly repo: string;
  readonly note: string;
  readonly status: 'ok' | 'failed';
  readonly errorCategory: string | null;
  readonly commitSha: string | null;
  readonly sizeKb: number | null;
  readonly selectedFiles: readonly string[];
  readonly selectedFileCount: number | null;
  readonly totalBytes: number | null;
  readonly treeEntriesSeen: number | null;
  readonly treeTruncated: boolean | null;
  readonly coverage: string | null;
  readonly jobStatus: string | null;
  readonly limitations: readonly string[];
  readonly keyFacts: Readonly<Record<string, { status: string; value: unknown }>>;
  readonly findings: readonly {
    readonly ruleId: string | null;
    readonly severity: string;
    readonly category: string;
    readonly confidence: string;
    readonly title: string;
    readonly evidencePaths: readonly string[];
  }[];
  readonly dimensionScores: readonly {
    readonly dimension: string;
    readonly score: number | null;
    readonly coverage: string;
  }[];
  readonly durationsMs: {
    readonly ingestion: number;
    readonly analyzer: number;
    readonly scoring: number;
    readonly total: number;
  };
}

function categorize(result: AnalysisResult, ingestion: IngestionResult): string {
  if (ingestion.limitations.length > 0 || result.coverage !== 'complete') {
    return 'completed_with_limitations';
  }
  return 'completed';
}

function evidencePathsFor(
  result: AnalysisResult,
  evidenceIds: readonly string[],
): readonly string[] {
  const byId = new Map(result.evidence.map((evidence) => [evidence.id, evidence]));
  return Object.freeze(
    evidenceIds
      .map((id) => byId.get(id)?.location?.path)
      .filter((path): path is string => path !== undefined)
      .sort((left, right) => left.localeCompare(right)),
  );
}

function keyFactsOf(
  result: AnalysisResult,
): Readonly<Record<string, { status: string; value: unknown }>> {
  const record: Record<string, { status: string; value: unknown }> = {};
  for (const fact of result.facts) {
    if (KEY_FACTS.includes(fact.key)) {
      record[fact.key] = { status: fact.status, value: fact.value };
    }
  }
  return Object.freeze(record);
}

function snapshotResult(
  owner: string,
  repo: string,
  note: string,
  startedAt: number,
  ingestion: IngestionResult,
  scored: AnalysisResult,
  phaseTimings: { ingestion: number; analyzer: number; scoring: number },
): RepoResult {
  const total = performance.now() - startedAt;
  return Object.freeze({
    commitSha: ingestion.snapshot.commitSha,
    coverage: scored.coverage,
    dimensionScores: Object.freeze(
      scored.dimensionScores.map((score) =>
        Object.freeze({
          coverage: score.coverage,
          dimension: score.dimension,
          score: score.score,
        }),
      ),
    ),
    durationsMs: Object.freeze({ ...phaseTimings, total }),
    errorCategory: null,
    findings: Object.freeze(
      scored.findings.map((finding) =>
        Object.freeze({
          category: finding.category,
          confidence: finding.confidence,
          evidencePaths: evidencePathsFor(scored, finding.evidenceIds),
          ruleId: finding.ruleId,
          severity: finding.severity,
          title: finding.title,
        }),
      ),
    ),
    jobStatus: categorize(scored, ingestion),
    keyFacts: keyFactsOf(scored),
    limitations: Object.freeze([...ingestion.limitations, ...scored.limitations]),
    note,
    owner,
    repo,
    selectedFileCount: ingestion.metadata.selectedFileCount,
    selectedFiles: Object.freeze(
      ingestion.files.map((file) => file.path).sort((a, b) => a.localeCompare(b)),
    ),
    sizeKb: (ingestion.metadata as { repository?: { sizeKb?: number } }).repository?.sizeKb ?? null,
    status: 'ok',
    totalBytes: ingestion.metadata.totalBytes,
    treeEntriesSeen: ingestion.metadata.treeEntriesSeen,
    treeTruncated: ingestion.metadata.treeTruncated,
  });
}

function failedResult(
  owner: string,
  repo: string,
  note: string,
  errorCategory: string,
): RepoResult {
  return Object.freeze({
    commitSha: null,
    coverage: null,
    dimensionScores: Object.freeze([]),
    durationsMs: Object.freeze({ analyzer: 0, ingestion: 0, scoring: 0, total: 0 }),
    errorCategory,
    findings: Object.freeze([]),
    jobStatus: 'failed',
    keyFacts: Object.freeze({}),
    limitations: Object.freeze([]),
    note,
    owner,
    repo,
    selectedFileCount: null,
    selectedFiles: Object.freeze([]),
    sizeKb: null,
    status: 'failed',
    totalBytes: null,
    treeEntriesSeen: null,
    treeTruncated: null,
  });
}

function errorCategoryOf(error: unknown): string {
  if (error !== null && typeof error === 'object' && 'category' in error) {
    return String(error.category);
  }
  if (error instanceof Error) {
    return error.name;
  }
  return 'unknown';
}

const filter = process.argv.slice(2);
const dataset = DATASET.filter((entry) =>
  filter.length === 0
    ? true
    : filter.some((candidate) => `${entry.owner}/${entry.repo}` === candidate),
);

const client = new GitHubRestClient();
const results: RepoResult[] = [];

for (const entry of dataset) {
  const url = `https://github.com/${entry.owner}/${entry.repo}`;
  const startedAt = performance.now();
  process.stdout.write(`\nAnalyzing ${url} ...\n`);
  try {
    const ingestionStart = performance.now();
    const ingestion = await ingestRepository(url, client, { limits: LIMITS });
    const ingestionDone = performance.now();
    const analyzed = analyze(ingestion);
    const analyzerDone = performance.now();
    const scored = scoreAnalysis(analyzed);
    const scoringDone = performance.now();
    results.push(
      snapshotResult(entry.owner, entry.repo, entry.note, startedAt, ingestion, scored, {
        analyzer: analyzerDone - ingestionDone,
        ingestion: ingestionDone - ingestionStart,
        scoring: scoringDone - analyzerDone,
      }),
    );
    process.stdout.write(
      `  ok: ${scored.snapshot.commitSha} · files=${ingestion.metadata.selectedFileCount} · findings=${scored.findings.length} · coverage=${scored.coverage}\n`,
    );
  } catch (error) {
    const category = errorCategoryOf(error);
    results.push(failedResult(entry.owner, entry.repo, entry.note, category));
    process.stdout.write(`  failed: ${category}\n`);
  }
}

const summary = Object.freeze({
  analyzerVersion: 'deterministic analyzer v1.0.0',
  createdAt: new Date().toISOString(),
  limits: LIMITS,
  results: Object.freeze(results),
});

writeFileSync('/tmp/phase13-results.json', JSON.stringify(summary, null, 2));
process.stdout.write('\nBenchmark written to /tmp/phase13-results.json\n');
