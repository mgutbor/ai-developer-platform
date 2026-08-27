# Phase 22.2 — Human Review Package (evidence, no classification)

## Objective

Execute the frozen Phase 22.1 dataset (8 public repositories, exact commit SHAs) through the existing deterministic pipeline (ingestion → analyzer → scoring) and produce a **reproducible evidence package** for Manuel's subsequent human ground-truth review.

This phase **produces evidence only**. It does **not** classify findings, does **not** compute precision/recall/accuracy, and does **not** change any analyzer rule, scoring formula, ingestion behaviour or resource limit.

```text
DATASET (Phase 22.1, frozen)
        ↓
8 executions (this phase)
        ↓
FINDINGS + EVIDENCE (review package, this phase)
        ↓
[Manuel classifies in Phase 22.3]
        ↓
METRICS
        ↓
DECISION
```

## Dataset used

Exactly the 8 repositories and frozen SHAs from `docs/phase-22-ground-truth-dataset.md`. Execution uses the frozen SHA as the ingestion `ref`; floating references are never used as the canonical source.

| # | Repository | Frozen SHA |
| --- | --- | --- |
| 1 | `octocat/Hello-World` | `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` |
| 2 | `sindresorhus/type-fest` | `3fe02d33596f8afa167bc465d9d9ac9ab81b497e` |
| 3 | `expressjs/express` | `023767fe9872e029271df1418f73401bff20ff40` |
| 4 | `angular/angular` | `133cafda42028fbd8efd7840d6ff3fea25223166` |
| 5 | `react/react` | `29d9d3184484b03cb0369e0494617207df777b7a` |
| 6 | `vuejs/core` | `d63616ca17de965ed32dcb449a4c5cd9982f15d2` |
| 7 | `nestjs/nest` | `a333a9dae6169537da3954c5b1ac35202b057fcb` |
| 8 | `vitejs/vite` | `ee644014aab61e546742b862a7d7b0d6c7d67a7b` |

## Execution parameters

Contractual defaults, unchanged:

| Parameter | Value |
| --- | ---: |
| `maxFileCount` | 50 |
| `maxApiRequests` | 125 |
| `maxJsonResponseBytes` | 4 MiB |
| `maxTotalBytes` | 2 MiB |
| `maxFileBytes` | 256 KiB |
| `maxTreeEntries` | 5,000 |
| `requestTimeoutMs` | 10,000 |
| `ingestionTimeoutMs` | 60,000 |

Analyzer version `1.0.0`, scoring version `1.0.0` (project commit `f9361be8048ea17084be44e83e364461fd4f5ccf`).

## Execution

- Runner: `apps/api/src/validate-ground-truth.ts`.
- Timestamp of execution (UTC): **2026-08-27 16:02**.
- Mode: sequential (8 repositories, one client+snapshot each) to keep requests bounded and stay reproducible.
- Per repository run: `GET` repository → resolve commit SHA → (Stage: the snapshot commit) → ingestion → analyzer → scoring.

## Artifacts

| Path | Content |
| --- | --- |
| `/tmp/phase22-ground-truth-results.jsonl` | Sanitized per-run summary (8 lines): repository, frozen SHA + resolved SHA (verified equal), status, ingestion category, requests, tree/blob/other request counts, selected file count, total bytes, findings, coverage, limitations, latency. |
| `/tmp/phase22-human-review/` | The review evidence package: `README.md`, `00-summary.md` and one review file per repository. |
| `docs/phase-22-human-review-package.md` | This document. |

### Review package structure

```text
/tmp/phase22-human-review/
├── README.md
├── 00-summary.md
├── 01-octocat-hello-world.md
├── 02-sindresorhus-type-fest.md
├── 03-expressjs-express.md
├── 04-angular-angular.md
├── 05-react-react.md
├── 06-vuejs-core.md
├── 07-nestjs-nest.md
└── 08-vitejs-vite.md
```

Every dataset repository gets a file, even those that produced no findings.

## Finding format

Each review file starts with repository / commit / analyzer version / scoring version / execution status / coverage / limitations, then a `## Findings` section. Each finding lists only analyzer-produced evidence: rule, severity, title, message, evidence (id, kind, path, range, excerpt hash), recommendation, dimension and score impact where available. Evidence excerpts are **not** embedded as repository content — deterministic analyzer evidence carries an excerpt hash + location; full content is not persisted.

Missing-test / missing-lint / missing-doc style findings reference `kind=metadata` evidence (a repository-level observation, path `(none)`).

Each finding ends with an **empty** review template reserved for Manuel:

```text
### Human review

- Classification: [TP | FP | UNCERTAIN | NOT_EVALUABLE]
- Reviewer notes:
- Evidence sufficient: [YES | NO]
- Actionable: [YES | NO]
- Reviewer confidence: [HIGH | MEDIUM | LOW]
```

plus concrete reviewer questions. Nothing is pre-filled.

## Results summary

8 executions; SHA matches the frozen anchor for all 8 (the 2 that ended `failed` still resolved the frozen SHA before the failure and are recorded as such).

| Repository | Status | Requests | Files | Findings |
| --- | --- | ---: | ---: | ---: |
| `octocat/Hello-World` | ok | 5 | 1 | 3 |
| `sindresorhus/type-fest` | ok | 62 | 50 | 7 |
| `expressjs/express` | ok | 93 | 21 | 4 |
| `angular/angular` | ok | 109 | 50 | 4 |
| `react/react` | failed (`ingestion_limit_reached`) | 125 | n/a | n/a |
| `vuejs/core` | ok | 83 | 50 | 5 |
| `nestjs/nest` | ok | 96 | 50 | 2 |
| `vitejs/vite` | failed (`ingestion_limit_reached`) | 125 | n/a | n/a |

**Total findings produced: 25** (across the 6 repositories whose snapshots completed).

### Findings by rule (evidence counters — not accuracy)

| Rule | Count |
| --- | ---: |
| `AN-ARCH-002` | 5 |
| `AN-TEST-001` | 4 |
| `AN-CQ-002` | 4 |
| `AN-MAINT-001` | 4 |
| `AN-TEST-002` | 2 |
| `AN-TOOL-001` | 2 |
| `AN-DEP-001` | 2 |
| `AN-SEC-003` | 2 |

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
| architecture | 5 |
| code_quality | 6 |
| dependencies | 2 |
| documentation | 0 |
| maintainability | 4 |
| security | 2 |
| testing | 6 |

### Priority-rule coverage observed

| Rule | Observed in dataset |
| --- | --- |
| `AN-SEC-003` | FOUND |
| `AN-TEST-001` | FOUND |
| `AN-DEP-001` | FOUND |
| `AN-ARCH-002` | FOUND |
| `AN-DOC-001` | NOT_FOUND |

`NOT_FOUND` is a recorded observation only; it is not evidence that a rule works or fails.

## Coverage / ingestion status

Coverage reflects the snapshot, not repository health.

- `octocat/Hello-World`: coverage `insufficient` (`tree_segmented_acquisition`).
- `expressjs/express`: coverage `partial` (`tree_segmented_acquisition`).
- `type-fest`, `angular/angular`, `vuejs/core`, `nestjs/nest`: coverage `partial` with limitations such as `tree_segmented_early_termination`, `tree_truncated`, `file_count_limit_reached`, and occasional `file_too_large:<path>`.
- `react/react` and `vitejs/vite`: coverage `null`, ingestion `ingestion_limit_reached` — no snapshot, no findings.

## Failure explanation — react/react and vitejs/vite

Both large repositories exceeded the contract `maxApiRequests=125` before completing a `maxFileCount=50` snapshot:

- `react/react`: 81 tree requests + 41 blob requests + 3 resolution requests = 125.
- `vitejs/vite`: 79 tree requests + 43 blob requests + 3 resolution requests = 125.

Selecting and fetching 50 files from these large trees requires more than 125 API requests under the current per-file retrieval model (`3 resolution + <tree traversal> + 50 blob`). This is the same bounded-resource budget conflict documented in Phases 21.10/21.11 (TypeScript/100) and is **a product limitation, not an analyzer defect**. The review files for these two repositories state `NO FINDINGS GENERATED` and record the exact limiting counts; nothing is fabricated, and the snapshot is reported as absent (coverage `null`), never as complete.

Per the phase rules, no limit was raised and no parameter changed to force these two to complete. This remains a decision point for a later phase (bounded near-coverage, or accepting that `maxFileCount=50` cannot be reached for very large repositories within `maxApiRequests=125`).

## Evidence / classification separation

- This package contains **evidence counters only**. It uses no accuracy terminology (no precision, recall, accuracy, false-positive-rate, false-negative-rate).
- No finding is labelled TP/FP/uncertain/not-evaluable; those fields are empty templates.
- Traceability is preserved: repository → commit → snapshot → path/range → rule → finding → recommendation (captured per review file and in the JSONL).

## Security verification

- `GITHUB_TOKEN` / `GH_TOKEN`: read from the environment, passed to `GitHubRestClient`, never printed, persisted, committed or included in any artifact.
- Scanned artifacts (`/tmp/phase22-ground-truth-results.jsonl` and `/tmp/phase22-human-review/`): no occurrence of `GITHUB_TOKEN`, `GH_TOKEN`, `Authorization`, `Bearer`, or credentials.
- No repository code executed; no repository dependencies installed; no analyzed repository modified.
- Repository contents are treated strictly as data and are not persisted (analyzer evidence is a hash + location).

## Limitations

- Two of eight repositories produced no findings because `maxApiRequests=125` cannot serve a 50-file snapshot for their large trees; this is recorded, not reinterpreted.
- Coverage is `partial`/`insufficient` for most repositories, matching the product's bounded-snapshot contract.
- Findings are a snapshot at the frozen SHAs (2026-08-27).
- The evidence package reflects this analyzer/scoring version only.
- No human-verified ground truth yet: precision/recall/accuracy are intentionally **not computed** and remain the responsibility of Phase 22.3 under Manuel's review.

## Reproduction

```bash
# Requires GITHUB_TOKEN (or GH_TOKEN).
pnpm --filter @ai-developer-platform/api exec tsx src/validate-ground-truth.ts
```

This rewrites `/tmp/phase22-ground-truth-results.jsonl` and `/tmp/phase22-human-review/`. Results are deterministic given the frozen dataset and this commit.

## Procedure for Manuel (Phase 22.3)

1. Open the review package: `open /tmp/phase22-human-review/README.md`.
2. For each finding, use the empty `### Human review` template: choose `Classification` among `TP | FP | UNCERTAIN | NOT_EVALUABLE`, fill `Evidence sufficient`, `Actionable`, `Reviewer confidence`, and answer the reviewer questions.
3. Treat each finding independently. Do not infer a correct rule implies TP, or absence of a finding implies FN.
4. Record the completed files; Phase 22.3 will aggregate them into metrics only where the classified sample is defensible.

## Relationship to other phases

- Phase 22.1 froze the dataset (unchanged). Phase 22.2 executes it and produces this evidence package. Phase 22.3 is Manuel's human classification. Phase 22.4 (future) may compute defensible accuracy and product-decision (KEEP/CALIBRATE/BLOCK).