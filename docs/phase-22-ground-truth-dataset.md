# Phase 22 — Ground-Truth Dataset (frozen)

## Purpose

This document defines the frozen, reproducible dataset that Phase 22.2 will use to execute the deterministic pipeline (GitHub ingestion → analyzer → scoring) and later to support human ground-truth classification of the produced findings.

Phase 22.1 only prepares the dataset. It contains **no findings, no human labels, and no metrics**. Those belong to the execution results produced in Phase 22.2 and to the human review that follows.

```text
DATASET (this document) != EXECUTION RESULT (Phase 22.2)
```

## Freeze date

**2026-08-27.** The commit SHAs below were resolved once from the repositories' default branches at this date and are now frozen anchors. Floating references (`main`, `master`, `latest`) are **not** the canonical source for execution.

## Repository selection criteria

- Eight public repositories, all primarily JavaScript/TypeScript ecosystems.
- Same core sample as the Phase 20 benchmark dataset, providing continuity with Phases 13/14/16 evidence.
- Diversity in size, structure, framework and tooling:
  - tiny repository without package manifest (`octocat/Hello-World`);
  - TypeScript library with tests and CI (`sindresorhus/type-fest`);
  - JavaScript/Node.js framework with tests and CI (`expressjs/express`);
  - large TypeScript/Angular repository (`angular/angular`);
  - large JavaScript/React repository (`facebook/react`, canonical `react/react`);
  - TypeScript/Vue repository (`vuejs/core`);
  - TypeScript/Node.js framework with tests and CI (`nestjs/nest`);
  - TypeScript build-tooling repository with tests and CI (`vitejs/vite`).
- All repositories are public and were verified as `private: false`.
- `facebook/react` is analyzed under its canonical identity `react/react` because GitHub redirects the legacy alias (same behavior as Phases 13–20).

## Frozen dataset

| Repository | Ref (frozen SHA) | Commit SHA | maxFileCount | maxApiRequests | maxJsonResponseBytes | maxTotalBytes | Timeout (ingestion) | Analyzer version | Scoring version |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `octocat/Hello-World` | SHA | `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |
| `sindresorhus/type-fest` | SHA | `3fe02d33596f8afa167bc465d9d9ac9ab81b497e` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |
| `expressjs/express` | SHA | `023767fe9872e029271df1418f73401bff20ff40` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |
| `angular/angular` | SHA | `133cafda42028fbd8efd7840d6ff3fea25223166` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |
| `react/react` | SHA | `29d9d3184484b03cb0369e0494617207df777b7a` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |
| `vuejs/core` | SHA | `d63616ca17de965ed32dcb449a4c5cd9982f15d2` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |
| `nestjs/nest` | SHA | `a333a9dae6169537da3954c5b1ac35202b057fcb` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |
| `vitejs/vite` | SHA | `ee644014aab61e546742b862a7d7b0d6c7d67a7b` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |

## Execution parameters

All values are the existing contractual defaults — none were changed for this dataset:

| Parameter | Value | Source |
| --- | ---: | --- |
| `maxFileCount` | 50 | `packages/github/src/policy.ts` |
| `maxApiRequests` | 125 | `packages/github/src/policy.ts` |
| `maxJsonResponseBytes` | 4 MiB | `packages/github/src/policy.ts` |
| `maxTotalBytes` | 2 MiB | `packages/github/src/policy.ts` |
| `maxFileBytes` | 256 KiB | `packages/github/src/policy.ts` |
| `maxTreeEntries` | 5,000 | `packages/github/src/policy.ts` |
| `requestTimeoutMs` | 10,000 | `packages/github/src/policy.ts` |
| `ingestionTimeoutMs` | 60,000 | `packages/github/src/policy.ts` |

## Versions

- Analyzer: package `@ai-developer-platform/analyzer` version `1.0.0` at project commit `f9361be8048ea17084be44e83e364461fd4f5ccf` (all rules in `packages/analyzer/src/analysis.ts` and `classification.ts`).
- Scoring: package `@ai-developer-platform/scoring` version `1.0.0` at the same project commit (5 dimensions: architecture, testing, documentation, dependencies, code_quality).
- Ingestion: `@ai-developer-platform/github` version `1.0.0` at the same project commit, including the Phase 21 segmented tree traversal.

## Reproduction procedure

```bash
# Requires GITHUB_TOKEN (or GH_TOKEN) in the environment; never printed.
# Runs the frozen dataset with exact commit SHAs as refs.
pnpm --filter @ai-developer-platform/api exec tsx src/validate-ground-truth.ts

# Restrict to a single repository (dry validation / partial runs):
pnpm --filter @ai-developer-platform/api exec tsx src/validate-ground-truth.ts octocat/Hello-World
```

The runner:

- uses exactly the frozen SHA as the ingestion `ref` (never floating branches);
- asserts the resolved snapshot commit equals the frozen SHA (`commit_mismatch` otherwise);
- runs only the existing pipeline (`ingestRepository` → `analyze` → `scoreAnalysis`);
- writes sanitized result metadata to `/tmp/phase22-ground-truth-results.jsonl`;
- executes no repository code and installs no repository dependencies.

## Validation performed (Phase 22.1)

- All 8 repositories resolved via the authenticated GitHub API and are public.
- Each frozen SHA was verified as resolvable (`GET /commits/{sha}` returns the same SHA).
- No floating reference remains as the canonical execution source.
- Limits confirmed unchanged from `DEFAULT_INGESTION_LIMITS` (see parameters table).
- The runner consumed the dataset in a dry validation run (`octocat/Hello-World`, `maxFileCount=50`).

## Security

- Only public repositories; no private data.
- The runner reads the token from `GITHUB_TOKEN ?? GH_TOKEN`, passes it to `GitHubRestClient`, and never prints, persists, or includes it in artifacts.
- No secrets, credentials, or Authorization headers appear in this document, in the runner, or in the output artifact.
- The platform never executes code from analyzed repositories and never installs their dependencies.

## Limitations

- SHAs are frozen at the 2026-08-27 resolution; later upstream commits are intentionally out of scope for this dataset.
- `react/react` is the canonical identity for the legacy `facebook/react` alias.
- `octocat/Hello-World` uses the default branch `master`; this is recorded metadata, and execution always uses the frozen SHA.
- The dataset deliberately does not include `microsoft/TypeScript` or `nodejs/node`; large-tree repositories are out of scope for Phase 22.2 (see Phase 21 limitations).

## Relationship with Phase 22.2

Phase 22.2 will execute this frozen dataset with `src/validate-ground-truth.ts`, produce the execution results artifact, and use those results to build the human ground-truth review package (finding classification and, only where defensible, precision/false-positive metrics). This document stays frozen and does not absorb execution results.

## Dataset invariants

- Commits are immutable; the SHAs above are the canonical anchors.
- The dataset is the input of Phase 22.2.
- It does not yet contain human ground truth.
- It does not yet contain TP/FP/uncertain/not-evaluable labels.
- It does not yet contain metrics.
