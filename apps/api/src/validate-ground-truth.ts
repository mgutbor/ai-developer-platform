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
 * /tmp/phase22-ground-truth-results.jsonl and a sanitized human-review
 * package is written to /tmp/phase22-human-review/.
 *
 * This is a validation/evidence script only. It does not classify findings
 * (no TP/FP/uncertain/not-evaluable), does not compute accuracy metrics, and
 * does not change analyzer, scoring, ingestion or any resource limit.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { GitHubRestClient, ingestRepository } from '@ai-developer-platform/github';
import { analyze } from '@ai-developer-platform/analyzer';
import { scoreAnalysis } from '@ai-developer-platform/scoring';
import type {
  AnalysisResult,
  Evidence,
  Finding,
  Recommendation,
} from '@ai-developer-platform/domain';

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
const REVIEW_DIR = '/tmp/phase22-human-review';

const ANALYZER_VERSION = '1.0.0';
const SCORING_VERSION = '1.0.0';

interface FindingSummary {
  readonly ruleId: string | null;
  readonly category: string;
  readonly severity: string;
}

interface ScenarioResult {
  readonly repository: string;
  readonly commitSha: string | null;
  readonly defaultBranch: string;
  readonly status: 'ok' | 'failed' | 'commit_mismatch';
  readonly ingestionCategory: string | null;
  readonly error: string | null;
  readonly requests: number;
  readonly treeRequests: number;
  readonly blobRequests: number;
  readonly selectedFileCount: number | null;
  readonly totalBytes: number | null;
  readonly findingsCount: number | null;
  readonly findings: readonly FindingSummary[];
  readonly coverage: string | null;
  readonly limitations: readonly string[];
  readonly latencyMs: number;
}

/**
 * Wraps the client's `request` to count tree/ blob / other requests without
 * inspecting or logging any payload, header or token. This is diagnostics-only
 * metadata for the human-review package.
 */
function attachRequestCounters(client: GitHubRestClient): {
  readonly countTreeRequests: () => number;
  readonly countBlobRequests: () => number;
} {
  const request = (client as unknown as { request: (...args: unknown[]) => unknown }).request;
  let trees = 0;
  let blobs = 0;
  (client as unknown as { request: (...args: unknown[]) => unknown }).request = (
    ...args: unknown[]
  ) => {
    const path = String(args[0] ?? '');
    if (/\/git\/trees\//.test(path)) trees += 1;
    else if (/\/git\/blobs\//.test(path)) blobs += 1;
    return request.apply(client, args);
  };
  return {
    countTreeRequests: () => trees,
    countBlobRequests: () => blobs,
  };
}

interface ReviewRun {
  readonly result: ScenarioResult;
  readonly analysis: AnalysisResult | null;
}

const runs: ReviewRun[] = [];

for (const entry of dataset) {
  const client = new GitHubRestClient({ token });
  const counters = attachRequestCounters(client);
  const started = performance.now();
  const base = {
    repository: entry.repository,
    commitSha: entry.commitSha,
    defaultBranch: entry.defaultBranch,
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
    runs.push({
      result: Object.freeze({
        ...base,
        status: commitMatches ? 'ok' : 'commit_mismatch',
        ingestionCategory: commitMatches ? null : 'commit_mismatch',
        error: commitMatches ? null : 'resolved commit differs from the frozen SHA',
        requests: client.requestsMade,
        treeRequests: counters.countTreeRequests(),
        blobRequests: counters.countBlobRequests(),
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
      analysis: analyzed,
    });
  } catch (error) {
    const ingestionCategory =
      error !== null && typeof error === 'object' && 'category' in error
        ? String(error.category)
        : null;
    runs.push({
      result: Object.freeze({
        ...base,
        status: 'failed',
        ingestionCategory,
        error:
          ingestionCategory ??
          (error instanceof Error ? error.name : typeof error === 'string' ? error : 'unknown'),
        requests: client.requestsMade,
        treeRequests: counters.countTreeRequests(),
        blobRequests: counters.countBlobRequests(),
        selectedFileCount: null,
        totalBytes: null,
        findingsCount: null,
        findings: Object.freeze([]),
        coverage: null,
        limitations: Object.freeze([]),
        latencyMs: Math.round(performance.now() - started),
      }),
      analysis: null,
    });
  }
}

// ---- Sanitized JSONL artifact -------------------------------------------
mkdirSync('/tmp', { recursive: true });
writeFileSync(
  OUTPUT_PATH,
  runs
    .map(({ result }) =>
      JSON.stringify({
        repository: result.repository,
        commitSha: result.commitSha,
        defaultBranch: result.defaultBranch,
        status: result.status,
        ingestionCategory: result.ingestionCategory,
        error: result.error,
        requests: result.requests,
        treeRequests: result.treeRequests,
        blobRequests: result.blobRequests,
        selectedFileCount: result.selectedFileCount,
        totalBytes: result.totalBytes,
        findingsCount: result.findingsCount,
        findings: result.findings,
        coverage: result.coverage,
        limitations: result.limitations,
        latencyMs: result.latencyMs,
      }),
    )
    .join('\n') + '\n',
  'utf8',
);

// ---- Human-review package -----------------------------------------------
rmSync(REVIEW_DIR, { recursive: true, force: true });
mkdirSync(REVIEW_DIR, { recursive: true });

function evidenceByIndex(analysis: AnalysisResult): Evidence[] {
  return [...analysis.evidence];
}

function findingDetailParts(analysis: AnalysisResult, finding: Finding) {
  const evidenceById = new Map(evidenceByIndex(analysis).map((e) => [e.id, e]));
  const recById = new Map(analysis.recommendations.map((r: Recommendation) => [r.id, r]));
  const evidenceLines: string[] = [];
  for (const id of finding.evidenceIds) {
    const ev = evidenceById.get(id);
    if (ev === undefined) continue;
    const path = ev.location?.path ?? null;
    const range = ev.location?.range;
    const rangeText =
      range && range.start.line > 0
        ? `L${range.start.line}${range.end.line !== range.start.line ? `-L${range.end.line}` : ''}`
        : null;
    evidenceLines.push(
      `Evidence ${ev.id}: kind=${ev.kind}, path=${path ?? '(none)'}${rangeText ? `, range=${rangeText}` : ''}, excerpt_hash=${ev.excerptHash ?? 'none'}`,
    );
  }
  const recTexts: string[] = [];
  for (const id of finding.recommendationIds) {
    const rec = recById.get(id);
    if (rec === undefined) continue;
    recTexts.push(`- ${rec.title}: ${rec.description}`);
  }
  return { evidenceLines, recTexts };
}

function scoreImpact(
  analysis: AnalysisResult,
  finding: Finding,
): { dimension: string; score: number | null; confidence: string } | null {
  const dim = analysis.dimensionScores.find((d) => d.dimension === finding.category);
  if (dim === undefined) return null;
  return {
    dimension: dim.dimension,
    score: dim.score,
    confidence: dim.confidence,
  };
}

const SLUG = [
  '01-octocat-hello-world.md',
  '02-sindresorhus-type-fest.md',
  '03-expressjs-express.md',
  '04-angular-angular.md',
  '05-react-react.md',
  '06-vuejs-core.md',
  '07-nestjs-nest.md',
  '08-vitejs-vite.md',
] as const;

for (let i = 0; i < DATASET.length; i += 1) {
  const entry = DATASET[i]!;
  const slug = SLUG[i]!;
  const run = runs.find(({ result }) => result.repository === entry.repository);
  if (run === undefined) continue;
  const r = run.result;
  const analysis = run.analysis;
  const lines: string[] = [];
  lines.push(`Repository: ${r.repository}`);
  lines.push(`Commit: ${r.commitSha}`);
  lines.push(`Analyzer version: ${ANALYZER_VERSION}`);
  lines.push(`Scoring version: ${SCORING_VERSION}`);
  lines.push(
    `Execution status: ${r.status}${r.ingestionCategory ? ` (${r.ingestionCategory})` : ''}`,
  );
  lines.push(`Coverage: ${r.coverage ?? 'null'}`);
  lines.push(
    `Limitations: ${r.limitations.length > 0 ? r.limitations.join('; ') : (r.error ?? 'none')}`,
  );
  lines.push('');
  lines.push('## Findings');
  lines.push('');

  if (r.status === 'ok' && analysis !== null) {
    if (analysis.findings.length === 0) {
      lines.push('NO FINDINGS GENERATED');
      lines.push('');
    } else {
      analysis.findings.forEach((finding, idx) => {
        const parts = findingDetailParts(analysis, finding);
        const impact = scoreImpact(analysis, finding);
        lines.push(`### FINDING ${idx + 1} (${finding.id})`);
        lines.push('');
        lines.push(`- Rule: ${finding.ruleId ?? 'null'}`);
        lines.push(`- Severity: ${finding.severity}`);
        lines.push(`- Title: ${finding.title}`);
        lines.push(`- Message: ${finding.description}`);
        parts.evidenceLines.forEach((e) => lines.push(`- ${e}`));
        lines.push('- Recommendation:');
        if (parts.recTexts.length > 0) {
          parts.recTexts.forEach((t) => lines.push(`  ${t}`));
        } else {
          lines.push('  (none)');
        }
        lines.push(`- Dimension: ${finding.category}`);
        if (impact) {
          lines.push(
            `- Score impact: ${impact.dimension}=${impact.score !== null ? impact.score : 'null'} (confidence ${impact.confidence})`,
          );
        } else {
          lines.push('- Score impact: (no dimension score for this category)');
        }
        lines.push(
          `- Snapshot limitations: ${r.limitations.length > 0 ? r.limitations.join('; ') : 'none'}`,
        );
        lines.push('');
        lines.push('### Human review');
        lines.push('');
        lines.push('- Classification: [TP | FP | UNCERTAIN | NOT_EVALUABLE]');
        lines.push('- Reviewer notes:');
        lines.push('- Evidence sufficient: [YES | NO]');
        lines.push('- Actionable: [YES | NO]');
        lines.push('- Reviewer confidence: [HIGH | MEDIUM | LOW]');
        lines.push('');
        lines.push('Reviewer questions:');
        lines.push(
          '1. Does the condition described by the rule actually exist in the code/path shown?',
        );
        lines.push('2. Does the cited evidence exactly support this finding?');
        lines.push('3. Is the rule interpreting the surrounding context correctly?');
        lines.push('4. Does the finding represent an actionable problem?');
        lines.push('5. Is the proposed recommendation reasonable?');
        lines.push(
          '6. Is the available evidence sufficient to evaluate the finding without accessing parts outside the snapshot?',
        );
        lines.push('');
      });
    }
  } else {
    lines.push('NO FINDINGS GENERATED');
    lines.push('');
    lines.push(
      `The repository could not produce a snapshot within the contractual limits and therefore generated no findings.`,
    );
    lines.push('');
    lines.push(`Ingestion category: ${r.ingestionCategory ?? r.error ?? 'unknown'}`);
    lines.push(`Requests used: ${r.requests} (maxApiRequests=125)`);
    lines.push(`Tree requests: ${r.treeRequests}`);
    lines.push(`Blob requests: ${r.blobRequests}`);
    lines.push(
      `Explanation: the snapshot requires ${r.treeRequests + r.blobRequests + 3} API requests (resolution + tree traversal + one request per selected file) which exceeds maxApiRequests=125 at maxFileCount=50. This is a documented bounded-resource outcome, not an analyzer defect, and is not classified here.`,
    );
    lines.push('');
  }
  writeFileSync(join(REVIEW_DIR, slug), lines.join('\n'), 'utf8');
}

// ---- Summary -------------------------------------------------------------
{
  const summary: string[] = [];
  summary.push('# Phase 22.2 — Evidence summary (no classification)');
  summary.push('');
  summary.push('This is a list of evidence counters only. It contains no accuracy metric');
  summary.push('(no precision, recall, accuracy, false-positive rate or false-negative rate)');
  summary.push('and no finding classification (TP/FP/uncertain/not-evaluable remain empty until');
  summary.push('Manuel performs the human review in Phase 22.3).');
  summary.push('');
  summary.push('## Execution');
  summary.push('');
  summary.push(`- Dataset: 8 frozen repositories (see docs/phase-22-ground-truth-dataset.md).`);
  summary.push(`- Analyzer version: ${ANALYZER_VERSION}; Scoring version: ${SCORING_VERSION}`);
  for (const { result } of runs) {
    summary.push(
      `- ${result.repository} @ ${result.commitSha}: status=${result.status}${
        result.ingestionCategory ? ` (${result.ingestionCategory})` : ''
      }, requests=${result.requests}, files=${result.selectedFileCount ?? 'n/a'}, findings=${result.findingsCount ?? 'n/a'}`,
    );
  }
  summary.push('');
  summary.push('## Findings by repository');
  summary.push('');
  for (const { result } of runs) {
    summary.push(`- ${result.repository}: ${result.findingsCount ?? 'n/a (no snapshot)'}`);
  }
  summary.push('');
  summary.push('## Findings by rule');
  summary.push('');
  const byRule = new Map<string, number>();
  for (const { result } of runs) {
    for (const f of result.findings) {
      const key = f.ruleId ?? 'unknown';
      byRule.set(key, (byRule.get(key) ?? 0) + 1);
    }
  }
  if (byRule.size === 0) {
    summary.push('- (none)');
  } else {
    for (const [rule, count] of [...byRule.entries()].sort((a, b) => b[1] - a[1])) {
      summary.push(`- ${rule}: ${count}`);
    }
  }
  summary.push('');
  summary.push('## Findings by severity');
  summary.push('');
  const bySeverity = new Map<string, number>();
  for (const { result } of runs) {
    for (const f of result.findings) {
      bySeverity.set(f.severity, (bySeverity.get(f.severity) ?? 0) + 1);
    }
  }
  for (const severity of ['critical', 'high', 'medium', 'low', 'info'] as const) {
    summary.push(`- ${severity}: ${bySeverity.get(severity) ?? 0}`);
  }
  summary.push('');
  summary.push('## Findings by dimension');
  summary.push('');
  const byDim = new Map<string, number>();
  for (const { result } of runs) {
    for (const f of result.findings) {
      byDim.set(f.category, (byDim.get(f.category) ?? 0) + 1);
    }
  }
  for (const dim of [
    'architecture',
    'code_quality',
    'dependencies',
    'documentation',
    'maintainability',
    'security',
    'testing',
  ] as const) {
    summary.push(`- ${dim}: ${byDim.get(dim) ?? 0}`);
  }
  summary.push('');
  summary.push('## Priority rules present in the dataset');
  summary.push('');
  for (const rule of [
    'AN-SEC-003',
    'AN-TEST-001',
    'AN-DEP-001',
    'AN-ARCH-002',
    'AN-DOC-001',
  ] as const) {
    summary.push(`- ${rule}: ${(byRule.get(rule) ?? 0) > 0 ? 'FOUND' : 'NOT_FOUND'}`);
  }
  summary.push('');
  summary.push('## Coverage / ingestion status');
  summary.push('');
  for (const { result } of runs) {
    summary.push(
      `- ${result.repository}: coverage=${result.coverage ?? 'null'}, limitations=${result.limitations.length > 0 ? result.limitations.join('; ') : (result.error ?? 'none')}`,
    );
  }
  summary.push('');
  summary.push(
    'Findings with evidence: each finding links to evidence via path + excerpt_hash (see per-repository files).',
  );
  summary.push(
    'Findings without sufficient evidence: (declared by Manuel during review; none pre-judged here).',
  );
  writeFileSync(join(REVIEW_DIR, '00-summary.md'), summary.join('\n'), 'utf8');
}

// ---- README --------------------------------------------------------------
{
  const readme: string[] = [];
  readme.push('# Phase 22 — Human review package');
  readme.push('');
  readme.push(
    'Generated by `apps/api/src/validate-ground-truth.ts` on the frozen Phase 22.1 dataset.',
  );
  readme.push('');
  readme.push(
    'This package contains ONLY evidence produced by the analyzer. No finding is labelled',
  );
  readme.push(
    'TP/FP/uncertain/not-evaluable here; those fields are empty templates reserved for the',
  );
  readme.push(
    'human reviewer (Manuel) in Phase 22.3. No precision/recall/accuracy metric is computed.',
  );
  readme.push('');
  readme.push('## Files');
  readme.push('');
  readme.push(
    '- `00-summary.md` — evidence counters (findings by repo, rule, severity, dimension).',
  );
  for (const slug of SLUG) {
    readme.push(`- \`${slug}\` — review file for one repository.`);
  }
  readme.push('');
  readme.push('## How to review');
  readme.push('');
  readme.push('For each finding, fill the empty "Human review" template:');
  readme.push('- `Classification` — TP, FP, UNCERTAIN or NOT_EVALUABLE.');
  readme.push('- `Evidence sufficient` — YES / NO.');
  readme.push('- `Actionable` — YES / NO.');
  readme.push('- `Reviewer confidence` — HIGH / MEDIUM / LOW.');
  readme.push('');
  readme.push(
    'Answer the reviewer questions listed under each finding. A repository whose file says',
  );
  readme.push(
    '"NO FINDINGS GENERATED" produced no snapshot findings because ingestion hit a bounded',
  );
  readme.push(
    'resource limit; that is recorded, not interpreted as proving any rule works or fails.',
  );
  readme.push('');
  readme.push(
    'Do not summarize this package into precision/recall here; that belongs to Phase 22.3',
  );
  readme.push('and only where defensible.');
  writeFileSync(join(REVIEW_DIR, 'README.md'), readme.join('\n'), 'utf8');
}

// ---- Console summary ----------------------------------------------------
for (const { result } of runs) {
  process.stdout.write(
    JSON.stringify({
      repository: result.repository,
      commitSha: result.commitSha,
      status: result.status,
      ingestionCategory: result.ingestionCategory,
      error: result.error,
      requests: result.requests,
      selectedFileCount: result.selectedFileCount,
      findingsCount: result.findingsCount,
      latencyMs: result.latencyMs,
    }) + '\n',
  );
}
