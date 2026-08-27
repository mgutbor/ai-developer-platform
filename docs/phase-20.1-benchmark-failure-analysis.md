# Phase 20.1 — Benchmark Failure Analysis & Runner Correctness

## 1. Executive summary

Phase 20.1 inspected the exact Phase 20 runner diff and independently reproduced all three failure classes without exposing credentials. The authentication wiring is correct: the runner resolves `process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN` and passes the result explicitly to `new GitHubRestClient({ token })`.

Two failures were caused by a legitimate GitHub large-tree response interacting with the existing configured response-size limit. `microsoft/TypeScript` and `nodejs/node` both resolve successfully and return valid JSON trees, but their recursive tree responses are approximately 18 MB and 17 MB, exceeding the client’s 4 MB `maxJsonResponseBytes` limit. The third failure was a stale dataset identifier: GitHub currently exposes `nestjs/nest`, not `nestjs/nestjs`.

The minimal correction was limited to the benchmark dataset entry, changing `nestjs/nestjs` to the objectively canonical `nestjs/nest`. No analyzer, scoring, ingestion client, architecture, or AI behavior was modified.

```text
PHASE 20 = NOT COMPLETED
PHASE 20.1 = DIAGNOSIS COMPLETED
PRECISION = NOT VALIDATED
RECALL = NOT VALIDATED
```

## 2. Phase 20 baseline

- 15 repositories attempted;
- 45 scenarios attempted;
- 36 completed;
- 9 failed;
- failures were `invalid_response` for `microsoft/TypeScript` and `nodejs/node`, and `repository_not_found` for `nestjs/nestjs`;
- authenticated GitHub access succeeded;
- no token value was logged, persisted, or written to artifacts.

## 3. Exact diff analysis

The Phase 20 diff made these relevant changes to `apps/api/src/validate-real-repos.ts`:

- replaced the five-entry historical dataset with a 15-entry dataset;
- added `const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;`;
- stopped with `BENCHMARK BLOCKED — GITHUB_TOKEN/GH_TOKEN required` when neither variable is present;
- passed the token explicitly to `new GitHubRestClient({ token })`;
- added `maxFileCount` scenarios 10, 50, and 100;
- recorded sanitized status, error category, commit SHA, findings summaries, scores, counts, bytes, requests, and timings;
- wrote only a temporary JSON artifact under `/tmp`.

The exact authentication expressions are present in the runner:

```ts
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const client = new GitHubRestClient({ token });
```

There is no Authorization header logging. The artifact contains no token field and only sanitized finding/error information. The token-handling invariant therefore passed inspection.

One unrelated implementation detail was found: `resolvedClient` was instantiated but unused. It does not affect authentication or results, and was not changed during this diagnosis to avoid unrelated cleanup.

## 4. Failure matrix

| Repository | Scenario | Failing stage | HTTP status | Endpoint | Root cause | Product defect? |
|---|---:|---|---:|---|---|---|
| `microsoft/TypeScript` | 10 | response validation/ingestion | 200 | recursive Git tree | valid response exceeds configured 4 MiB JSON limit | No demonstrated product defect; legitimate large-tree limitation |
| `microsoft/TypeScript` | 50 | response validation/ingestion | 200 | recursive Git tree | same | No |
| `microsoft/TypeScript` | 100 | response validation/ingestion | 200 | recursive Git tree | same | No |
| `nodejs/node` | 10 | response validation/ingestion | 200 | recursive Git tree | valid response exceeds configured 4 MiB JSON limit | No demonstrated product defect; legitimate large-tree limitation |
| `nodejs/node` | 50 | response validation/ingestion | 200 | recursive Git tree | same | No |
| `nodejs/node` | 100 | response validation/ingestion | 200 | recursive Git tree | same | No |
| `nestjs/nestjs` | 10 | repository resolution | 404 | `/repos/nestjs/nestjs` | stale/non-canonical repository identifier | Dataset defect, not application defect |
| `nestjs/nestjs` | 50 | repository resolution | 404 | `/repos/nestjs/nestjs` | same | Dataset defect, not application defect |
| `nestjs/nestjs` | 100 | repository resolution | 404 | `/repos/nestjs/nestjs` | same | Dataset defect, not application defect |

All statuses, content types, and errors were inspected in sanitized form. No Authorization headers or credential values were printed.

## 5. Per-repository diagnosis

### `microsoft/TypeScript`

Authenticated checks returned:

- repository endpoint: HTTP 200;
- content type: `application/json; charset=utf-8`;
- owner: `microsoft`;
- name: `TypeScript`;
- default branch: `main`;
- current HEAD: `e95d8e57a89f4c174604d76e683d1f14d148373d`;
- recursive tree endpoint: HTTP 200;
- response size observed: approximately 18,010,247 bytes;
- tree entries: 51,434;
- GitHub marked the tree `truncated: true`;
- a direct blob request for a valid tree entry returned HTTP 200, JSON, base64 encoding, and valid metadata.

The application rejects the tree before file selection because its configured `maxJsonResponseBytes` default is 4 MiB. This is deterministic across 10/50/100 because tree retrieval precedes the file-count scenario.

### `nodejs/node`

Authenticated checks returned:

- repository endpoint: HTTP 200;
- content type: `application/json; charset=utf-8`;
- owner: `nodejs`;
- name: `node`;
- default branch: `main`;
- current HEAD: `29c517f5d44a7f6497f8908a1897a165cab0d9c7`;
- recursive tree endpoint: HTTP 200;
- response size observed: approximately 17,399,260 bytes;
- tree entries: 56,033;
- GitHub marked the tree `truncated: false`;
- a direct blob request for a valid tree entry returned HTTP 200, JSON, base64 encoding, and valid metadata.

As with TypeScript, the existing 4 MiB response-size guard rejects the tree before selection. The response is not malformed and the failure is deterministic.

### `nestjs/nestjs`

Authenticated checks returned:

- `/repos/nestjs/nestjs`: HTTP 404, JSON, sanitized message `Not Found`;
- `/repos/nestjs/nest`: HTTP 200, JSON;
- canonical owner/name: `nestjs/nest`;
- default branch: `master`;
- canonical URL: `https://github.com/nestjs/nest`.

The dataset reference was objectively stale. It was corrected from `nestjs/nestjs` to `nestjs/nest`; this is a dataset correction, not a production application fix.

## 6. Root causes

1. **Large recursive trees:** the existing client intentionally bounds JSON response size at 4 MiB. GitHub returns valid recursive tree JSON larger than that for very large repositories. This is a legitimate bounded-ingestion limitation and not an analyzer/scoring failure.
2. **Stale repository identifier:** `nestjs/nestjs` is not currently a repository endpoint. `nestjs/nest` is the canonical public repository returned by GitHub.
3. **No authentication defect:** authenticated requests, repository resolution, current HEAD resolution, and blob retrieval work without exposing the token.

## 7. Product defect determination

No reproducible analyzer, scoring, architecture, security, or benchmark-client defect was demonstrated. The large-tree behavior could motivate a future ingestion design change, but changing response limits or adding pagination would alter production behavior without a Phase 20 requirement to do so and without a focused regression contract.

The dataset correction was safe and objectively verified, so it was applied only to the benchmark runner.

## 8. Fixes applied

Changed one dataset tuple in `apps/api/src/validate-real-repos.ts`:

```text
nestjs/nestjs → nestjs/nest
```

No other production behavior was changed. No infrastructure was added.

## 9. Regression tests

No production regression test was added because no production defect was established. The canonical repository correction was validated by direct authenticated API checks and by rerunning the three affected scenarios.

## 10. Re-run results

The corrected dataset was rerun only for the affected entries:

| Repository | 10 | 50 | 100 | Result |
|---|---|---|---|---|
| `microsoft/TypeScript` | `invalid_response` | `invalid_response` | `invalid_response` | external/configured large-tree limitation remains |
| `nodejs/node` | `invalid_response` | `invalid_response` | `invalid_response` | external/configured large-tree limitation remains |
| `nestjs/nest` | completed | completed | completed | 10 files/3 findings; 50 files/3 findings; 100 files/4 findings |

`nestjs/nest` SHAs from the rerun were not copied into this report because this phase’s objective was failure diagnosis and the machine-readable rerun artifact remains temporary; the runner output and `/tmp/phase20-benchmark.json` contain the observed values for this execution.

## 11. Remaining limitations

- `microsoft/TypeScript` and `nodejs/node` remain unanalysable by the current bounded 4 MiB recursive-tree response policy;
- GitHub recursive trees can be truncated or very large;
- 15 × 3 Phase 20 completion has not yet been achieved after correction;
- ground-truth review remains unavailable;
- precision, recall, and false-negative rate remain `NOT VALIDATED`;
- no human evaluation or live AI evaluation was attempted;
- the benchmark remains network-dependent;
- no request/response wire-byte accounting is available from the current client;
- `~/.knowledge.md` was accessible for existence checking, but no ntfy notification was sent because this phase explicitly prohibited sending one and its exact notification instructions were not needed for the diagnosis.

## 12. Recommendation for Phase 20 completion

Do not broaden the benchmark again until the remaining large-tree cases receive an explicit decision. Choose one evidence-based path:

- retain the failures as documented external/configured limitations and complete Phase 20 with all statuses classified; or
- design a separate, security-reviewed large-tree ingestion change with focused tests for bounded pagination/response handling before touching production limits.

The exact next action is to decide whether the existing 4 MiB limit is an accepted benchmark limitation. If it is accepted, rerun the complete corrected 15 × 3 benchmark once and update the Phase 20 report with final statuses. If not, create a separate narrowly scoped ingestion issue; do not increase the response limit opportunistically.

## Final status

- Files modified: `apps/api/src/validate-real-repos.ts`.
- Files created: `docs/phase-20.1-benchmark-failure-analysis.md`.
- Tests: existing tests not yet rerun in this phase at document creation; no regression test added.
- Quality gates: pending final execution.
- Git status: changes remain uncommitted; no tag or push.
- Phase 20 can proceed: only after the large-tree limitation decision.
- Phase 20 remains blocked: yes, until all 45 scenarios are explicitly classified and the corrected dataset is rerun as required.
- Exact next action: decide and document acceptance versus narrowly scoped remediation of the 4 MiB recursive-tree response limitation.
