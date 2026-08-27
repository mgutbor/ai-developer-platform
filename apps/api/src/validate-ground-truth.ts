/**
 * Phase 22 — ground-truth dataset runner.
 *
 * Runs the existing deterministic pipeline (ingestion -> analyzer -> scoring)
 * over the frozen dataset defined in docs/phase-22-ground-truth-dataset.md.
 * The dataset uses exact commit SHAs as refs, never floating references, so
 * re-running this runner reproduces the same snapshots and results.
 *
 * Credentials are read from the environment and never printed. Repository
 * contents are not persisted; only sanitized result metadata is written to
 * /tmp/phase22-ground-truth-results.jsonl.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { GitHubRestClient, ingestRepository } from '@ai-developer-platform/github';
import { analyze } from '@ai-developer-platform/analyzer';
import { scoreAnalysis } from '@ai-developer-platform/scoring';

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
if (token === undefined || token.trim().length === 0) {
  process.stdout.write('BENCHMARK BLOCKED — GITHUB_TOKEN/GH_TOKEN required\n');
  process.exit(1);
}

/**
 * Frozen dataset (frozen on 2026-08-27). Mirrors
 * docs/phase-22-ground-truth-dataset.md. `commitSha` is the canonical ref for
 * execution; `defaultBranch` is recorded metadata only.
 */
const DATASET = Object.freeze([
  {
    repository: 'octocat/Hello-World',
    defaultBranch: 'master',
    commitSha: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d',
  },
  {
    repository: 'sindresorhus/type-fest',
    defaultBranch: 'main',
    commitSha: '3fe02d33596f8afa167bc465d9d9ac9ab81b497e',
  },
  {
    repository: 'expressjs/express',
    defaultBranch: 'master',
    commitSha: '023767fe9872e029271df1418f73401bff20ff40',
  },
  {
    repository: 'angular/angular',
    defaultBranch: 'main',
    commitSha: '133cafda42028fbd8efd7840d6ff3fea25223166',
  },
  {
    repository: 'react/react',
    defaultBranch: 'main',
    commitSha: '29d9d3184484b03cb0369e0494617207df777b7a',
  },
  {
    repository: 'vuejs/core',
    defaultBranch: 'main',
    commitSha: 'd63616ca17de965ed32dcb449a4c5cd9982f15d2',
  },
  {
    repository: 'nestjs/nest',
    defaultBranch: 'master',
    commitSha: 'a333a9dae6169537da3954c5b1ac35202b057fcb',
  },
  {
    repository: 'vitejs/vite',
    defaultBranch: 'main',
    commitSha: 'ee644014aab61e546742b862a7d7b0d6c7d67a7b',
  },
]);

// Optional positional arguments restrict the run to specific repositories
// (e.g. `tsx src/validate-ground-truth.ts octocat/Hello-World`).
const targets = process.argv.slice(2);
const dataset =
  targets.length === 0 ? DATASET : DATASET.filter((entry) => targets.includes(entry.repository));

const OUTPUT_PATH = '/tmp/phase22-ground-truth-results.jsonl';

interface FindingSummary {
  readonly ruleId: string | null;
  readonly category: string;
  readonly severity: string;
}

interface ScenarioResult {
  readonly repository: string;
  readonly commitSha: string | null;
  readonly status: 'ok' | 'failed' | 'commit_mismatch';
  readonly error: string | null;
  readonly requests: number;
  readonly selectedFileCount: number | null;
  readonly totalBytes: number | null;
  readonly findingsCount: number | null;
  readonly findings: readonly FindingSummary[];
  readonly coverage: string | null;
  readonly limitations: readonly string[];
  readonly latencyMs: number;
}

const results: ScenarioResult[] = [];

for (const entry of dataset) {
  const client = new GitHubRestClient({ token });
  const started = performance.now();
  const base = {
    repository: entry.repository,
    commitSha: entry.commitSha,
    requests: 0,
    latencyMs: 0,
  };
  try {
    const result = await ingestRepository(`https://github.com/${entry.repository}`, client, {
      ref: entry.commitSha,
      limits: { maxFileCount: 50 },
    });
    const analyzed = analyze(result);
    const scored = scoreAnalysis(analyzed);
    const commitMatches = result.snapshot.commitSha === entry.commitSha;
    results.push(
      Object.freeze({
        ...base,
        status: commitMatches ? 'ok' : 'commit_mismatch',
        error: commitMatches ? null : 'resolved commit differs from the frozen SHA',
        requests: client.requestsMade,
        selectedFileCount: result.metadata.selectedFileCount,
        totalBytes: result.metadata.totalBytes,
        findingsCount: scored.findings.length,
        findings: Object.freeze(
          scored.findings.map((finding) =>
            Object.freeze({
              ruleId: finding.ruleId,
              category: finding.category,
              severity: finding.severity,
            }),
          ),
        ),
        coverage: scored.coverage,
        limitations: result.limitations,
        latencyMs: Math.round(performance.now() - started),
      }),
    );
  } catch (error) {
    results.push(
      Object.freeze({
        ...base,
        status: 'failed',
        error:
          error !== null && typeof error === 'object' && 'category' in error
            ? String(error.category)
            : error instanceof Error
              ? error.name
              : 'unknown',
        requests: client.requestsMade,
        selectedFileCount: null,
        totalBytes: null,
        findingsCount: null,
        findings: Object.freeze([]),
        coverage: null,
        limitations: Object.freeze([]),
        latencyMs: Math.round(performance.now() - started),
      }),
    );
  }
}

mkdirSync('/tmp', { recursive: true });
writeFileSync(
  OUTPUT_PATH,
  results.map((result) => JSON.stringify(result)).join('\n') + '\n',
  'utf8',
);

for (const result of results) {
  process.stdout.write(
    JSON.stringify({
      repository: result.repository,
      commitSha: result.commitSha,
      status: result.status,
      error: result.error,
      requests: result.requests,
      selectedFileCount: result.selectedFileCount,
      findingsCount: result.findingsCount,
      latencyMs: result.latencyMs,
    }) + '\n',
  );
}
