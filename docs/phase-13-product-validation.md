# Phase 13 — Product validation & real-world evaluation

## Executive summary

Phase 13 ran the released v1.0.0 deterministic pipeline against real public GitHub repositories. The product works end-to-end: every analyzed repository produced a commit-anchored snapshot, findings, evidence, recommendations and dimensional scores without executing any repository code.

The validation also found concrete product defects:

1. **`AN-SEC-003` produces high-severity false positives.** A standard GitHub Actions expression (`token: '${{secrets.GITHUB_TOKEN}}'` in `angular/angular`) and a demo session secret (`examples/auth/index.js` in `expressjs/express`) are both reported as "A potential committed secret was detected" with `high` severity. This is the most damaging defect for an evidence-based product.
2. **File selection starves root metadata.** The selection policy takes files in tree order. Dot-directories (`.github/`, `.devcontainer/`, `.gemini/`) dominate the cap and starve `package.json`, `README`, `tsconfig.json` and test directories. This produced false positives ("README missing", "tests missing", "tooling missing") and false negatives (Angular was not detected on `angular/angular` itself).
3. **`facebook/react` cannot be ingested.** GitHub returns `301` on `GET /repos/facebook/react` (canonical redirect to the numeric repository URL). The SSRF-safe redirect policy rejects it and the user receives only `GITHUB_UNAVAILABLE`, with no actionable information.
4. **Scores are mechanically consistent but can mislead on truncated snapshots.** Repositories with heavy truncation still receive scores like `9.5/10`, which a user may read as a quality verdict even though `coverage: partial` and explicit limitations are present.

## Methodology

- Runner: `apps/api/src/validate-real-repos.ts` (uses only the existing `ingestRepository` → `analyze` → `scoreAnalysis` pipeline).
- Limits used in this benchmark (reduced from API defaults to fit the unauthenticated GitHub rate limit of 60 requests/hour): `maxFileCount: 10`, `maxTotalBytes: 1 MiB`, `maxApiRequests: 14`. The API default is `maxFileCount: 50`, `maxTotalBytes: 2 MiB`, `maxApiRequests: 125`.
- No repository code was executed, installed or built.
- Findings were verified against the real repositories using read-only raw file fetches and tree simulation.

## Benchmark dataset

| Repository | Note | Commit SHA | Size (KB) | Files selected | Tree entries | Coverage | Status |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| `octocat/Hello-World` | tiny baseline, no tests | `7fd1a60b` | 1 | 1 | 1 | insufficient | completed_with_limitations |
| `sindresorhus/type-fest` | clean TypeScript, tests | `3fe02d33` | 3,089 | 10 | 495 | partial | completed_with_limitations |
| `expressjs/express` | JavaScript/Node.js, tests, CI | `023767fe` | 9,857 | 10 | 281 | partial | completed_with_limitations |
| `angular/angular` | large TypeScript, Angular | `66d505e2` | 655,323 | 10 | 12,919 | partial | completed_with_limitations |
| `facebook/react` | large JavaScript, React | n/a (failed) | n/a | n/a | n/a | n/a | failed (redirect) |

Category coverage achieved: TypeScript clean (`type-fest`), JavaScript/Node.js (`express`), Angular (`angular`), tiny/no-tests (`Hello-World`), large (`angular`, `react`), with/without CI, with/without lockfile. The React and "Angular detection" cases are covered by the failure evidence and the framework-detection false negative below.

## Findings quality

| Repo | Findings | Verdict |
| --- | --- | --- |
| `Hello-World` | no tests, no test tooling, no lint | **correct** (the repository has none of these) |
| `type-fest` | no README, no test tooling, strictness not verified, unresolved import | **false positive / questionable** — `readme.md`, `package.json`, `tsconfig.json` exist but were starved by selection |
| `express` | no tests, no test tooling, no lint, unresolved import, potential secret | **mixed** — no-lint is correct (no ESLint config at that commit); tests/tooling are false positives (starved); secret is a pattern match on a demo fixture |
| `angular` | no tests, no lint, potential secret | **false positive** — test suite is huge (starved); secret is a standard `${{ secrets.* }}` expression |

### Correct findings

- `Hello-World`: all three findings are true positives.
- `express` "Lint configuration was not detected": verified correct at commit `023767fe` (no `.eslintrc*`/`eslint.config.*` exists).

### False positives observed

- `AN-DOC-001` "README was not detected" on `type-fest`: `readme.md` exists at the analyzed commit; it was not selected because `.github/workflows/*` files fill the cap first.
- `AN-TEST-001` "Test files were not detected" on `express` and `angular`: both have extensive test suites; test directories were not selected.
- `AN-TEST-002` "Test tooling was not detected" on `type-fest` and `express`: `package.json` (with `xo`/`tsd`/`mocha`) was not selected.
- `AN-TOOL-001` "Lint configuration was not detected" on `angular`: Angular has ESLint configuration; it was not selected.
- `AN-ARCH-002` "Unresolved relative import" on `type-fest` (`index.d.ts`) and `express` (`examples/auth/index.js`): both resolve in reality; the resolver only sees the selected subset.
- `AN-SEC-003` "Potential committed secret" on `angular` (`.github/workflows/adev-preview-deploy.yml`): the matched value is `token: '${{secrets.GITHUB_TOKEN}}'` — a standard GitHub Actions expression, not a credential.
- `AN-SEC-003` on `express` (`examples/auth/index.js`): the matched value is `secret: 'shhhh, very secret'` — a demo fixture; the pattern is technically matched but `high` severity is misleading.

### False negative detected

- `angular/angular`: `framework_detected` was `not_detected`. The repository is the Angular framework itself; detection failed because `package.json`/`angular.json` were not selected. The `typescript_strict: observed = true` fact was derived from `.github/actions/deploy-docs-site/tsconfig.json` — a CI-internal configuration, not the main build configuration.

## False positive analysis per rule

| Rule | Activations | Plausibly correct | Questionable | Confirmed FP |
| --- | ---: | ---: | ---: | ---: |
| README missing (`AN-DOC-001`) | 1 | 0 | 0 | 1 |
| Tests missing (`AN-TEST-001`) | 3 | 1 (`Hello-World`) | 0 | 2 |
| Test tooling missing (`AN-TEST-002`) | 3 | 1 (`Hello-World`) | 0 | 2 |
| Lint missing (`AN-TOOL-001`) | 3 | 2 (`Hello-World`, `express`) | 0 | 1 |
| Strictness not verified (`AN-CQ-002`) | 1 | 0 | 1 | 0 |
| Unresolved import (`AN-ARCH-002`) | 2 | 0 | 0 | 2 |
| Potential secret (`AN-SEC-003`) | 2 | 0 | 0 | 2 |

Root causes, not rule-by-rule exceptions:

1. **Selection starvation (primary).** Selection iterates the tree in API order without prioritizing root metadata. Dot-directories and examples dominate the cap. Fix direction (not implemented in this phase): prioritize manifest/metadata/config/lockfile paths in the selection pass, and reserve slots for root files.
2. **`AN-SEC-003` pattern is naive.** The regex treats any `secret|token|api_key = "12+ chars"` as a high-severity finding. It must exclude GitHub Actions expressions (`${{ ... }}`), demo/test/example paths, and require stronger evidence (file naming, surrounding context, longer/higher-entropy values) before assigning `high`.

## Scoring validation

Observed dimension scores:

| Repo | Architecture | Maintainability | Testing | Documentation | Dependencies | Code Quality |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `Hello-World` | 10 | 10 | 8.5 | 10 | null | 9.5 |
| `type-fest` | 9 | 10 | 9.5 | 9.5 | null | 9.5 |
| `express` | 9 | 10 | 8.5 | 10 | null | 9.5 |
| `angular` | 10 | 10 | 9 | 10 | null | 9.5 |

Observations:

- Scores are mechanically consistent with the penalty table and never below `8.5` in this sample. That is expected: the rule set is deliberately conservative and this sample contains reputable repositories.
- `dependencies` is `null` (insufficient coverage) for every repository because `package.json` was not selected — the dimension is effectively inert under the current selection behavior.
- `testing` penalties are driven partly by false-positive findings (`express`, `angular`), so the score can punish a repository for signals the analyzer failed to observe.
- Scores are computed even on heavily truncated snapshots. `coverage: partial` and limitations are present, but the numeric score still reads as a quality verdict. The report must make the connection between score and coverage more explicit.

No scoring formula change was made in this phase.

## Coverage and limitations

- `coverage: insufficient` appears when there are no selectable source files (`Hello-World`). This is expected and correctly communicated.
- `coverage: partial` appears for every other repository, driven by `file_count_limit_reached`, `import_count_limit_reached` and `relative_import_resolution_is_heuristic` limitations.
- `status: completed_with_limitations` was produced for every analyzed repository — including `Hello-World` with a single file. This is honest but risks being read as a failure. The API and frontend surface the limitations; the frontend displays them under an explicit "Limitations" section.
- `score: null` is rendered as "Score unavailable" in the frontend, distinct from a numeric score. This is correct.
- With the API default cap (`maxFileCount: 50`), the worst truncation artifacts would be reduced but not eliminated: repositories with many dot-directory files (e.g., `angular` with 12,919 tree entries) can still starve root metadata.

## AI evaluation

**Real provider semantic evaluation: NOT VALIDATED** — no provider credentials were available, none were invented, and no live request was made.

Technical integration is validated with `FakeAIProvider` through existing tests (context construction, reference validation, bounded context, prompt delimiters, deterministic report unchanged). The `POST /analyses/:id/ai` and `GET /analyses/:id/ai` contract is covered by API integration tests.

## AI vs deterministic report

The AI layer is correctly bounded: it can only reference existing findings/evidence/recommendations, cannot create new paths/ranges/scores, and its context is derived from the deterministic report.

Verdict for this phase: **not enough evidence** that the AI layer improves the user experience, and one concrete risk — the AI inherits the deterministic report's false positives (e.g., "README missing", "tests missing", "potential secret") and would present them as inputs to its synthesis. Until the deterministic findings quality improves, the AI interpretation should be treated as an experiment, not a differentiator.

## Performance baseline

Measured locally (Node 25.3.0, single process, unauthenticated GitHub):

| Repo | Ingestion | Analyzer | Scoring | Total |
| --- | ---: | ---: | ---: | ---: |
| `Hello-World` | 1,048 ms | 8 ms | 1 ms | 1,057 ms |
| `type-fest` | 4,983 ms | 29 ms | 1 ms | 5,013 ms |
| `express` | 4,227 ms | 4 ms | 1 ms | 4,232 ms |
| `angular` | 5,050 ms | 2 ms | 1 ms | 5,053 ms |

Analysis is network-bound; the analyzer and scorer are sub-50 ms for this snapshot size. No caching, workers or queues are justified by this data.

## Product usefulness

1. **What it solves:** it gives a developer a reproducible, evidence-linked overview of a repository's structural signals (tests, docs, tooling, dependencies, large files, potential secrets).
2. **For whom:** a developer evaluating a repository before contributing or adopting it; a maintainer looking for an external, deterministic second opinion.
3. **What is genuinely useful:** commit-anchored snapshots, evidence paths, limitations, dimension scores with explicit coverage, and the honest `completed_with_limitations` model.
4. **What is noise:** "README missing"/"tests missing"/"tooling missing" when they are selection artifacts; `high` severity secret findings on standard CI expressions or demo fixtures.
5. **What is missing for actionable reports:** prioritized root-metadata selection; severity calibration for `AN-SEC-003`; a clearer "score meaning given coverage" explanation; and per-repository detail that shows why a signal was not observed.
6. **What could mislead:** numeric scores on truncated snapshots; `high` security findings that are false positives; the `GITHUB_UNAVAILABLE` error for `facebook/react`.
7. **Differentiator:** deterministic, evidence-traceable, reproducible analysis with explicit limitations — the security findings must be trustworthy for this to hold.
8. **Technically interesting but low value today:** the AI interpretation layer, until deterministic findings quality improves.

## Architecture assessment

| Component | Verdict | Justification |
| --- | --- | --- |
| Angular frontend | KEEP | Renders the report correctly, including null scores and limitations |
| Fastify API | KEEP | Contract and error handling validated |
| Application layer | KEEP | Runner, idempotency and job lifecycle behaved correctly |
| In-process runner | KEEP | Concurrency/timeout semantics adequate for the sample |
| GitHub REST ingestion | KEEP, fix | Works, but redirect handling produces an opaque failure for valid repos; selection starves root metadata |
| Deterministic analyzer | KEEP, fix | Findings are evidence-traceable, but `AN-SEC-003` and truncation-sensitive rules need calibration |
| Scoring | KEEP | Mechanically consistent; must communicate coverage dependence better |
| SQLite | KEEP | Persistence round-trips validated |
| AI provider | KEEP (experimental) | Boundary is safe; semantic value unproven |

No new infrastructure (workers, queues, Redis, PostgreSQL, caching) is justified by this phase's data.

## Critical issues

1. `AN-SEC-003` high-severity false positives on standard GitHub Actions expressions and demo fixtures.
2. File-selection starvation of root metadata produces false positives and false negatives (including failing to detect Angular on `angular/angular`).
3. `facebook/react` cannot be analyzed and the error is opaque.
4. Scores on truncated snapshots can mislead despite `coverage: partial`.

## Recommended changes (not implemented in this phase)

1. Recalibrate `AN-SEC-003`: exclude `${{ ... }}` expressions, exclude `examples/`, `test/`, `tests/`, `fixtures/`, `*.test.*` paths, require higher-entropy values, and reassign severity.
2. Prioritize root metadata in the selection policy (`package.json`, `README*`, lockfiles, `tsconfig*`, lint/format configs) before source and CI files.
3. Add a redirect-aware resolution path in the GitHub client (same-host redirects to `api.github.com/repositories/{id}` are legitimate) or a clearer error mapping for redirect-rejected repositories.
4. Communicate score/coverage coupling in the API and frontend ("score computed on partial snapshot").
5. Before any further AI promotion, fix the deterministic false positives the AI would inherit.

## Deferred changes

- Scoring formula changes (no evidence of formula defects; issues are input-selection and severity-calibration problems).
- New rules, new dimensions, global score.
- Workers, queues, Redis, PostgreSQL, caching, realtime.
- Real-provider AI semantic evaluation (blocked on credentials).

## v1.0.0 assessment

**READY WITH LIMITATIONS** remains the correct release classification. The defects found do not invalidate the MVP release: they are quality/calibration issues in the analyzer and ingestion selection, not correctness or security failures of the release process. They should be fixed before the product is presented as a trustworthy health-report tool and before any marketing claim about security findings.

## Recommendation for Phase 14

Fix the three highest-impact defects found here, in order:

1. Recalibrate `AN-SEC-003` (false positives destroy trust).
2. Prioritize root metadata in file selection (fixes most README/tests/tooling artifacts and the Angular false negative).
3. Handle GitHub canonical redirects and improve error messaging (fixes `facebook/react`).

Then re-run this same benchmark to measure the reduction in false positives. No new infrastructure is justified.
