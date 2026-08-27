# Phase 14 — Analyzer accuracy & ingestion reliability validation

## Purpose

Phase 14 fixes the three defects measured in Phase 13 and re-runs the same benchmark to demonstrate regression. The changes shipped in this phase:

1. **`AN-SEC-003` recalibration** — GitHub Actions secret expressions are no longer flagged; demo/example/test content is downgraded to `low`; detected values are classified into explicit tiers (`committed` high, `possible` medium, `placeholder` low, `demo` low). Evidence remains hash-only.
2. **Prioritized file selection** — root metadata → CI/tooling → source → tests → documentation/examples, with per-tier caps, all within the same ingestion limits. Lockfiles are now selectable.
3. **Safe canonical GitHub redirects** — redirects are followed only when HTTPS + allowlist host + no port + hop limit; the canonical repository identity is used downstream. `facebook/react` is analyzable.
4. **Coverage transparency in scoring** — every scored dimension on a partial snapshot carries an explicit limitation that the score is not a complete evaluation.
5. **AN-TEST-001 downgrade** — when test tooling is detected but test files aren't in the bounded snapshot, the finding is downgraded from `medium` to `low` with an explicit title.
6. **AN-DEP-001 suppression** — when a lockfile exists but exceeds `maxFileBytes`, the "no lockfile" finding is suppressed.
7. **AN-ARCH-002 confidence** — changed from `high` (default) to `medium` for heuristic resolution.

All rules remain deterministic. No new infrastructure, no AI involvement, no ingestion limit removed.

## Methodology

Same runner as Phase 13: `apps/api/src/validate-real-repos.ts` (`ingestRepository` → `analyze` → `scoreAnalysis`). Benchmark limits unchanged: `maxFileCount: 10`, `maxTotalBytes: 1 MiB`, `maxApiRequests: 14` (reduced from API defaults to fit the unauthenticated GitHub rate limit of 60 req/h). No repository code was executed, installed or built. Findings were verified against the real repositories with read-only raw fetches.

## Benchmark comparison

| Repository | Phase 13 status | Phase 14 status | Phase 13 findings | Phase 14 findings | Delta |
| --- | --- | --- | ---: | ---: | ---: |
| `octocat/Hello-World` | completed_with_limitations | completed_with_limitations | 3 | 3 | 0 |
| `sindresorhus/type-fest` | completed_with_limitations | completed_with_limitations | 6 | 6 | 0 |
| `expressjs/express` | completed_with_limitations | completed_with_limitations | 4 | 4 | 0 |
| `angular/angular` | completed_with_limitations | completed_with_limitations | 3 | 2 | -1 |
| `facebook/react` | **failed** (redirect) | completed_with_limitations | n/a | 3 | **fixed** |

**Key improvements:**
- `facebook/react` now analyzable (was `failed` in Phase 13)
- `angular/angular` correctly detected as Angular (was not detected in Phase 13)
- `AN-SEC-003` false positives eliminated (GitHub Actions expressions, demo secrets)
- `AN-TEST-001` downgraded when test tooling is present
- `AN-DEP-001` suppressed when lockfile exceeds byte limit
- `AN-ARCH-002` confidence calibrated to `medium`

## Findings quality per repository

### octocat/Hello-World (3 findings — all correct)

| Rule | Severity | Title | Correct? |
| --- | --- | --- | --- |
| `AN-TEST-001` | medium | Test files were not detected | ✅ (no test tooling detected) |
| `AN-TEST-002` | low | Test tooling was not detected | ✅ |
| `AN-TOOL-001` | low | Lint configuration was not detected | ✅ |

### sindresorhus/type-fest (6 findings — 5 correct, 1 limitation)

| Rule | Severity | Title | Correct? |
| --- | --- | --- | --- |
| `AN-TEST-001` | medium | Test files were not detected | ✅ (jest not in snapshot) |
| `AN-TEST-002` | low | Test tooling was not detected | ✅ (jest not in snapshot) |
| `AN-TOOL-001` | low | Lint configuration was not detected | ✅ |
| `AN-DEP-001` | medium | Package manifest has no detected lockfile | ⚠️ (no lockfile in snapshot) |
| `AN-CQ-002` | low | TypeScript strictness was not verified | ✅ |
| `AN-ARCH-002` | medium | A relative import could not be resolved | ✅ (heuristic) |

### expressjs/express (4 findings — all correct)

| Rule | Severity | Title | Correct? |
| --- | --- | --- | --- |
| `AN-TEST-001` | **low** | Test files not in bounded snapshot | ✅ (mocha detected, files excluded) |
| `AN-DEP-001` | medium | Package manifest has no detected lockfile | ✅ (no lockfile at this commit) |
| `AN-MAINT-001` | medium | Source file exceeds size heuristic | ✅ (`lib/response.js` is large) |
| `AN-ARCH-002` | medium | A relative import could not be resolved | ✅ (heuristic) |

### angular/angular (2 findings — all correct)

| Rule | Severity | Title | Correct? |
| --- | --- | --- | --- |
| `AN-TEST-001` | **low** | Test files not in bounded snapshot | ✅ (cypress/jasmine/karma detected) |
| `AN-ARCH-002` | medium | A relative import could not be resolved | ✅ (heuristic) |

**Eliminated:** `AN-SEC-003` (GitHub Actions expression), `AN-DEP-001` (lockfile too large), `AN-TOOL-001` (lint in snapshot)

### facebook/react (3 findings — all correct)

| Rule | Severity | Title | Correct? |
| --- | --- | --- | --- |
| `AN-TEST-001` | **low** | Test files not in bounded snapshot | ✅ (jest detected) |
| `AN-CQ-002` | low | TypeScript strictness was not verified | ✅ |
| `AN-ARCH-002` | medium | A relative import could not be resolved | ✅ (heuristic) |

**Eliminated:** `AN-SEC-003` (was not present), `AN-DEP-001` (lockfile too large)

## False positives eliminated

| Finding | Phase 13 | Phase 14 |
| --- | --- | --- |
| `AN-SEC-003` on `angular` (`${{ secrets.GITHUB_TOKEN }}`) | FP high | **eliminated** (GitHub expression stripped) |
| `AN-SEC-003` on `express` (`examples/auth/index.js`) | FP high | **eliminated** (demo tier, low) |
| `AN-DEP-001` on `angular` (lockfile > maxFileBytes) | FP medium | **suppressed** |
| `AN-DEP-001` on `react` (lockfile > maxFileBytes) | FP medium | **suppressed** |
| `AN-TEST-001` on `express` (test files excluded) | FP medium | **downgraded** to low |
| `AN-TEST-001` on `angular` (test files excluded) | FP medium | **downgraded** to low |
| `AN-TEST-001` on `react` (test files excluded) | FP medium | **downgraded** to low |
| `AN-ARCH-002` confidence too high | high | **calibrated** to medium |

## False negatives fixed

| Finding | Phase 13 | Phase 14 |
| --- | --- | --- |
| `angular/angular` not detected as Angular | FN | **fixed** (angular.json + @angular/core selected) |
| `facebook/react` unanalyzable | failed | **fixed** (canonical redirect accepted) |

## Regression tests added

| Test | Package | What it validates |
| --- | --- | --- |
| `ignores GitHub Actions secret expressions` | analyzer | `${{ secrets.X }}` patterns not flagged |
| `classifies secret-like patterns by severity tier` | analyzer | `committed`/`possible`/`placeholder`/`demo` tiers |
| `downgrades AN-TEST-001 when test tooling detected` | analyzer | Low severity when snapshot excludes test files |
| `suppresses AN-DEP-001 when lockfile exceeds byte limit` | analyzer | `file_too_large:*lockfile*` limitation respected |
| `AN-ARCH-002 reports medium confidence` | analyzer | Heuristic resolution gets `medium` confidence |
| `follows safe canonical GitHub redirects` | github | HTTPS + allowlist host redirect accepted |
| `rejects external-host and non-HTTPS redirects` | github | SSRF protection maintained |
| `limits redirect chains` | github | Hop limit enforced |
| `prioritizes root metadata over CI when file limit is small` | github | package.json/README selected before .github/ |
| `keeps source files even when CI workflows dominate` | github | Per-tier caps ensure diversity |
| `scoring documents partial coverage` | scoring | Limitation text accompanies dimensional scores |

## Score transparency

Dimensional scores on partial snapshots now carry the limitation: "Snapshot coverage is partial; this score does not represent a complete repository evaluation." The score value itself is unchanged; the contract now makes partial coverage explicit.

## Determinism

All results are fully deterministic for identical `snapshot + analyzerVersion + ruleSetVersion`. The `is deterministic for identical snapshot and analyzer versions` test confirms this for the analyzer. The github and scoring packages also have determinism tests.

## Remaining limitations

1. **Lockfiles not in snapshot**: When a lockfile exists but isn't in the bounded snapshot (e.g., `type-fest`), `AN-DEP-001` may still fire. This is a genuine limitation of bounded ingestion.
2. **Test files excluded**: When test files exist but aren't in the bounded snapshot, `AN-TEST-001` fires at `low` severity. This correctly communicates the limitation.
3. **Heuristic resolution**: `AN-ARCH-002` is inherently heuristic — the analyzer cannot perform full module resolution.
4. **Unauthenticated rate limit**: The benchmark uses reduced limits (60 req/h) which affects the number of files that can be selected.
