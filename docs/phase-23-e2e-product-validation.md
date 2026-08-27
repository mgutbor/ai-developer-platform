# Phase 23 — E2E + Product Validation

## 1. Objective

Validate the real product flow from the Angular frontend through the complete backend pipeline and back to the user-facing report, and answer one question:

> **"Can a real user successfully submit a GitHub repository URL and receive a trustworthy, understandable result through the complete product?"**

This phase adds no functionality. It validates, exercises error paths, and fixes only genuine integration defects.

## 2. Scope

Validated product scenarios:
1. Successful analysis (real GitHub repository through the running product).
2. Invalid repository URL.
3. Non-existent repository (GitHub 404).
4. Ingestion limit (bounded-resource outcome).
5. Partial / insufficient coverage.
6. Upstream/API error.
7. Zero-finding result.
8. Report data consistency (API ↔ UI).
9. Accessibility / UX baseline.
10. Security baseline.

Out of scope: new analyzer rules, scoring changes, ingestion redesign, AI, UX redesign, new infrastructure.

## 3. Existing architecture validated

```text
Angular (apps/web)
  ↓ http (AnalysisService: createAnalysis, getAnalysis, getReport)
API (apps/api, Fastify)
  ↓
AnalysisApplication / AnalysisRunner (in-process queue, maxConcurrentJobs=1)
  ↓
GitHubRestClient (REST, bounded) → Ingestion (segmented tree traversal, Phase 21)
  ↓
Analyzer (deterministic rules) → Scoring (5 dimensions)
  ↓
SqlitePersistence → Report mapping (mapper.ts) → /analyses/:id/report
  ↓
Angular report page
```

The `server.ts` entrypoint starts `buildApp({ databasePath })`. Endpoints exercised in this phase: `GET /health`, `POST /analyses`, `GET /analyses/:id`, `GET /analyses/:id/report`.

## 4. Test strategy

- **Real E2E (mandatory):** the actual product server (`tsx src/server.ts`) was started on `127.0.0.1:3199` with a real SQLite DB and driven over real HTTP (curl/Python urllib) against real public GitHub repositories. This exercises the real pipeline: HTTP → job → GitHub REST → ingestion → analyzer → scoring → persistence → report.
- **Regression tests:** new `apps/api/src/app.token.test.ts` (credential wiring, offline stub fetch) + existing API/pipeline/domain/github/analyzer/scoring/persistence/web suites.
- **Frontend:** Angular unit tests (`ng test`) + code-level verification that the API response contract matches `AnalysisService` and the report page's consumed fields.
- **Not executed:** browser-level Playwright E2E — no Playwright harness is configured in the repo (only a transitive lockfile reference), and adding browser infrastructure is outside this phase's scope.

## 5. Validation matrix

| Scenario | Expected behaviour | Actual result | PASS/FAIL | Evidence |
|----------|--------------------|---------------|-----------|----------|
| Successful analysis | URL accepted → job → real GitHub resolution → snapshot → analyzer → scoring → persisted → report renders with findings/scores/coverage | `octocat/Hello-World` POST → 202 queued → `completed_with_limitations` → report 200; real commit SHA `7fd1a60b…`; coverage `insufficient`; 3 findings; 3 evidence; 3 recommendations; dimension scores `{architecture:10, maintainability:10, testing:8.5, documentation:10, dependencies:null, code_quality:9.5}`; confidence `low` | **PASS** | Real E2E driver, `/tmp/e2e_run.py` scenario 1 |
| Invalid URL | Clean rejection, useful error, no broken job, no implementation detail leak | `not-a-url`, `https://example.com/foo/bar`, `https://github.com` → HTTP 400 `INVALID_REPOSITORY_URL` (`repositoryUrl or ref is invalid`); no job created | **PASS** | scenario 2 |
| Repository not found | GitHub 404 → meaningful job error state, no stack/token leak | `octocat/this-repo-does-not-exist-xyz123` → job `failed`, `errorCode=REPOSITORY_NOT_FOUND`, no stack in response | **PASS** | scenario 3 |
| Ingestion limit | Bounded outcome (`SNAPSHOT_LIMIT_EXCEEDED`), no hang, incomplete result never presented as complete | `react/react` (maxFileCount=50) → job `failed` in ~50s with `errorCode=SNAPSHOT_LIMIT_EXCEEDED`; report 404 `RESULT_NOT_AVAILABLE`; no stack/token | **PASS** | `/tmp/e2e_limit.py react/react` |
| Partial / insufficient coverage | Coverage + limitations preserved from ingestion to report; UI distinguishes from complete | Hello-World coverage `insufficient`; `nodejs/node` (after token fix) `completed_with_limitations`, coverage `partial`, limitations surfaced (e.g. `tree_segmented_acquisition`, `file_count_limit_reached`) | **PASS** | scenarios 1, 5; limit driver nodejs/node |
| Upstream/API error | Controlled error, no infinite loading, no credentials leaked, job consistent | GitHub not-found → `REPOSITORY_NOT_FOUND` job failed (real 404); rate-limit path classified `GITHUB_RATE_LIMITED` (observed pre-fix on nodejs/node); both controlled, no leak | **PASS** | scenarios 3 + pre-fix nodejs/node run; pipeline.test.ts "marks GitHub failures" |
| Zero findings | UI distinguishes "completed, no findings" vs "failed" vs "insufficient coverage" | The report page renders `No findings detected.` when `findings.length === 0` (empty state) and shows coverage separately; a genuine zero-finding repository was not exercised in the frozen sample (all completed repos produced ≥2 findings) | **NOT EXECUTED** (no suitable repo in sample; UI code supports the distinction — `report.page.html` empty state + coverage field) |
| Report data consistency | Repository identity, commit SHA, findings, severity, dimension, ruleId, evidence, scores, coverage, limitations preserved API→UI | Mapper is the single source for `/report`, `/findings`, `/recommendations`, `/facts` (all use the same `mapFinding`/`mapEvidence`); the real E2E report JSON matched the exact `AnalysisResultResponse` fields the Angular `AnalysisService` and `report.page` consume (snapshot.owner/name/commitSha, findings[].severity/category/confidence/ruleId/evidenceIds/recommendationIds, dimensionScores, coverage, limitations) | **PASS** | mapper.ts + real E2E report + report.page.html |
| Accessibility baseline | Keyboard can reach primary interaction; understandable loading/error/success; accessible names; no blocking issue | Home page: form input + submit (native focus/keyboard); progress page: `role="status" aria-live="polite"`, terminal status messages; report page: `role="status"`/`role="alert"`, labelled sections (`aria-labelledby`), back link, retry button; no obvious blocker for the core flow | **PASS** (baseline, by inspection; no redesign) | home/progress/report pages |
| Security baseline | No tokens to frontend/API responses/persistence; errors don't expose secrets; code treated as data; no credentials in artifacts | Regression tests prove the API sends `Authorization: Bearer <GITHUB_TOKEN>` (and `GH_TOKEN` fallback) but never returns it; real E2E asserts no `Bearer`/`ghp_` in any response; error paths return sanitized codes/messages (no stack); token only read from env, never logged/persisted; repository code treated as data | **PASS** | app.token.test.ts + E2E assertions + security.md |

## 6. Real E2E execution

Executed against the real product server on `127.0.0.1:3199` (SQLite DB in `/tmp`), authenticated with the environment credential, sequential runs.

### Successful analysis — `octocat/Hello-World`

```text
POST /analyses {"repositoryUrl":"https://github.com/octocat/Hello-World"}
→ 202 { id: "analysis-job:…", status: "queued" }
GET /analyses/:id (poll) → completed_with_limitations, resultAvailable=true,
    commitSha=7fd1a60b01f91b314f59955a4e4d4e80d8edf11d
GET /analyses/:id/report → 200
  snapshot: octocat / hello-world
  commitSha: 7fd1a60b…
  coverage: insufficient
  limitations: ["tree_segmented_acquisition", "Global score is intentionally not calculated in the MVP."]
  findings: 3 | evidence: 3 | recommendations: 3
  dimensionScores: {architecture:10, maintainability:10, testing:8.5,
                    documentation:10, dependencies:null, code_quality:9.5}
  confidence: low
```

- The `dependencies` dimension is `null` (not a silent zero) — consistent with the "null scores stay null / insufficient coverage does not become zero" invariant from Phase 22.
- No `Bearer`, `ghp_`, `Authorization` or stack content appeared in any response.

### Ingestion limit — `react/react` (post-fix)

```text
POST /analyses {"repositoryUrl":"https://github.com/react/react"} → 202
GET /analyses/:id (poll, ~50s) → failed, errorCode=SNAPSHOT_LIMIT_EXCEEDED
GET /analyses/:id/report → 404 { code: RESULT_NOT_AVAILABLE }
```

Controlled bounded outcome: the product never presents a partial snapshot as complete, and the job state is consistent (`failed`, no result).

### Partial coverage — `nodejs/node` (post-fix)

With the credential wired, `nodejs/node` at `maxFileCount=50` **completes** in ~30s with `completed_with_limitations` (coverage `partial`), real commit SHA `d6e67a5e…`, report 200. The Phase 21 bounded traversal keeps its request count within `maxApiRequests=125`, so the snapshot completes with documented limitations.

## 7. Results

All core scenarios **PASS**. The one NOT EXECUTED scenario (zero findings) is a sample-availability gap, not a product defect: the UI already distinguishes the empty-findings state from failure and from insufficient coverage.

## 8. Defects discovered

### Defect 1 — production server never used the configured GitHub credential (FIXED)

- **Symptom (reproduced):** the first real E2E ingestion-limit run (`nodejs/node`) failed in 16s with `GITHUB_RATE_LIMITED`. The standalone validation runners (Phases 20–22) authenticated fine, so this was specific to the product server.
- **Root cause:** `apps/api/src/app.ts` `applicationFrom()` constructed `new GitHubRestClient()` with **no token**. `GitHubRestClient` only accepts a token via `options.token` (it does not read the environment), so the production server ran **unauthenticated** against GitHub's API (≈60 req/h unauthenticated limit). A real user's analysis of any non-trivial repository would hit that limit almost immediately. This is a genuine integration defect, not a bounded-resource outcome.
- **Fix (minimal):** `applicationFrom()` now resolves the server-side credential exactly like the Phase 22 runners — `const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN` — and passes it to `GitHubRestClient({ token })` (empty/whitespace → unauthenticated client). The token is read from the environment only and never logged, returned, or persisted. An optional `githubFetch` test seam was added to `BuildAppOptions` (defaults to global `fetch`; no production behaviour change).
- **Regression tests:** `apps/api/src/app.token.test.ts` — (1) with `GITHUB_TOKEN` set, the GitHub client's first request carries `Authorization: Bearer <token>`; (2) falls back to `GH_TOKEN` when `GITHUB_TOKEN` is unset.
- **Post-fix re-validation:** `react/react` now fails with the documented `SNAPSHOT_LIMIT_EXCEEDED` (bounded outcome at `maxApiRequests=125`) instead of `GITHUB_RATE_LIMITED`; `nodejs/node` completes with `completed_with_limitations`.

No other defects were demonstrated. No analyzer/scoring/ingestion-limit changes were made.

## 9. Fixes applied

- `apps/api/src/app.ts`: wire `GITHUB_TOKEN ?? GH_TOKEN` into the production `GitHubRestClient`; add `githubFetch` test seam.
- `apps/api/src/app.token.test.ts`: new regression suite (2 tests).

## 10. Known limitations

- **Zero-finding scenario NOT EXECUTED** — no repository in the sample produced a genuinely empty finding set; the UI empty-state is implemented and code-verified.
- **No browser-level E2E** — Playwright is not configured; frontend validation is via Angular unit tests + API-contract verification against the real server.
- **Coverage is partial/insufficient for most repositories** (bounded snapshots); the product surfaces this honestly, and it remains a documented product limitation (`maxApiRequests=125` vs `maxFileCount=50` for very large repos — `react/react`, `vitejs/vite`).
- `react/react` and `vitejs/vite` cannot complete a 50-file snapshot within the request budget; recorded, not "fixed" in this phase.

## 11. Security verification

- `GITHUB_TOKEN`/`GH_TOKEN` are read from the environment, passed to the client, never printed, returned, persisted or committed (verified by regression test + E2E response assertions + secret scans of diffs/artifacts).
- API responses and error paths never include stack traces, tokens, or internal implementation details.
- Repository code is treated strictly as data; never executed; no dependencies of analyzed repos installed.
- No credentials in any generated artifact.

## 12. Accessibility baseline

- Home: form control + submit reachable by keyboard; native labels; inline validation message.
- Progress: `role="status"` `aria-live="polite"`; understandable terminal messages per job status.
- Report: `role="status"`/`role="alert"` for loading/error; sections labelled via `aria-labelledby`; back link and retry buttons; findings/evidence/recommendations are semantic lists.
- No obvious blocker for the core flow. (Full polish is Phase 24.)

## 13. Final conclusion

**PASS WITH LIMITATIONS.**

> The current MVP product flow is demonstrably functional end-to-end: a real user can submit a public GitHub repository URL, the request flows through the API → job → authenticated GitHub REST → bounded ingestion → deterministic analyzer → scoring → persistence → report, and the frontend consumes that report correctly (real `octocat/Hello-World` analysis completed with a real commit SHA, findings, evidence, recommendations, dimension scores, coverage and limitations, with no credential leakage).

Limitations: browser-level E2E not configured; zero-finding repo not exercised (sample gap); bounded ingestion means partial coverage for most repos and `SNAPSHOT_LIMIT_EXCEEDED` for very large repos — all surfaced honestly. One genuine production defect (missing credential wiring) was found, fixed minimally, and regression-tested.

## 14. Recommendation for Phase 24

Move to **UX + documentation + portfolio polish**:

- UX polish: make partial/insufficient coverage and `SNAPSHOT_LIMIT_EXCEEDED` states clearer to end users (e.g. explicit "analysis could not include all files" messaging); refine the report's null-score display.
- Documentation: README quick-start (including server-side `GITHUB_TOKEN`/`GH_TOKEN` configuration, which Phase 23 proved is required for real analyses), deployment notes.
- Optional: configure browser E2E (Playwright) for the core flow as future regression infrastructure.
- No analyzer/scoring/ingestion-limit changes recommended from this phase's evidence.

---

*Phase 23 status: **PASS WITH LIMITATIONS**. Real E2E executed against the product on real public GitHub repositories; one integration defect fixed with regression tests; all quality gates green.*