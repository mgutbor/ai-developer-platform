/**
 * Phase 20 — Authenticated real-world benchmark runner.
 *
 * This runner only reads public GitHub API snapshots. It never clones,
 * installs, builds, tests, or executes code from analyzed repositories.
 * Credentials are read from the process environment and are never emitted.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import {
  GitHubRestClient,
  ingestRepository,
  type IngestionResult,
} from '@ai-developer-platform/github';
import { analyze } from '@ai-developer-platform/analyzer';
import { scoreAnalysis } from '@ai-developer-platform/scoring';
import type { AnalysisResult } from '@ai-developer-platform/domain';

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
if (token === undefined || token.trim().length === 0) {
  process.stdout.write('BENCHMARK BLOCKED — GITHUB_TOKEN/GH_TOKEN required\n');
  process.exit(1);
}

const DATASET = Object.freeze([
  ['octocat', 'Hello-World', 'tiny, no package manifest'],
  ['sindresorhus', 'type-fest', 'TypeScript, tests, CI'],
  ['expressjs', 'express', 'JavaScript, Node.js, tests, CI'],
  ['angular', 'angular', 'large TypeScript, Angular, CI'],
  ['facebook', 'react', 'large JavaScript/React, tests, CI'],
  ['microsoft', 'TypeScript', 'large TypeScript, tests, CI'],
  ['nodejs', 'node', 'large JavaScript/Node.js, tests, CI'],
  ['vitejs', 'vite', 'TypeScript, tests, CI'],
  ['nestjs', 'nest', 'TypeScript, Node.js, tests, CI'],
  ['vuejs', 'core', 'TypeScript, Vue, tests, CI'],
  ['preactjs', 'preact', 'small JavaScript, React-compatible, tests'],
  ['juliangarnier', 'anime', 'small JavaScript, no lockfile expected'],
  ['lodash', 'lodash', 'small JavaScript, tests'],
  ['remix-run', 'react-router', 'TypeScript, React, tests, CI'],
  ['pnpm', 'pnpm', 'large TypeScript, Node.js, tests, CI'],
] as const);

const FILE_COUNTS = Object.freeze([10, 50, 100]);
const COMMON_LIMITS = Object.freeze({
  maxTotalBytes: 4 * 1024 * 1024,
  maxApiRequests: 125,
});
const OUTPUT_PATH = '/tmp/phase20-benchmark.json';

interface FindingSummary {
  readonly ruleId: string | null;
  readonly category: string;
  readonly severity: string;
}

interface ScenarioResult {
  readonly repository: string;
  readonly note: string;
  readonly maxFileCount: number;
  readonly commitSha: string | null;
  readonly status: 'ok' | 'failed';
  readonly error: string | null;
  readonly coverage: string | null;
  readonly selectedFileCount: number | null;
  readonly totalBytes: number | null;
  readonly requests: number;
  readonly ingestionDurationMs: number;
  readonly analyzerDurationMs: number;
  readonly scoringDurationMs: number;
  readonly totalDurationMs: number;
  readonly findingsCount: number;
  readonly findingsByCategory: Readonly<Record<string, number>>;
  readonly findingsBySeverity: Readonly<Record<string, number>>;
  readonly findings: readonly FindingSummary[];
  readonly recommendationsCount: number;
  readonly evidenceCount: number;
  readonly dimensionalScores: readonly {
    readonly dimension: string;
    readonly score: number | null;
    readonly coverage: string;
    readonly confidence: string;
  }[];
  readonly confidence: string | null;
  readonly limitations: readonly string[];
}

interface RepositoryBenchmark {
  readonly repository: string;
  readonly note: string;
  readonly commitSha: string | null;
  readonly scenarios: readonly ScenarioResult[];
}

function errorMessage(error: unknown): string {
  if (error !== null && typeof error === 'object' && 'category' in error) {
    return String(error.category);
  }
  return error instanceof Error ? error.name : 'unknown';
}

function counts(values: readonly string[]): Readonly<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return Object.freeze(result);
}

function summaries(result: AnalysisResult): readonly FindingSummary[] {
  return Object.freeze(
    result.findings.map((finding) =>
      Object.freeze({
        category: finding.category,
        ruleId: finding.ruleId,
        severity: finding.severity,
      }),
    ),
  );
}

function scenario(
  repository: string,
  note: string,
  maxFileCount: number,
  client: GitHubRestClient,
  ingestion: IngestionResult,
  result: AnalysisResult,
  timings: { ingestion: number; analyzer: number; scoring: number; total: number },
): ScenarioResult {
  const findingSummaries = summaries(result);
  return Object.freeze({
    analyzerDurationMs: timings.analyzer,
    commitSha: ingestion.snapshot.commitSha,
    confidence: result.confidence,
    coverage: result.coverage,
    dimensionalScores: Object.freeze(
      result.dimensionScores.map((score) =>
        Object.freeze({
          confidence: score.confidence,
          coverage: score.coverage,
          dimension: score.dimension,
          score: score.score,
        }),
      ),
    ),
    error: null,
    evidenceCount: result.evidence.length,
    findings: findingSummaries,
    findingsByCategory: counts(findingSummaries.map((finding) => finding.category)),
    findingsBySeverity: counts(findingSummaries.map((finding) => finding.severity)),
    findingsCount: result.findings.length,
    ingestionDurationMs: timings.ingestion,
    limitations: Object.freeze([...new Set([...ingestion.limitations, ...result.limitations])]),
    maxFileCount,
    note,
    recommendationsCount: result.recommendations.length,
    repository,
    requests: client.requestsMade,
    scoringDurationMs: timings.scoring,
    selectedFileCount: ingestion.metadata.selectedFileCount,
    status: 'ok',
    totalBytes: ingestion.metadata.totalBytes,
    totalDurationMs: timings.total,
  });
}

function failed(
  repository: string,
  note: string,
  maxFileCount: number,
  client: GitHubRestClient,
  startedAt: number,
  error: unknown,
): ScenarioResult {
  return Object.freeze({
    analyzerDurationMs: 0,
    commitSha: null,
    confidence: null,
    coverage: null,
    dimensionalScores: Object.freeze([]),
    error: errorMessage(error),
    evidenceCount: 0,
    findings: Object.freeze([]),
    findingsByCategory: Object.freeze({}),
    findingsBySeverity: Object.freeze({}),
    findingsCount: 0,
    ingestionDurationMs: 0,
    limitations: Object.freeze([]),
    maxFileCount,
    note,
    recommendationsCount: 0,
    repository,
    requests: client.requestsMade,
    scoringDurationMs: 0,
    selectedFileCount: null,
    status: 'failed',
    totalBytes: null,
    totalDurationMs: performance.now() - startedAt,
  });
}

const requestedRepositories = process.argv.slice(2);
const dataset = DATASET.filter(
  ([owner, repo]) =>
    requestedRepositories.length === 0 || requestedRepositories.includes(`${owner}/${repo}`),
);
const benchmarks: RepositoryBenchmark[] = [];

for (const [owner, repo, note] of dataset) {
  const repository = `${owner}/${repo}`;
  const resolvedClient = new GitHubRestClient({ token });
  const scenarios: ScenarioResult[] = [];
  let commitSha: string | null = null;
  process.stdout.write(`\nBenchmarking ${repository}\n`);
  for (const maxFileCount of FILE_COUNTS) {
    const client = new GitHubRestClient({ token });
    const startedAt = performance.now();
    try {
      const ingestionStarted = performance.now();
      const ingestion = await ingestRepository(
        `https://github.com/${repository}`,
        client,
        commitSha === null
          ? { limits: { ...COMMON_LIMITS, maxFileCount } }
          : { ref: commitSha, limits: { ...COMMON_LIMITS, maxFileCount } },
      );
      const ingestionDuration = performance.now() - ingestionStarted;
      commitSha ??= ingestion.snapshot.commitSha;
      const analyzerStarted = performance.now();
      const analyzed = analyze(ingestion);
      const analyzerDuration = performance.now() - analyzerStarted;
      const scoringStarted = performance.now();
      const scored = scoreAnalysis(analyzed);
      const scoringDuration = performance.now() - scoringStarted;
      scenarios.push(
        scenario(repository, note, maxFileCount, client, ingestion, scored, {
          analyzer: analyzerDuration,
          ingestion: ingestionDuration,
          scoring: scoringDuration,
          total: performance.now() - startedAt,
        }),
      );
      process.stdout.write(
        `  ${maxFileCount}: ok sha=${ingestion.snapshot.commitSha} files=${ingestion.metadata.selectedFileCount} findings=${scored.findings.length}\n`,
      );
    } catch (error) {
      scenarios.push(failed(repository, note, maxFileCount, client, startedAt, error));
      process.stdout.write(`  ${maxFileCount}: failed ${errorMessage(error)}\n`);
    }
  }
  void resolvedClient;
  benchmarks.push(
    Object.freeze({ commitSha, note, repository, scenarios: Object.freeze(scenarios) }),
  );
}

mkdirSync('/tmp', { recursive: true });
writeFileSync(
  OUTPUT_PATH,
  JSON.stringify(
    Object.freeze({
      analyzerVersion: '0.1.0',
      createdAt: new Date().toISOString(),
      dataset: DATASET.map(([owner, repo, note]) => ({ note, repository: `${owner}/${repo}` })),
      results: Object.freeze(benchmarks),
      ruleSetVersion: '0.1.0',
      scenarios: FILE_COUNTS,
    }),
    null,
    2,
  ),
);
process.stdout.write(`\nBenchmark written to ${OUTPUT_PATH}\n`);
