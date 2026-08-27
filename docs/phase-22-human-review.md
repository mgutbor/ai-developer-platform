# Phase 22.3 — Human Review of Analyzer Findings

## Purpose

This document is the single review index for the **25 findings** produced in Phase 22.2 from the frozen Phase 22.1 dataset. Its purpose is to let Manuel (the human reviewer) classify every finding efficiently, group repeated rule patterns together, and record the classifications that will feed Phase 22.3's metrics (only where the classified sample is defensible).

Phase 22.3 is strictly a **review-preparation** phase. It adds no features and changes no production code. No classification is generated automatically; every classification field below is empty and reserved for Manuel.

## Frozen dataset reference

Repositories and exact commit SHAs (frozen on 2026-08-27, see `docs/phase-22-ground-truth-dataset.md` and `docs/phase-22-human-review-package.md`):

| Repository | Frozen commit SHA | Snapshot | Findings |
| --- | --- | --- | ---: |
| octocat/Hello-World | 7fd1a60b01f91b314f59955a4e4d4e80d8edf11d | snapshot ok | 3 |
| sindresorhus/type-fest | 3fe02d33596f8afa167bc465d9d9ac9ab81b497e | snapshot ok | 7 |
| expressjs/express | 023767fe9872e029271df1418f73401bff20ff40 | snapshot ok | 4 |
| angular/angular | 133cafda42028fbd8efd7840d6ff3fea25223166 | snapshot ok | 4 |
| react/react | — | no snapshot (ingestion_limit_reached) | 0 |
| vuejs/core | d63616ca17de965ed32dcb449a4c5cd9982f15d2 | snapshot ok | 5 |
| nestjs/nest | a333a9dae6169537da3954c5b1ac35202b057fcb | snapshot ok | 2 |
| vitejs/vite | — | no snapshot (ingestion_limit_reached) | 0 |

`react/react` and `vitejs/vite` produced no findings: their `maxFileCount=50` snapshot exceeds `maxApiRequests=125` (documented bounded-resource limitation, out of scope for this phase).

## Review methodology

- Classify each finding using only the four valid labels: **TP**, **FP**, **UNCERTAIN**, **NOT_EVALUABLE**.
- Base each classification on the evidence recorded in the Phase 22.2 review package (`/tmp/phase22-human-review/`).
- Treat findings independently. Do **not** assume a plausible rule implies TP, or that a reasonable recommendation implies TP, or that absence of a finding implies FN.
- A missing finding may only be marked a false negative when independently verifiable evidence shows the rule should have triggered.
- Fill the empty template under each finding: `Classification`, `Evidence sufficient`, `Actionable`, `Reviewer confidence`, and answer the reviewer question.

### Classification definitions

- **TP (true positive):** the condition the rule describes genuinely exists in the inspected evidence, and the finding describes a real problem.
- **FP (false positive):** the finding does not correspond to a real problem in the inspected evidence (rule fired but nothing material is present/wrong).
- **UNCERTAIN:** it is not clear whether the finding is correct; the evidence is ambiguous or insufficient to decide.
- **NOT_EVALUABLE:** the finding cannot be evaluated from the available snapshot (e.g., the relevant file/context was not in the bounded snapshot).

## Reviewer instructions

1. Open `/tmp/phase22-human-review/README.md` and the per-repository findings files for the full detail (each finding already has an empty `### Human review` template).
2. For each finding below, record the same classification into this document's table (or keep a single authoritative copy in the review package and reference it here).
3. Do not change any evidence text, path, range or excerpt hash.
4. If a finding needs content outside the snapshot to be judged, mark it **NOT_EVALUABLE** rather than guessing.
5. Return the completed document to aggregate metrics in Phase 22.3 (after review, not before).

## Classification rules

- Classifications are made exclusively by the human reviewer (Manuel).
- This document contains **no automatic classifications**.
- All `Classification` table cells below start empty and are intentionally not filled.
- No precision, recall, false-positive rate or false-negative rate is computed in this phase; they remain `NOT_AVAILABLE` until Manuel's classifications are provided.

## Findings summary

- **Total findings: 25**

### Findings by rule

| Rule | Count |
| --- | ---: |
| `AN-ARCH-002` | 5 |
| `AN-CQ-002` | 4 |
| `AN-MAINT-001` | 4 |
| `AN-TEST-001` | 4 |
| `AN-DEP-001` | 2 |
| `AN-SEC-003` | 2 |
| `AN-TEST-002` | 2 |
| `AN-TOOL-001` | 2 |

### Findings by repository

| Repository | Count |
| --- | ---: |
| octocat/Hello-World | 3 |
| sindresorhus/type-fest | 7 |
| expressjs/express | 4 |
| angular/angular | 4 |
| react/react | 0 |
| vuejs/core | 5 |
| nestjs/nest | 2 |
| vitejs/vite | 0 |

### Findings by severity

| Severity | Count |
| --- | ---: |
| critical | 0 |
| high | 0 |
| medium | 14 |
| low | 11 |
| info | 0 |

### Findings by dimension

| Dimension | Count |
| --- | ---: |
| code_quality | 6 |
| testing | 6 |
| architecture | 5 |
| maintainability | 4 |
| dependencies | 2 |
| security | 2 |

### Classification counts (all start at zero)

| Classification | Count |
| --- | ---: |
| TP | 0 |
| FP | 0 |
| UNCERTAIN | 0 |
| NOT_EVALUABLE | 0 |

## Metrics status

| Metric | Status |
| --- | --- |
| Precision | `NOT_AVAILABLE` (no human review yet) |
| Recall | `NOT_AVAILABLE` (no human review yet) |
| False-positive rate | `NOT_AVAILABLE` (no human review yet) |
| False-negative rate | `NOT_AVAILABLE` (no ground-truth negatives collected) |

## Classification table (grouped by rule and repository)

Each finding has exactly one entry. The `Classification` cell is intentionally left empty for Manuel. Fill replies into a returned copy; do not fill here automatically.

### Rule `AN-TEST-001`

| # | Repository | Severity | Title | Path / file | Evidence range | Evidence (hash ref) | Dimension | Recommendation | Classification | Q for reviewer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | octocat/Hello-World | medium | Test files were not detected | `(none)` | — | fd282eb9 | testing | Add automated tests for critical behavior: Add focused automated tests for critical behavior and run them in the project workflow. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 2 | sindresorhus/type-fest | medium | Test files were not detected | `(none)` | — | 56502344 | testing | Add automated tests for critical behavior: Add focused automated tests for critical behavior and run them in the project workflow. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 3 | angular/angular | low | Test files were not included in the bounded snapshot | `(none)` | — | 07cfb038 | testing | Consider increasing ingestion limits to include test files: The bounded snapshot did not include test files; this may be a limitation of the ingestion limits. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 4 | vuejs/core | low | Test files were not included in the bounded snapshot | `(none)` | — | d6e90721 | testing | Consider increasing ingestion limits to include test files: The bounded snapshot did not include test files; this may be a limitation of the ingestion limits. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |

### Rule `AN-TEST-002`

| # | Repository | Severity | Title | Path / file | Evidence range | Evidence (hash ref) | Dimension | Recommendation | Classification | Q for reviewer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | octocat/Hello-World | low | Test tooling was not detected | `(none)` | — | 3f0fd0e8 | testing | Document a testing entry point: Document and configure a test tool appropriate for the project, without assuming a specific framework. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 2 | sindresorhus/type-fest | low | Test tooling was not detected | `(none)` | — | 91eee195 | testing | Document a testing entry point: Document and configure a test tool appropriate for the project, without assuming a specific framework. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |

### Rule `AN-TOOL-001`

| # | Repository | Severity | Title | Path / file | Evidence range | Evidence (hash ref) | Dimension | Recommendation | Classification | Q for reviewer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | octocat/Hello-World | low | Lint configuration was not detected | `(none)` | — | be347767 | code_quality | Add deterministic linting: Introduce a deterministic lint configuration and document how it is run in CI. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 2 | sindresorhus/type-fest | low | Lint configuration was not detected | `(none)` | — | b83751ee | code_quality | Add deterministic linting: Introduce a deterministic lint configuration and document how it is run in CI. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |

### Rule `AN-DEP-001`

| # | Repository | Severity | Title | Path / file | Evidence range | Evidence (hash ref) | Dimension | Recommendation | Classification | Q for reviewer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sindresorhus/type-fest | medium | Package manifest has no detected lockfile | `package.json` | — | 629da0c5 | dependencies | Commit a dependency lockfile: Add and commit the lockfile matching the repository package manager. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 2 | expressjs/express | medium | Package manifest has no detected lockfile | `package.json` | — | 9e88116f | dependencies | Commit a dependency lockfile: Add and commit the lockfile matching the repository package manager. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |

### Rule `AN-CQ-002`

| # | Repository | Severity | Title | Path / file | Evidence range | Evidence (hash ref) | Dimension | Recommendation | Classification | Q for reviewer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sindresorhus/type-fest | low | TypeScript strictness was not verified | `tsconfig.json` | — | 33c77894 | code_quality | Make TypeScript checks explicit: Document or enable the TypeScript compiler checks that the project intentionally relies on. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 2 | angular/angular | low | TypeScript strictness was not verified | `(none)` | — | e21c068d | code_quality | Make TypeScript checks explicit: Document or enable the TypeScript compiler checks that the project intentionally relies on. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 3 | vuejs/core | low | TypeScript strictness was not verified | `tsconfig.build.json` | — | 46762645 | code_quality | Make TypeScript checks explicit: Document or enable the TypeScript compiler checks that the project intentionally relies on. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 4 | nestjs/nest | low | TypeScript strictness was not verified | `tsconfig.json` | — | 514e3a10 | code_quality | Make TypeScript checks explicit: Document or enable the TypeScript compiler checks that the project intentionally relies on. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |

### Rule `AN-MAINT-001`

| # | Repository | Severity | Title | Path / file | Evidence range | Evidence (hash ref) | Dimension | Recommendation | Classification | Q for reviewer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sindresorhus/type-fest | medium | Source file exceeds the initial size heuristic | `lint-rules/validate-jsdoc-codeblocks.js` | L425 | edfdede5 | maintainability | Review the oversized source module: Review the module boundaries and split the file only where that improves cohesive ownership. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 2 | expressjs/express | medium | Source file exceeds the initial size heuristic | `lib/response.js` | L1048 | 8ab0335e | maintainability | Review the oversized source module: Review the module boundaries and split the file only where that improves cohesive ownership. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 3 | angular/angular | medium | Source file exceeds the initial size heuristic | `adev/shared-docs/components/viewers/docs-viewer/docs-viewer.component.ts` | L449 | f5a044d3 | maintainability | Review the oversized source module: Review the module boundaries and split the file only where that improves cohesive ownership. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 4 | vuejs/core | medium | Source file exceeds the initial size heuristic | `packages-private/dts-test/defineComponent.test-d.tsx` | L2261 | 0e7b2e98 | maintainability | Review the oversized source module: Review the module boundaries and split the file only where that improves cohesive ownership. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |

### Rule `AN-ARCH-002`

| # | Repository | Severity | Title | Path / file | Evidence range | Evidence (hash ref) | Dimension | Recommendation | Classification | Q for reviewer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sindresorhus/type-fest | medium | A relative import could not be resolved statically | `index.d.ts` | L2 | ebf39772 | architecture | Verify the unresolved relative import: Verify the import path and the project resolver configuration; this analyzer does not execute module resolution. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 2 | expressjs/express | medium | A relative import could not be resolved statically | `examples/auth/index.js` | L7 | b0414e44 | architecture | Verify the unresolved relative import: Verify the import path and the project resolver configuration; this analyzer does not execute module resolution. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 3 | angular/angular | medium | A relative import could not be resolved statically | `.ng-dev/release.mjs` | L44 | 93a525b6 | architecture | Verify the unresolved relative import: Verify the import path and the project resolver configuration; this analyzer does not execute module resolution. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 4 | vuejs/core | medium | A relative import could not be resolved statically | `packages-private/sfc-playground/src/download/download.ts` | L3 | ccb1b24f | architecture | Verify the unresolved relative import: Verify the import path and the project resolver configuration; this analyzer does not execute module resolution. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 5 | nestjs/nest | medium | A relative import could not be resolved statically | `gulpfile.mjs` | L13 | b7d72ed3 | architecture | Verify the unresolved relative import: Verify the import path and the project resolver configuration; this analyzer does not execute module resolution. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |

### Rule `AN-SEC-003`

| # | Repository | Severity | Title | Path / file | Evidence range | Evidence (hash ref) | Dimension | Recommendation | Classification | Q for reviewer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | expressjs/express | low | Secret-like demo or test content was detected | `examples/auth/index.js` | — | d219ea17 | security | Replace demo credentials with placeholder references: Replace hard-coded demo credentials with placeholder references or clearly documented example values. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |
| 2 | vuejs/core | medium | A possible secret-like value was detected | `packages-private/template-explorer/src/theme.ts` | — | e3589532 | security | Verify whether the detected value is a real credential: Verify whether the value is a real credential; if it is, rotate it and remove it from version control. |  | Does the condition actually exist in the cited path/evidence, and is the recommendation reasonable? |

## Review-package reference

Full detail for every finding (including score impact and snapshot limitations) is in `/tmp/phase22-human-review/`. Mapping to the package files:

- `01-octocat-hello-world.md` — octocat/Hello-World (3 findings)
- `02-sindresorhus-type-fest.md` — sindresorhus/type-fest (7 findings)
- `03-expressjs-express.md` — expressjs/express (4 findings)
- `04-angular-angular.md` — angular/angular (4 findings)
- `05-react-react.md` — react/react (0 findings)
- `06-vuejs-core.md` — vuejs/core (5 findings)
- `07-nestjs-nest.md` — nestjs/nest (2 findings)
- `08-vitejs-vite.md` — vitejs/vite (0 findings)
