# Phase 16 — Real-World Benchmark, Human Evaluation & AI Live Validation

## Executive summary

Phase 16 ejecutó el benchmark reproducible contra los cinco repositories públicos definidos en las fases anteriores, usando exclusivamente la ingestion existente. No se clonaron repositories, no se instalaron dependencias y no se ejecutó código, tests, builds ni scripts externos.

El benchmark completó los cinco análisis. La evidencia confirma que la pipeline determinista es operativa y reproducible en esta muestra, pero la utilidad general del producto sigue **READY WITH LIMITATIONS**: el snapshot del benchmark está deliberadamente limitado a 10 archivos por repository, no hubo revisión humana independiente y no existían credenciales de AI para una validación semántica live.

No se modificaron reglas del analyzer, fórmula de scoring, arquitectura ni comportamiento AI durante esta fase.

## Benchmark methodology

Runner: `apps/api/src/validate-real-repos.ts`.

Limits used:

- `maxFileCount: 10`;
- `maxTotalBytes: 1 MiB`;
- `maxApiRequests: 14` per repository;
- existing GitHub host, redirect, timeout and path protections unchanged.

The runner records commit SHA, selected files, coverage, limitations, facts, findings, dimension scores and phase timings. Results were written to `/tmp/phase13-results.json`; repository contents were not persisted.

The local environment reported Node `25.3.0`, while the project engine remains Node 24 (`>=24.15.0 <25`). This produced warnings but did not fail the gates.

## Dataset and benchmark results

| Repository | Commit SHA | Status | Coverage | Files | Findings | Score range | Duration |
| --- | --- | --- | --- | ---: | ---: | --- | ---: |
| `octocat/Hello-World` | `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` | completed | insufficient | 1 | 3 | 8.5–10 | 1.08 s |
| `sindresorhus/type-fest` | `3fe02d33596f8afa167bc465d9d9ac9ab81b497e` | completed | partial | 10 | 6 | 9–10 | 3.27 s |
| `expressjs/express` | `023767fe9872e029271df1418f73401bff20ff40` | completed | partial | 10 | 4 | 9–10 | 3.39 s |
| `angular/angular` | `133cafda42028fbd8efd7840d6ff3fea25223166` | completed | partial | 10 | 2 | 9–10 | 3.46 s |
| `facebook/react` | `29d9d3184484b03cb0369e0494617207df777b7a` | completed | partial | 10 | 3 | 9–10 | 3.79 s |

All five repositories were ingested successfully in this run. `facebook/react` was successfully handled through the safe canonical GitHub redirect implemented in Phase 14.

The scores above are dimensional scores, not a global repository-quality score. Numeric values on partial snapshots must be interpreted together with `coverage` and `limitations`.

## Findings by rule

Observed findings in this run:

- `AN-TEST-001`: 4 occurrences; test files were not observed in bounded snapshots. In repositories where test tooling was observed, the finding was downgraded to low severity.
- `AN-TEST-002`: 1 occurrence; test tooling was not observed in the tiny repository.
- `AN-TOOL-001`: 1 occurrence; lint configuration was not observed in the tiny repository.
- `AN-DEP-001`: 2 occurrences; no lockfile was detected in the selected snapshot for type-fest and express. This remains a bounded-snapshot signal, not proof that the full repository has no lockfile.
- `AN-MAINT-001`: 1 occurrence; a selected source file exceeded the configured size heuristic.
- `AN-CQ-002`: 2 occurrences; TypeScript strictness was not verified in the observed data.
- `AN-ARCH-002`: 3 occurrences; unresolved relative imports are explicitly heuristic and medium confidence.

No `AN-SEC-003` finding was produced by this benchmark. The controlled security fixtures from Phase 14 remain the evidence for the calibrated positive and negative cases; this run does not establish complete secret-scanner recall.

## Ground truth and finding quality

Ground truth is partial and manually limited to findings whose repository metadata could be checked from the benchmark output and known repository structure. It is not sufficient to calculate precision or recall for the entire analyzer.

| Case | Classification | Evidence | Confidence |
| --- | --- | --- | --- |
| `facebook/react` canonical redirect | confirmed operational success | final commit and completed ingestion | high |
| Angular framework detection | confirmed observed | `framework_detected: angular`, root metadata selected | high |
| Express test tooling with no test files selected | plausible / snapshot-limited | `test_tooling: mocha`, `test_file_count: 0`, partial coverage | high |
| React/Angular lockfile unavailable because it exceeded file size limit | not a missing-lockfile proof | explicit `file_too_large` limitation | high |
| `AN-ARCH-002` imports | plausible / requires manual review | heuristic resolution and medium confidence | medium |
| absence findings in partial snapshots | not enough evidence for full repository absence | file cap and `file_count_limit_reached` | high |

### Security evaluation

The security calibration remains validated by existing controlled fixtures, not by broad live-repository recall:

- managed GitHub expressions are not treated as committed secrets;
- realistic secret-like source values produce high-severity findings;
- placeholders and demo/example values are reduced in severity/confidence;
- complete secret values are not stored in evidence.

No security false positive was demonstrated in this benchmark. This must not be interpreted as proof that `AN-SEC-003` has complete recall or zero false positives across all repositories.

## Product usefulness evaluation

No independent human reviewer was available. Human usefulness is therefore **NOT VALIDATED**. No developer ratings or simulated feedback were created.

The report contract is technically useful in the following validated ways:

- findings contain rule, category, severity and confidence;
- evidence refers to normalized repository-relative paths and the same snapshot;
- recommendations are linked to findings;
- commit SHA and limitations are retained;
- hash-only security evidence avoids exposing sensitive values;
- partial and insufficient coverage are represented explicitly.

Developer usefulness remains **PARTIALLY VALIDATED** because a bounded snapshot can make absence findings less actionable and hash-only evidence can require additional repository inspection. A structured human review rubric for future sessions is:

| Criterion | PASS condition |
| --- | --- |
| Understandability | reviewer can explain the finding without implementation knowledge |
| Evidence sufficiency | reviewer can identify why the finding fired |
| Location usefulness | path/range identifies where to inspect |
| Recommendation actionability | reviewer can name a concrete next action |
| Severity/confidence | reviewer agrees uncertainty is communicated |
| Limitation comprehension | reviewer does not interpret partial score as full repository quality |

This rubric is defined, but human results are **NOT VALIDATED**.

## Evidence and recommendations

**Evidence: PARTIALLY VALIDATED.** Contract integrity and snapshot provenance pass local tests. Paths and ranges are available where the analyzer has a source location. Security evidence remains redacted/hash-based. The benchmark cannot prove that every evidence item is sufficient for an independent developer to act without opening the repository.

**Recommendations: PARTIALLY VALIDATED.** Existing recommendations are deterministic, linked to findings and generally action-oriented (tests, lockfiles, linting, import review). An independent actionable-recommendation rate is **NOT VALIDATED** because no human review was performed.

## Coverage and scoring

Coverage behavior observed:

- `Hello-World`: `insufficient` because usable deterministic signals are scarce;
- four larger repositories: `partial` because the bounded snapshot reached limits;
- no repository in this run was `complete`.

The current scoring model remains unchanged and deterministic. It correctly returns nullable dimensions when signals are insufficient and attaches partial-coverage limitations to numeric scores. The main residual product risk is comprehension: users may still read a 9–10 dimensional score as repository health despite partial coverage. This is a UX comprehension question, not evidence for changing the formula in this phase.

Scoring assessment: **PARTIALLY VALIDATED**. No structural redesign is justified by this sample.

## Reproducibility and performance

The benchmark records deterministic analyzer and scoring outputs. Existing regression tests also verify deterministic behavior for identical snapshots and analyzer versions. AI output is not considered deterministic.

Observed phase timings:

- ingestion: approximately 1.07–3.79 s;
- analyzer: approximately 3.76–13.90 ms;
- scoring: approximately 0.23–0.45 ms;
- total: approximately 1.08–3.79 s.

These measurements are a small, network-dependent benchmark and are **NOT VALIDATED** as a production performance baseline. No evidence justifies workers, queues, caches, Redis, PostgreSQL or a distributed observability stack.

## AI live validation

No `AI_PROVIDER`, `AI_API_KEY` or equivalent credentials were present. No live request was attempted and no credentials were requested or created.

- AI live provider request: **NOT VALIDATED**;
- semantic usefulness: **NOT VALIDATED**;
- real latency/cost: **NOT VALIDATED**;
- prompt-injection resistance against a real model: **NOT VALIDATED**.

Fake-provider and local integration behavior remains validated by the existing AI/API tests: bounded context, reference validation, prompt/data delimiters, failure isolation and unchanged deterministic report.

## Security regression

The evaluation used no external code execution, package installation, clone, build or test execution from benchmark repositories. Existing protections remain covered by code and tests:

- HTTPS and GitHub host allowlist;
- safe canonical redirects;
- path traversal, symlink and submodule rejection;
- bounded files, bytes, requests and timeouts;
- secret redaction/hash-only evidence;
- AI context and reference validation;
- sanitized API errors.

Security status: **VALIDATED for existing tested controls; NOT VALIDATED for exhaustive real-world recall.**

## Evaluation matrix

| Area | Result | Confidence | Notes |
| --- | --- | --- | --- |
| Security findings | PARTIAL | medium | controlled calibration passes; broad recall not measured |
| Test findings | PARTIAL | high | bounded-snapshot limitation is visible but reduces absence certainty |
| Dependency findings | PARTIAL | high | lockfile size/exclusion semantics are explicit |
| Architecture findings | PARTIAL | medium | import resolution is heuristic |
| Documentation findings | PARTIAL | medium | metadata depends on selected snapshot |
| Evidence quality | PARTIAL | high | contract/provenance pass; hash-only context can reduce actionability |
| Recommendations | PARTIAL | medium | linked and deterministic; no independent human rating |
| Scoring | PARTIAL | high | deterministic and nullable; partial-score comprehension untested |
| Coverage | PASS for semantics | high | complete/partial/insufficient behavior is explicit |
| UX | PARTIAL | low | automated/local evidence only; no browser or human review |
| AI | NOT VALIDATED live | high | no credentials; fake integration only |

## Metrics

The following metrics are intentionally not calculated:

- false-positive rate: **NOT VALIDATED**;
- false-negative count/recall: **NOT VALIDATED**;
- useful-finding rate: **NOT VALIDATED**;
- actionable-recommendation rate: **NOT VALIDATED**;
- evidence adequacy rate: **NOT VALIDATED**;
- AI semantic quality, cost and real latency: **NOT VALIDATED**.

The benchmark sample is sufficient to report executions and observed rule activations, but not to claim statistically meaningful precision, recall or human usefulness.

## Architecture assessment

| Component | Decision | Rationale |
| --- | --- | --- |
| Angular | KEEP | no evidence requiring replacement |
| Fastify | KEEP | API/pipeline tests and benchmark integration pass |
| Application layer | KEEP | deterministic boundary remains clear |
| In-process runner | KEEP | no measured load or reliability evidence requiring extraction |
| GitHub REST | KEEP | safe ingestion and canonical redirect now work |
| Deterministic analyzer | KEEP | reproducible and useful as bounded signal generator |
| Scoring | KEEP WITH LIMITATIONS | deterministic, dimensional and nullable; comprehension remains untested |
| SQLite | KEEP | no evidence for migration |
| Optional AI | KEEP WITH LIMITATIONS | technical integration passes; live semantics unavailable |

No new infrastructure is justified by this phase.

## Product readiness

`READY WITH LIMITATIONS` remains the appropriate classification. The MVP is operational on the benchmark sample, but the evidence does not support production-ready, enterprise-ready or broad accuracy claims.

### VALIDATED

- five required public repositories completed in the benchmark;
- safe canonical redirect handling for React;
- deterministic bounded analysis and scoring;
- explicit partial/insufficient coverage;
- existing security boundaries and no repository code execution;
- local AI integration with FakeAIProvider.

### PARTIALLY VALIDATED

- real-repository finding quality;
- evidence and recommendation usefulness;
- scoring interpretation;
- UX usefulness;
- performance outside this small network-dependent sample.

### NOT VALIDATED

- independent human usefulness;
- statistically meaningful precision/recall;
- semantic AI quality with OpenAIProvider;
- AI cost and live latency;
- production load, multi-instance operation and browser accessibility audit.

## Recommended Phase 17

1. Conduct a small independent developer review using the rubric above.
2. Repeat the benchmark with a larger controlled sample and authenticated GitHub quota, without logging credentials.
3. Run a limited real-provider AI evaluation only when server-side credentials are safely configured.
4. Test partial-score comprehension in the frontend before changing scoring.
5. Keep analyzer and infrastructure changes evidence-driven.

## Changed files

No production files were changed in Phase 16. This report is the only Phase 16 artifact.

## Proposed Conventional Commit

```text
test: evaluate mvp with real world benchmark
```
