# Phase 17 — Independent Developer Evaluation & Product Usability

## Executive Summary

Phase 17 evaluated the current v1.0.0 MVP without changing analyzer rules, scoring, architecture, or AI behavior. The repository is clean at the start of the evaluation, the existing report presents deterministic analysis separately from optional AI interpretation, and the Angular templates use interpolation rather than `innerHTML` for repository-derived or AI-generated content.

The central human-usefulness question cannot be answered in this environment because no independent developer reviewer is available. Therefore:

```text
HUMAN EVALUATION = NOT VALIDATED
```

The product remains:

```text
READY WITH LIMITATIONS
```

This is not an upgrade to a stronger readiness claim. The technical report contract and local behavior are validated, while real developer comprehension, task completion, and perceived usefulness remain unmeasured.

## Evaluation Methodology

The evaluation used:

- the five-repository benchmark and observations documented in `docs/phase-16-real-world-evaluation.md`;
- existing deterministic analyzer, scoring, API, persistence, and AI integration tests;
- direct review of the Angular home, progress, and report templates;
- a structured reviewer rubric defined below;
- environment checks for reviewer availability and AI credentials.

No repository code was executed, no dependencies from benchmark repositories were installed, and no human feedback was simulated.

## Dataset and Controlled Scenarios

The review scenarios are based on existing fixtures and Phase 16 benchmark outputs:

1. repository with no tests;
2. missing test or lint tooling in a bounded snapshot;
3. unresolved relative import;
4. security-related finding and redacted evidence;
5. partial snapshot;
6. insufficient coverage;
7. numeric dimensional score accompanied by limitations;
8. dimension with no findings.

The real-repository benchmark remains the five repositories from Phase 16: `octocat/Hello-World`, `sindresorhus/type-fest`, `expressjs/express`, `angular/angular`, and `facebook/react`. Their measured details remain in the Phase 16 report; this phase does not silently expand or rerun that benchmark.

## Independent Human Evaluation

### Availability

No independent developer reviewer was available through the execution environment.

```text
HUMAN EVALUATION = NOT VALIDATED
```

No task completion rate, misunderstanding rate, reviewer confidence, satisfaction score, quote, or human usefulness rate is reported.

### Proposed Reviewer Tasks

These tasks are ready for a future independent review and should be given without coaching:

- **Task A:** Identify the three most important problems in the repository.
- **Task B:** For the highest-priority finding, state what is wrong, where it is, why it matters, and the next action.
- **Task C:** Explain whether a score of 9/10 means that the whole repository is healthy.
- **Task D:** Identify which parts of the repository were not sufficiently analyzed.
- **Task E:** Decide whether the report is trustworthy enough to create a development task.

### Review Rubric

| Area | PASS condition |
| --- | --- |
| Finding comprehension | Reviewer explains what was detected and why it matters. |
| Location comprehension | Reviewer can locate the relevant path and range. |
| Evidence usefulness | Reviewer can explain why the evidence supports the finding. |
| Recommendation actionability | Reviewer can state a concrete next action. |
| Severity/confidence | Reviewer distinguishes impact from uncertainty. |
| Score comprehension | Reviewer does not equate a partial-snapshot score with full repository health. |
| Limitation comprehension | Reviewer identifies what was not observed. |
| Report comprehension | Reviewer can answer what, where, why, next step, confidence, and limits. |

Rubric outcomes are not results. They require an actual independent reviewer.

## Finding Quality

**PARTIALLY VALIDATED.** Existing tests and Phase 16 benchmark evidence validate deterministic finding structure, rule identifiers, severity/confidence fields, snapshot-linked evidence, and recommendation relationships. The benchmark also established that absence findings on partial snapshots must be interpreted as observations about the selected snapshot, not proof about the complete repository.

The following observations remain relevant:

- security calibration and redaction were validated with controlled fixtures;
- unresolved-import findings are heuristic and expose medium confidence;
- test, lint, documentation, and dependency absence findings can be snapshot-limited;
- no complete independent human classification of all benchmark findings exists.

No new analyzer defect was established in this phase. Analyzer changes are intentionally deferred until reproducible evidence and independent review are available.

## Evidence Quality

**PARTIALLY VALIDATED.** The report exposes repository-relative paths, line ranges where available, snapshot/commit context, evidence kinds, and hash-only security evidence. This is sufficient to validate contract integrity and provenance through automated tests.

Observed product friction:

- hash-only evidence protects sensitive data but is less immediately actionable than a safe contextual excerpt;
- partial snapshots can make absence evidence difficult to interpret without reading limitations;
- evidence quality for a developer has not been independently rated.

## Recommendation Quality

**PARTIALLY VALIDATED.** Recommendations are deterministic, linked to findings, and generally describe concrete actions such as adding tests, configuring linting, reviewing imports, or adding a lockfile. An independent reviewer has not confirmed that these actions are sufficiently specific in every case.

```text
ACTIONABLE RECOMMENDATION RATE = NOT VALIDATED
```

No AI-generated recommendations were introduced.

## Score Comprehension

**NOT VALIDATED with a human reviewer.** The report visibly labels the deterministic assessment, dimension, numeric score, confidence, coverage, and evidence count. A `null` dimension is rendered as `Score unavailable` rather than as a misleading numeric value. Limitations are rendered in a dedicated section.

The remaining risk is comprehension: a high dimensional score on `partial` coverage could still be read as whole-repository health. This is an observed product risk from the bounded-snapshot design, not evidence that the scoring formula itself is incorrect. The scoring formula was not changed.

## UX Friction Review

This is a code-level/manual review, not a human task study.

| Area | Classification | Observable basis |
| --- | --- | --- |
| Analysis submission | acceptable | labelled URL/ref inputs, validation, disabled submit state, error alert |
| Progress/polling | acceptable | status message, live region, retry state, completed-report link |
| Report navigation | acceptable | report and back links, section headings, stable finding cards |
| Findings | major friction | partial-snapshot absence findings require careful limitation reading |
| Evidence | major friction | hash-only security evidence is safe but not immediately inspectable |
| Recommendations | acceptable with uncertainty | linked deterministic actions; no independent actionability validation |
| Scoring | major friction | partial high scores may be overinterpreted without reviewer comprehension testing |
| Limitations | acceptable | dedicated visible section, but effectiveness is not human-validated |
| AI section | acceptable | optional, explicitly non-authoritative, failure preserves deterministic report |

These classifications are engineering observations, not human satisfaction results.

## Accessibility

**PARTIALLY VALIDATED at source level; automated/browser validation = NOT VALIDATED.**

Observed in templates:

- semantic `main`, `header`, `section`, `article`, headings, lists, forms, labels, and buttons;
- visible form labels and `aria-describedby` help/error association;
- `aria-live="polite"` for loading/progress states;
- `role="alert"` for report/form errors;
- keyboard-native links, buttons, and form controls;
- interpolated text rendering with no `innerHTML` use.

Not validated:

- browser keyboard traversal in a running deployment;
- screen-reader behavior;
- contrast measurements;
- responsive layout in real browsers;
- axe audit;
- WCAG 2.2 AA compliance.

## AI Evaluation

No server-side AI credentials were present and no live request was attempted.

```text
AI LIVE VALIDATION = NOT VALIDATED
AI SEMANTIC USEFULNESS = NOT VALIDATED
```

Existing FakeAIProvider/API tests validate integration properties only: bounded context, structured output validation, reference checks, failure isolation, and deterministic-report preservation. They are not evidence of semantic usefulness or model quality.

## Security

**VALIDATED for existing tested controls; real-world exhaustiveness remains NOT VALIDATED.** Phase 17 introduced no security relaxation and executed no external repository code.

Existing controls reviewed or covered by prior tests include:

- HTTPS and GitHub host allowlisting;
- safe canonical redirects;
- path traversal, symlink, and submodule protection;
- bounded file, byte, request, and timeout limits;
- secret redaction/hash-only evidence;
- AI context and reference validation;
- sanitized errors;
- deterministic/AI separation.

No secrets, tokens, `.env` files, databases, logs, or repository contents were added by this phase.

## Reproducibility

**VALIDATED for the deterministic pipeline by existing regression and integration tests.** Identical snapshot/version inputs preserve deterministic facts, findings, evidence, recommendations, ordering, and scores within the tested model. AI output remains non-deterministic and advisory by design.

## Performance

The Phase 16 network-dependent benchmark timings remain the only measured baseline available: approximately 1.08–3.79 seconds total for the five repositories, with analyzer and scoring work in the millisecond range. No new Phase 17 performance measurement was necessary, and no evidence justifies workers, queues, caching, Redis, PostgreSQL, or distributed observability.

Production load, concurrency, multi-instance behavior, and SLOs are:

```text
NOT VALIDATED
```

## Architecture Decision

**KEEP CURRENT ARCHITECTURE.** Phase 17 provides no evidence for introducing workers, queues, Redis, PostgreSQL, distributed rate limiting, caching, Playwright, axe-core, RAG, embeddings, or multi-provider AI. The current in-process deterministic pipeline remains the simplest architecture consistent with the measured scope.

## Product Readiness

```text
READY WITH LIMITATIONS
```

### VALIDATED

- deterministic report remains authoritative;
- report separates deterministic assessment from optional AI interpretation;
- source-level UX semantics, labels, status/error messaging, and safe interpolation are present;
- existing technical contracts and regression suites remain available;
- no human or AI claims were fabricated.

### PARTIALLY VALIDATED

- finding comprehension and actionability;
- evidence usefulness;
- recommendation usefulness;
- score and limitation communication;
- source-level accessibility;
- usefulness on bounded real-repository snapshots.

### NOT VALIDATED

- independent developer task completion;
- human usefulness or satisfaction;
- score misunderstanding rate;
- evidence adequacy rate from reviewers;
- actionable recommendation rate from reviewers;
- browser/axe accessibility audit;
- live AI semantic quality, cost, and latency;
- production load and multi-instance operation.

## Known Limitations

- `maxFileCount = 10` makes absence findings snapshot-scoped;
- partial coverage can make high dimensional scores appear stronger than the observed data warrants;
- hash-only security evidence is intentionally less descriptive;
- no independent human reviewer was available;
- no browser E2E or automated accessibility audit was run;
- live AI provider validation remains unavailable;
- no production deployment, load, backup/recovery, or high-availability evidence exists;
- Node 25 local warnings may differ from the Node 24 project/CI target;
- `node:sqlite` remains experimental in the local runtime.

## Recommended Phase 18

Conduct a small, genuinely independent developer study using the rubric and five tasks above. Recruit reviewers who did not implement the analyzer, record task outcomes without coaching, and use the results to decide whether the next change should be presentation wording, evidence presentation, analyzer calibration, or no change. Separately, when credentials are safely configured, run a bounded real-provider AI evaluation. Do not add infrastructure until operational evidence requires it.

## Proposed Conventional Commit

```text
test: evaluate developer usability of mvp
```
