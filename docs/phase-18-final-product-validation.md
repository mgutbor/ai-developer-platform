# Phase 18 — Final Product Validation

## 1. Executive Summary

Phase 18 performed the final evidence review without changing analyzer rules, scoring, architecture, or AI behavior.

A new benchmark of at least 15 repositories could not be executed in this environment: the unauthenticated GitHub API had only 2 requests remaining (`60` total, `58` used) at the start of the phase. The previous five-repository benchmark is recorded as historical evidence in `docs/phase-16-real-world-evaluation.md`; it is not presented as a new Phase 18 measurement.

The final decision is:

```text
GO WITH LIMITATIONS
```

This means the MVP may continue as a bounded, explicitly limited release, but the evidence does not support broad accuracy, human usefulness, live AI quality, or production-readiness claims.

## 2. Methodology

The phase used the existing bounded pipeline and the following controls:

- no repository cloning;
- no dependency installation from analyzed repositories;
- no external repository code, scripts, tests, or builds executed;
- no analyzer, scoring, architecture, or AI changes;
- no simulated reviewers or user responses;
- no credentials requested or created;
- no new infrastructure.

The intended 15-repository benchmark was attempted conceptually but not launched because the available GitHub quota was insufficient. This is an **EXTERNAL SERVICE LIMITATION**, not a product failure.

## 3. Real Benchmark

### Phase 18 benchmark status

```text
NOT VALIDATED
```

Required benchmark expansion: not executed. Available GitHub quota was 2 requests, while the existing runner needs multiple requests per repository. No results were fabricated and the dataset was not silently reduced.

### Historical benchmark context

The latest verified real benchmark remains the five repositories from Phase 16:

| Repository | Commit | Status | Coverage | Files | Findings | Duration |
|---|---|---|---|---:|---:|---:|
| `octocat/Hello-World` | `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` | completed | insufficient | 1 | 3 | 1.08 s |
| `sindresorhus/type-fest` | `3fe02d33596f8afa167bc465d9d9ac9ab81b497e` | completed | partial | 10 | 6 | 3.27 s |
| `expressjs/express` | `023767fe9872e029271df1418f73401bff20ff40` | completed | partial | 10 | 4 | 3.39 s |
| `angular/angular` | `133cafda42028fbd8efd7840d6ff3fea25223166` | completed | partial | 10 | 2 | 3.46 s |
| `facebook/react` | `29d9d3184484b03cb0369e0494617207df777b7a` | completed | partial | 10 | 3 | 3.79 s |

These figures are historical Phase 16 measurements, not Phase 18 measurements.

## 4. Ground Truth

The available ground truth is limited to controlled fixtures and prior benchmark inspection:

- GitHub Actions managed secret expressions are excluded from committed-secret findings;
- realistic secret-like values are treated as high-confidence/high-severity signals;
- placeholders and demo/example values are classified conservatively;
- canonical GitHub redirects are handled safely;
- Angular metadata is detected when selected;
- heuristic unresolved imports expose medium confidence;
- lockfile and absence findings are snapshot-scoped when coverage is partial.

A statistically representative Phase 18 ground truth was not established:

```text
Precision = NOT VALIDATED
Recall = NOT VALIDATED
False-positive rate = NOT VALIDATED
False-negative count = NOT VALIDATED
```

No UNKNOWN case was converted to TRUE_POSITIVE or FALSE_POSITIVE.

## 5. Finding Accuracy

Status:

```text
PARTIALLY VALIDATED
```

The existing controlled cases and five-repository historical benchmark support the following conclusions:

- security calibration is defensible for the tested positive and negative fixtures;
- absence findings on partial snapshots must not be interpreted as repository-wide absence;
- unresolved-import detection is heuristic rather than semantic module resolution;
- the deterministic report retains rule, severity, confidence, evidence, and recommendation relationships.

Broad real-world accuracy remains `NOT VALIDATED` because the Phase 18 benchmark could not run and the existing sample is too small for global claims.

## 6. Evidence Evaluation

Status:

```text
PARTIALLY VALIDATED
```

Verified contract properties:

- normalized repository-relative paths;
- line ranges where source locations are available;
- snapshot and commit provenance;
- finding-to-evidence references;
- hash-only handling for sensitive evidence;
- no complete secret values in persisted evidence.

Classification for developer actionability across a sufficiently broad human-reviewed sample:

```text
ACTIONABLE / PARTIALLY_ACTIONABLE / NOT_ACTIONABLE rates = NOT VALIDATED
```

Known limitation: hash-only evidence improves confidentiality but can require the developer to inspect the repository independently.

## 7. Recommendation Evaluation

Status:

```text
PARTIALLY VALIDATED
```

Recommendations are deterministic, linked to findings, and generally suggest actions such as adding tests, configuring linting, reviewing imports, or committing a lockfile.

Independent developer confirmation that recommendations are consistently specific and actionable:

```text
NOT VALIDATED
```

No AI-generated recommendations were introduced.

## 8. Scoring Evaluation

Status:

```text
PARTIALLY VALIDATED
```

The current dimensional scoring remains deterministic, nullable where data is insufficient, and explicitly accompanied by coverage and limitations. No formula change was justified by the available evidence.

The remaining risk is interpretation: a numeric score on a partial snapshot can be mistaken for a complete repository-health rating. This is a presentation/comprehension risk, not proof that the formula is mathematically incorrect.

No overall score is calculated.

## 9. Human Evaluation

```text
HUMAN EVALUATION = NOT VALIDATED
```

No independent developers were available. No task completion, comprehension, confidence, satisfaction, or usefulness metrics were generated.

The prepared future tasks are:

1. identify the most important detected problems;
2. locate a finding in the repository;
3. explain the supporting evidence;
4. state the next action;
5. explain `coverage: partial`;
6. decide whether the score represents complete repository health.

The reviewer must receive the report without coaching and results must be recorded only when real reviewers participate.

## 10. AI Live Evaluation

No server-side AI credentials were configured.

```text
AI LIVE VALIDATION = NOT VALIDATED
AI SEMANTIC USEFULNESS = NOT VALIDATED
AI LIVE COST = NOT VALIDATED
AI LIVE LATENCY = NOT VALIDATED
```

Existing FakeAIProvider tests validate technical integration only: bounded context, structured output, reference validation, failure isolation, and deterministic-report preservation. They are not semantic evidence about a real model.

## 11. Product Usefulness Scorecard

| Area | Status | Evidence and limits |
|---|---|---|
| Analyzer accuracy | PARTIALLY VALIDATED | controlled fixtures and five historical real repositories; no Phase 18 expanded sample |
| Evidence usefulness | PARTIALLY VALIDATED | provenance and references tested; independent actionability not measured |
| Recommendation usefulness | PARTIALLY VALIDATED | deterministic linked actions observed; human actionability not measured |
| Scoring comprehension | NOT VALIDATED | source presentation reviewed; no independent comprehension tasks |
| Frontend usability | PARTIALLY VALIDATED | templates, labels, states, semantics and safe interpolation reviewed; no browser/user study |
| Security confidence | VALIDATED for tested controls | SSRF, redirects, path protections, redaction and AI boundaries covered; exhaustive recall not established |
| AI usefulness | NOT VALIDATED | no real provider credentials; fake integration only |
| Operational readiness | NOT VALIDATED | no production load, deployment, multi-instance, backup, or HA evidence |

No artificial overall score is reported.

## 12. Defects Found

No new production defect was established during Phase 18 because the expanded real-world benchmark and independent human evaluation were unavailable.

Known product risks remain:

- partial snapshots limit the meaning of absence findings;
- partial numeric scores may be overinterpreted;
- hash-only evidence can reduce immediate actionability;
- unresolved import analysis is heuristic;
- semantic AI usefulness is unknown.

These are documented observations, not silently reclassified as defects.

## 13. Fixes Applied

No production fixes were applied.

The only change in this phase is this evaluation document. No analyzer, scoring, frontend, API, AI, or infrastructure code was modified.

Decision summary:

| Issue | Decision | Reason |
|---|---|---|
| Expanded benchmark blocked by GitHub quota | DEFER | external service limitation; do not fabricate or reduce sample |
| Human usefulness | DEFER | no independent reviewers available |
| Score comprehension | DEFER | requires real reviewer task results before changing presentation/formula |
| AI semantic quality | DEFER | no safe server-side provider credentials |
| New infrastructure | DROP for this phase | no measured operational need |

## 14. Quality Gates

Executed after documentation was created:

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm check:architecture` | PASS |
| `pnpm format:check` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS |
| `pnpm build` | PASS |
| `pnpm audit --audit-level=high` | PASS |
| `git diff --check` | PASS |

Test total:

```text
75 passing
```

Breakdown: 15 domain, 19 GitHub, 17 analyzer, 3 scoring, 2 persistence, 4 AI, 7 API, and 4 frontend.

## 15. Final Release Decision

```text
GO WITH LIMITATIONS
```

Justification:

- the bounded deterministic pipeline is technically validated;
- prior real-repository execution completed for five repositories;
- security, provenance, limits, and deterministic/AI separation have tested controls;
- no critical known security defect was introduced or left unclassified in this phase;
- the required Phase 18 expanded benchmark was not validated due to GitHub quota;
- human usefulness, broad accuracy metrics, and real AI quality remain unvalidated.

This decision does not mean production-ready or enterprise-ready.

## 16. Remaining Limitations

- Phase 18 benchmark of 15+ repositories: `NOT VALIDATED`;
- anonymous GitHub quota prevented new real measurements;
- no independent human reviewers;
- no statistically defensible precision/recall;
- `maxFileCount = 10` keeps absence findings snapshot-scoped;
- partial scores can be overinterpreted;
- no live AI provider validation, cost, or semantic quality;
- no browser E2E or automated accessibility audit;
- no production load, multi-instance, backup/recovery, or HA validation;
- local Node 25 differs from project/CI Node 24;
- `node:sqlite` remains experimental.

## 17. Recommendation for Next Step

Run the expanded benchmark with a safely authenticated GitHub quota or after the anonymous quota resets, then conduct the independent developer review with at least three real participants. Prioritize evidence collection over architecture changes. Validate a real AI provider separately only when server-side credentials already exist.

## Conventional Commit

```text
test: validate final product readiness
```
