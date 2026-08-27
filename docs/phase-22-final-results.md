# Phase 22 — Final Results: Product Validation / Ground-Truth Review

## Objective

Close Phase 22 cleanly using the evidence already collected, record Manuel's human classifications, compute only defensible descriptive metrics, and establish the real conclusions that move the project to the next product stage.

This is the **final step of Phase 22**. It does not create Phase 22.4, does not add analyzer features, and does not change ingestion, scoring, UX, E2E or AI. The dataset was frozen and executed in Phases 22.1–22.2; the classifications below are applied from the human-review instructions provided for this closure. No analyzer or scoring rule was modified.

## Dataset

The frozen 8-repository dataset (frozen on **2026-08-27**) defined in `docs/phase-22-ground-truth-dataset.md`:

| # | Repository | Frozen commit SHA | Snapshot | Findings |
| --- | --- | --- | --- | ---: |
| 1 | `octocat/Hello-World` | `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` | ok (insufficient) | 3 |
| 2 | `sindresorhus/type-fest` | `3fe02d33596f8afa167bc465d9d9ac9ab81b497e` | ok (partial) | 7 |
| 3 | `expressjs/express` | `023767fe9872e029271df1418f73401bff20ff40` | ok (partial) | 4 |
| 4 | `angular/angular` | `133cafda42028fbd8efd7840d6ff3fea25223166` | ok (partial) | 4 |
| 5 | `react/react` | `29d9d3184484b03cb0369e0494617207df777b7a` | no snapshot (`ingestion_limit_reached`) | 0 |
| 6 | `vuejs/core` | `d63616ca17de965ed32dcb449a4c5cd9982f15d2` | ok (partial) | 5 |
| 7 | `nestjs/nest` | `a333a9dae6169537da3954c5b1ac35202b057fcb` | ok (partial) | 2 |
| 8 | `vitejs/vite` | `ee644014aab61e546742b862a7d7b0d6c7d67a7b` | no snapshot (`ingestion_limit_reached`) | 0 |

Total findings: **25** across 6 repositories. `react/react` and `vitejs/vite` produced no findings because ingestion reached `maxApiRequests=125` before a complete `maxFileCount=50` snapshot (documented bounded-resource limitation; no limits changed in this phase).

## Execution summary

- Runner: `apps/api/src/validate-ground-truth.ts`; pipeline: ingestion → analyzer → scoring (unchanged).
- Execution timestamp (UTC): **2026-08-27 16:02**.
- Source of truth: `/tmp/phase22-ground-truth-results.jsonl` and the review package `/tmp/phase22-human-review/` (documented in `docs/phase-22-human-review-package.md`).
- All 8 frozen SHAs resolved and matched their anchors; no `commit_mismatch`.

## Human classification methodology

Classifications are applied from the human-review instructions for this closure, using only the four labels **TP / FP / UNCERTAIN / NOT_EVALUABLE**, based on the bounded-snapshot evidence captured in Phases 22.2–22.3.

Reviewer-notes rules applied consistently:

- **TP**: `Evidence sufficient: YES`, `Actionable: YES`, `Reviewer confidence: HIGH`.
- **UNCERTAIN**: `Evidence sufficient: NO`, `Actionable: YES`, `Reviewer confidence: LOW`.
- **NOT_EVALUABLE**: `Evidence sufficient: NO`, `Actionable: NO`, `Reviewer confidence: HIGH`.

- **AN-ARCH-002** was classified **NOT_EVALUABLE**, never FP: bounded static resolution failed, but this proves only that the import was unresolvable under the bounded policy — not that the import is invalid. Resolver/snapshot limitation is possible.
- **AN-MAINT-001** TPs are explained by the objective line-count condition directly supporting the finding.
- NOT_EVALUABLE is an evidence limitation, not a statement that the rule is correct or incorrect.

These classifications were written into `/tmp/phase22-human-review/*.md` (one entry per finding).

## Complete classification table (25 findings)

Grouped by repository, in the exact file order (`F1` = FINDING 1).

| Repo | # | Rule | Severity | Path / file | Evidence range | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| octocat/Hello-World | F1 | AN-TEST-001 | medium | `(none)` | — | **TP** |
| octocat/Hello-World | F2 | AN-TEST-002 | low | `(none)` | — | **TP** |
| octocat/Hello-World | F3 | AN-TOOL-001 | low | `(none)` | — | **TP** |
| sindresorhus/type-fest | F1 | AN-TEST-001 | medium | `(none)` | — | NOT_EVALUABLE |
| sindresorhus/type-fest | F2 | AN-TEST-002 | low | `(none)` | — | NOT_EVALUABLE |
| sindresorhus/type-fest | F3 | AN-TOOL-001 | low | `(none)` | — | NOT_EVALUABLE |
| sindresorhus/type-fest | F4 | AN-DEP-001 | medium | `package.json` | — | NOT_EVALUABLE |
| sindresorhus/type-fest | F5 | AN-CQ-002 | low | `tsconfig.json` | — | NOT_EVALUABLE |
| sindresorhus/type-fest | F6 | AN-MAINT-001 | medium | `lint-rules/validate-jsdoc-codeblocks.js` | L425 | **TP** |
| sindresorhus/type-fest | F7 | AN-ARCH-002 | medium | `index.d.ts` | L2 | NOT_EVALUABLE |
| expressjs/express | F1 | AN-DEP-001 | medium | `package.json` | — | NOT_EVALUABLE |
| expressjs/express | F2 | AN-MAINT-001 | medium | `lib/response.js` | L1048 | **TP** |
| expressjs/express | F3 | AN-ARCH-002 | medium | `examples/auth/index.js` | L7 | NOT_EVALUABLE |
| expressjs/express | F4 | AN-SEC-003 | low | `examples/auth/index.js` | — | UNCERTAIN |
| angular/angular | F1 | AN-TEST-001 | low | `(none)` | — | NOT_EVALUABLE |
| angular/angular | F2 | AN-CQ-002 | low | `(none)` | — | NOT_EVALUABLE |
| angular/angular | F3 | AN-MAINT-001 | medium | `adev/shared-docs/components/viewers/docs-viewer/docs-viewer.component.ts` | L449 | **TP** |
| angular/angular | F4 | AN-ARCH-002 | medium | `.ng-dev/release.mjs` | L44 | NOT_EVALUABLE |
| vuejs/core | F1 | AN-TEST-001 | low | `(none)` | — | NOT_EVALUABLE |
| vuejs/core | F2 | AN-CQ-002 | low | `tsconfig.build.json` | — | NOT_EVALUABLE |
| vuejs/core | F3 | AN-MAINT-001 | medium | `packages-private/dts-test/defineComponent.test-d.tsx` | L2261 | **TP** |
| vuejs/core | F4 | AN-ARCH-002 | medium | `packages-private/sfc-playground/src/download/download.ts` | L3 | NOT_EVALUABLE |
| vuejs/core | F5 | AN-SEC-003 | medium | `packages-private/template-explorer/src/theme.ts` | — | UNCERTAIN |
| nestjs/nest | F1 | AN-CQ-002 | low | `tsconfig.json` | — | NOT_EVALUABLE |
| nestjs/nest | F2 | AN-ARCH-002 | medium | `gulpfile.mjs` | L13 | NOT_EVALUABLE |

## Classification totals

| Classification | Count |
| --- | ---: |
| TP | 7 |
| FP | 0 |
| UNCERTAIN | 2 |
| NOT_EVALUABLE | 16 |
| **Total** | **25** |

> Note on totals: the instructing phase text included an "expected" line of TP=8 / NOT_EVALUABLE=15, but the explicit per-finding classifications distribute as **TP=7 / NOT_EVALUABLE=16** (no 8th true positive exists among the per-finding assignments). This document uses the count derived from the per-finding classifications (user-confirmed).

## Defensible descriptive metrics

Metrics below are purely descriptive counters and are **not** a validated accuracy estimate for the analyzer.

- **Total findings**: 25
- **TP count**: 7
- **FP count**: 0
- **UNCERTAIN count**: 2
- **NOT_EVALUABLE count**: 16
- **Evaluable findings** (TP + FP): 7
- **Evaluable rate**: 7 / 25 = **28.0 %**
- **TP rate among evaluable findings**: 7 / 7 = **100 %**

**Important caveat — this 100 % is NOT statistically valid precision.** The dataset contains no systematically labelled negatives (FP = 0 by construction), only 7 of 25 findings were evaluable, and 16 were NOT_EVALUABLE due to bounded ingestion. TP/(TP+FP) here is a descriptive figure from a small, skewed sample and must not be presented as analyzer precision. **Recall and false-negative rate are intentionally NOT calculated** (no ground-truth negatives were collected; do not manufacture false negatives). Analyzer accuracy is NOT claimed.

## What the sample proves

- The deterministic pipeline (ingestion → analyzer → scoring) executes reproducibly against the frozen dataset, with bounded resource usage and strict provenance.
- Bounded ingestion works within its limits; where a snapshot completes, findings are produced deterministically and traceably.
- AN-MAINT-001's line-count condition yields objectively verifiable true positives (all four large-file findings where a snapshot completed).
- Absence-based rules fire meaningfully on a minimal repository (Hello-World: no tests / no test tooling / no lint config) — confirmed as TP.

## What the sample does NOT prove

- It does **not** validate analyzer accuracy, precision or recall.
- It does **not** establish that absence-based rules are correct: most of their findings were NOT_EVALUABLE because the bounded snapshot may not contain all relevant files.
- It does **not** determine whether AN-ARCH-002's unresolved-import findings are real defects, resolver limitations, or snapshot limitations.
- It does **not** provide a labelled negative set, so no FP/FN metrics are defensible.
- It does **not** cover `react/react` or `vitejs/vite` (no snapshot within `maxApiRequests=125`).

## Ingestion limitations

- Coverage is `partial` or `insufficient` for most repositories (`tree_segmented_acquisition`, `tree_segmented_early_termination`, `tree_truncated`, `file_count_limit_reached`, `file_too_large:*`).
- `react/react` and `vitejs/vite` cannot complete the intended 50-file snapshot within `maxApiRequests=125` (81+41+3 and 79+43+3 requests respectively); the snapshot is absent (coverage null), never presented as complete.
- Limits were **not** changed in this phase. This is a known validation limitation for a future ingestion decision, outside the ground-truth scope.

## Rule-level observations

- **Absence-based rules** (`AN-TEST-001`, `AN-TEST-002`, `AN-TOOL-001`, `AN-CQ-002`, `AN-DEP-001`) can report "not detected" even when the bounded snapshot may not contain all relevant files. This is a validation/evidence semantic limitation, documented here rather than asserted as a rule defect.
- **AN-MAINT-001** produced the clearest directly verifiable findings in this sample (objective line-count > 400). 4/4 completed-snapshot instances classified TP.
- **AN-SEC-003** (2 findings) classified UNCERTAIN: only a hash is persisted; underlying content was unavailable for human inspection.

## AN-ARCH-002 observation

AN-ARCH-002 findings reflect a failure of **bounded static resolution**, not evidence that the import is invalid. These were classified NOT_EVALUABLE (not FP). Future validation should distinguish:
- genuinely unresolved/invalid import;
- valid import unsupported by the static resolver;
- resolver limitation;
- snapshot limitation.

## Security finding limitations

Security findings where only an excerpt hash is persisted (no raw content retained for human inspection) cannot be confirmed or refuted from the package. They were classified UNCERTAIN. No credentials or tokens appear in any artifact or in this document.

## Decision

**KEEP WITH LIMITATIONS**

- The deterministic analyzer/scoring remains intact; no production rule change is justified by this sample.
- Ingestion limitations are known (`maxApiRequests=125` vs `maxFileCount=50` for very large repos; partial coverage most repositories).
- Absence-based evidence semantics need future improvement (stronger evidence semantics so "not detected" cannot be read as "absent", and so AN-ARCH-002 disambiguates resolver vs. real-defect).
- The current sample is insufficient for a defensible precision/recall evaluation.
- Further work should move to **product-level validation** rather than extending the ground-truth exercise indefinitely.

## Phase 22 closure

**Phase 22 is CLOSED.**

- No Phase 22.4 is created.
- No further ground-truth/analyzer-validation phase is started automatically.
- Classifications are recorded in `/tmp/phase22-human-review/*.md` and summarized here.

## Recommended next project stage

- **Product-level validation and hardening** (outside ground-truth/analyzer scope): focus on end-to-end product experience, error/partial-state UX messaging (coverage is currently `partial`/`insufficient` for most repos), ingestion decisions for large repositories (near-coverage within budget), and stronger absence-based evidence semantics driven by future product evidence rather than by extending this review.

Sources: `docs/phase-22-ground-truth-dataset.md`, `docs/phase-22-human-review-package.md`, `docs/phase-22-human-review.md`, `/tmp/phase22-human-review/*.md`, `/tmp/phase22-ground-truth-results.jsonl`.