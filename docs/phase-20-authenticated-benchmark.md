# Phase 20 — Authenticated Benchmark, Snapshot Coverage & Ground-Truth Evaluation

## 1. Executive summary

Phase 20.2 attempted the complete corrected dataset of 15 public repositories at `maxFileCount` 10, 50, and 100. The runner was authenticated using `process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN`, passed the token explicitly to `GitHubRestClient`, and never printed or persisted its value.

The full 45-scenario run was started, but exceeded the 600-second execution window before producing a complete artifact. The artifact was overwritten by a targeted diagnostic rerun of the three repositories involved in Phase 20.1, so no complete 45-scenario result is claimed here. The corrected `nestjs/nest` scenarios completed; `microsoft/TypeScript` and `nodejs/node` remained blocked by the documented 4 MiB recursive-tree response limit.

```text
PHASE 20 = NOT COMPLETED
PRECISION = NOT VALIDATED
RECALL = NOT VALIDATED
DECISION = FOLLOW-UP INGESTION DESIGN
```

The evidence shows that two of 15 repositories (13.3%) are systematically excluded before file selection because their valid recursive tree responses exceed 4 MiB. That is significant enough to require a future ingestion-design phase, but this phase does not implement it.

## 2. Authentication status

- `GITHUB_TOKEN_PRESENT=true`;
- `GH_TOKEN_PRESENT=false`;
- authenticated GitHub API access succeeded;
- token resolution was exactly `process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN`;
- token was explicitly passed as `new GitHubRestClient({ token })`;
- no token value was printed, persisted, committed, or included in artifacts.

## 3. Final dataset

The corrected dataset contains 15 repositories:

1. `octocat/Hello-World`
2. `sindresorhus/type-fest`
3. `expressjs/express`
4. `angular/angular`
5. `facebook/react`
6. `microsoft/TypeScript`
7. `nodejs/node`
8. `vitejs/vite`
9. `nestjs/nest`
10. `vuejs/core`
11. `preactjs/preact`
12. `juliangarnier/anime`
13. `lodash/lodash`
14. `remix-run/react-router`
15. `pnpm/pnpm`

No repository was substituted after the correction. `nestjs/nest` is the verified canonical repository for the former stale `nestjs/nestjs` entry.

## 4. Methodology

Each repository was intended to run at all three limits: 10, 50, and 100 files. The same existing ingestion, analyzer, and scoring pipeline was used. The runner resolved the first successful commit and reused that SHA for subsequent scenarios where possible.

The benchmark does not clone repositories or execute repository code. It uses GitHub REST repository, commit, recursive-tree, and blob endpoints, then runs only the local deterministic analyzer and scorer over the downloaded snapshot.

The temporary machine-readable artifact path is `/tmp/phase20-benchmark.json`. It is not committed. It contains sanitized errors and finding summaries, not credentials or secret values.

## 5. Complete-run status

The complete corrected 15 × 3 command was attempted:

```bash
pnpm --filter @ai-developer-platform/api exec tsx src/validate-real-repos.ts
```

It timed out after 600 seconds. The temporary artifact was subsequently overwritten by the targeted rerun of `microsoft/TypeScript`, `nodejs/node`, and `nestjs/nest`; therefore the complete 45-scenario artifact is unavailable and its results are not claimed.

This is why Phase 20 remains `NOT COMPLETED`, despite all technically runnable targeted scenarios completing.

## 6. 15 × 3 result matrix

The following matrix distinguishes directly observed targeted rerun results from scenarios not claimable after the full-run timeout. `NOT RECOVERED` is not a fabricated success or failure.

| Repository | 10 | 50 | 100 |
|---|---|---|---|
| `octocat/Hello-World` | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here |
| `sindresorhus/type-fest` | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here |
| `expressjs/express` | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here |
| `angular/angular` | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here |
| `facebook/react` | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here |
| `microsoft/TypeScript` | `INGESTION_LIMITATION` | `INGESTION_LIMITATION` | `INGESTION_LIMITATION` |
| `nodejs/node` | `INGESTION_LIMITATION` | `INGESTION_LIMITATION` | `INGESTION_LIMITATION` |
| `vitejs/vite` | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here |
| `nestjs/nest` | completed, 10 files, 3 findings | completed, 50 files, 3 findings | completed, 100 files, 4 findings |
| `vuejs/core` | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here |
| `preactjs/preact` | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here |
| `juliangarnier/anime` | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here |
| `lodash/lodash` | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here |
| `remix-run/react-router` | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here |
| `pnpm/pnpm` | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here | prior Phase 20 result; not re-counted here |

Historical Phase 20 measurements are explicitly not relabeled as new Phase 20.2 measurements. The only fresh targeted rerun results are the three corrected entries above.

## 7. Fresh targeted rerun metrics

The targeted rerun produced nine scenarios: three successful `nestjs/nest` scenarios and six large-tree failures.

| maxFileCount | Completed | Failed | Files processed | Bytes processed | Findings | Requests | Total latency |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 1 | 2 | 10 | 23,924 | 3 | 13 | 4,778.55 ms |
| 50 | 1 | 2 | 50 | 43,370 | 3 | 53 | 18,873.65 ms |
| 100 | 1 | 2 | 100 | 59,550 | 4 | 103 | 35,545.74 ms |

The six failures each reported sanitized error `invalid_response`, with three requests consumed per failed scenario. They are classified as `INGESTION_LIMITATION` based on the independently verified 200 JSON responses exceeding the client’s 4 MiB response limit.

## 8. maxJsonResponseBytes analysis

Direct authenticated checks established:

- `microsoft/TypeScript`: recursive tree HTTP 200, JSON, approximately 18,010,247 bytes, 51,434 entries, `truncated=true`;
- `nodejs/node`: recursive tree HTTP 200, JSON, approximately 17,399,260 bytes, 56,033 entries, `truncated=false`;
- both repository and commit endpoints resolve successfully;
- direct blob retrieval succeeds for both repositories;
- the local client’s configured `maxJsonResponseBytes=4 MiB` rejects the tree before file selection.

Thus, 2 of 15 dataset repositories (13.3%) are affected, and all three snapshot scenarios for each are affected. This is not an analyzer defect and no limit was changed in this phase.

## 9. Coverage and findings impact

The fresh targeted rerun confirms that increasing `maxFileCount` can add findings for `nestjs/nest` (3 → 3 → 4), but it does not provide a fresh aggregate comparison for all 15 repositories because the complete artifact was not recoverable after timeout.

The earlier Phase 20 artifact showed additional findings and materially higher bytes/latency at 50 and 100, but those historical numbers are not presented as fresh Phase 20.2 measurements here. No conclusion about global finding deltas is claimed from the incomplete rerun.

## 10. Ground truth

No human ground truth was attempted in this phase. Therefore:

```text
PRECISION = NOT VALIDATED
RECALL = NOT VALIDATED
FALSE POSITIVES = NOT VALIDATED
FALSE NEGATIVES = NOT VALIDATED
```

No false negatives are asserted from findings absent at a lower file limit. Absence findings remain snapshot-scoped and are not treated as repository-wide absence.

## 11. Decision

```text
FOLLOW-UP INGESTION DESIGN
```

Evidence supporting this decision:

- 2/15 repositories are systematically excluded by the current recursive-tree response cap;
- the affected repositories are large and relevant to the intended ecosystem diversity;
- the failure occurs before file selection, so increasing `maxFileCount` cannot recover their signals;
- the response is valid GitHub JSON, so this is a bounded-ingestion design limitation rather than malformed external data;
- the limitation affects all three scenarios for each affected repository.

No redesign is implemented here. A future phase should investigate bounded tree acquisition/pagination or an equivalent design while preserving SSRF, request, byte, timeout, and security invariants.

## 12. Remaining limitations

- the complete 45-scenario fresh artifact was not recovered after the 600-second timeout;
- no fresh aggregate 15-repository deltas can be claimed in this phase;
- two repositories remain affected by the 4 MiB tree-response limit;
- no human review or live AI validation;
- precision, recall, false-positive, and false-negative metrics unavailable;
- network-dependent timings are not production SLOs;
- local Node `25.3.0` is outside the declared Node 24 range;
- wire bytes are unavailable; recorded bytes are processed file bytes;
- no production ingestion limits were changed.

## 13. Conclusion

```text
PHASE 20 = NOT COMPLETED
```

Phase 20 cannot be declared complete because the complete corrected 45-scenario execution did not finish and the resulting artifact was not recoverable. The evidence is sufficient to classify the remaining large-repository failures as legitimate `INGESTION_LIMITATION` cases and to justify a dedicated future ingestion-design phase.

## Quality and repository state

Quality gates for the current working tree:

- `pnpm install --frozen-lockfile`: PASS
- `pnpm check:architecture`: PASS
- `pnpm format:check`: PASS
- `pnpm lint`: PASS
- `pnpm typecheck`: PASS
- `pnpm test`: PASS, 75 tests
- `pnpm build`: PASS
- `pnpm audit --audit-level=high`: PASS
- `git diff --check`: PASS

Files:

- modified: `apps/api/src/validate-real-repos.ts`;
- modified: `docs/phase-20-authenticated-benchmark.md`;
- created earlier and preserved: `docs/phase-20.1-benchmark-failure-analysis.md`;
- temporary artifact: `/tmp/phase20-benchmark.json`, not committed.

No commit, tag, push, or notification was sent. `~/.knowledge.md` was not used for notification because the full run did not complete and no success notification is warranted.
