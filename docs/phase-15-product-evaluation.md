# Phase 15 — Product Usefulness & Finding Quality Evaluation

## Executive Summary

Phase 15 evaluó la utilidad del report mediante fixtures controlados, regresiones existentes y un intento de benchmark real con los cinco repositories públicos definidos en Phase 14. La validación local confirma que el pipeline determinista produce findings trazables, evidencia sin secretos, recomendaciones enlazadas y scores dimensionales reproducibles. La evaluación semántica con un provider AI real y el benchmark remoto no pudieron validarse en esta ejecución: GitHub devolvió `rate_limited` para los cinco repositories por el límite no autenticado.

**Conclusión:** el producto es técnicamente defendible como MVP de señales deterministas acotadas, pero la utilidad frente a repositories reales sigue **PARTIALLY VALIDATED**. No se modificaron reglas, fórmula de scoring ni arquitectura.

## Evaluation Methodology

- Se reutilizó `apps/api/src/validate-real-repos.ts` sin ejecutar, instalar, compilar ni clonar código externo.
- Se mantuvieron los límites del runner: `maxFileCount: 10`, `maxTotalBytes: 1 MiB`, `maxApiRequests: 14` por repository.
- Se ejecutaron fixtures existentes del analyzer, scoring, AI y API.
- Se revisaron paths, rangos, hashes, snapshot IDs, provenance, relaciones finding/evidence/recommendation y mensajes de coverage.
- No se consideró la ausencia de un archivo fuera del snapshot como ground truth del repository completo.

## Dataset

### Controlled fixtures — VALIDATED

| Case | Purpose | Result |
| --- | --- | --- |
| clean TypeScript | healthy baseline | PASS |
| poor TypeScript | maintainability, testing and code-quality signals | PASS |
| JavaScript/React | language/framework signals | PASS |
| Angular | Angular metadata detection | PASS |
| security calibration | real-looking, placeholder, demo and GitHub expressions | PASS |
| malformed/partial | invalid files and insufficient data | PASS |

### Public repositories — NOT VALIDATED in this execution

| Repository | Intended coverage | Execution result |
| --- | --- | --- |
| `octocat/Hello-World` | tiny/no tests | `rate_limited` |
| `sindresorhus/type-fest` | clean TypeScript | `rate_limited` |
| `expressjs/express` | JavaScript/Node.js | `rate_limited` |
| `angular/angular` | Angular/large TypeScript | `rate_limited` |
| `facebook/react` | React/large JavaScript | `rate_limited` |

The previous Phase 14 report remains historical evidence; this Phase 15 run does not silently reuse it as a newly measured benchmark.

## Ground Truth

Controlled ground truth was established for the highest-impact security and bounded-snapshot cases:

| Rule/case | Expected | Actual | Classification | Confidence |
| --- | --- | --- | --- | --- |
| `AN-SEC-003`, `${{ secrets.GITHUB_TOKEN }}` | no committed secret | no finding | correct | high |
| `AN-SEC-003`, `${{ github.token }}` / `${{ env.X }}` / `${{ vars.X }}` | no committed secret | no finding | correct | high |
| `AN-SEC-003`, `ghp_...` in source | secret-like finding, high | high finding, high confidence | correct for fixture | high |
| `AN-SEC-003`, placeholder value | low informational signal | low finding, low confidence | correct for fixture | high |
| `AN-SEC-003`, demo path | not high severity | low finding, low confidence | correct for fixture | high |
| `AN-TEST-001`, tooling present but tests absent from bounded snapshot | limitation, not strong absence claim | low finding with bounded-snapshot wording | correct | high |
| `AN-DEP-001`, lockfile excluded by size limitation | do not claim missing lockfile | no finding | correct | high |
| Angular root metadata present | Angular detected | Angular detected | correct | high |

Ground truth for false negatives in complete public repositories was **NOT VALIDATED** during this run because GitHub rate limiting prevented fresh ingestion.

## Finding Quality

### Security findings — PASS for controlled cases

`AN-SEC-003` distinguishes managed GitHub expressions, committed-looking tokens, placeholders and demo/example paths. Evidence uses hashes and does not include the complete secret. This validates the implementation boundary, not the recall of a complete secret scanner.

### Test, dependency, documentation and tooling findings — PARTIAL

The messages are now appropriately scoped when a bounded snapshot contains tooling but not test files, or when a lockfile is excluded by size. However, an absence finding remains a statement about observed data, not proof that the repository lacks the capability. This is a product limitation rather than a newly changed rule.

### Architecture/import findings — PARTIAL

`AN-ARCH-002` is explicitly heuristic and confidence is medium. A missing imported module in a partial snapshot cannot establish a real unresolved import. The finding is useful as a review signal only when the limitation is visible.

## Evidence Evaluation

**Result: PASS for contract integrity; PARTIAL for developer sufficiency.**

Validated properties:

- evidence points to normalized repository-relative paths;
- source ranges are positive and ordered when present;
- evidence references the same snapshot as the finding;
- findings reference existing evidence;
- evidence contains an excerpt hash or safe redacted value;
- security evidence does not persist complete secret values;
- provenance retains deterministic source, rule ID/version and snapshot ID;
- commit SHA is available on the snapshot.

Remaining limitation: hash-only evidence can prove that a source excerpt existed without showing the developer the relevant safe context. This is privacy-preserving but may reduce immediate actionability for some findings.

## Recommendation Evaluation

**Result: PARTIAL.**

Recommendations are linked to findings and generally provide a concrete action, such as adding tests, committing a lockfile, configuring linting or reviewing an import. They are not AI-generated and do not modify deterministic results.

The evaluation did not establish an independent human-rated actionable recommendation rate. That metric is **NOT ENOUGH DATA** because the real-repository sample was unavailable and no multi-reviewer assessment was conducted.

## Scoring Evaluation

The existing formula was not changed. Scores remain dimensional and nullable; there is no global score.

Validated:

- deterministic repeated scoring produces identical output;
- insufficient deterministic signals produce `score: null` and `coverage: insufficient`;
- partial snapshots retain numeric dimensional scores only with an explicit partial-coverage limitation;
- no score is presented as a global repository quality score.

Assessment: **PARTIAL**. The model is mechanically coherent, but a numeric score on a partial snapshot can still be over-read by users. The current limitation text is necessary, but its user comprehension was not tested with real developers. No scoring redesign is justified from this run.

## Coverage Evaluation

| Situation | Expected semantics | Validation |
| --- | --- | --- |
| complete fixture with sufficient signals | `complete` | PASS |
| bounded or truncated snapshot with usable signals | `partial` | PASS |
| no usable source/signals | `insufficient` | PASS |
| unavailable dependency signal | nullable dimension score | PASS |
| partial numeric dimension score | explicit limitation | PASS |

Coverage correctly describes observed data availability, not repository quality. Metadata completeness and source completeness are not independently represented in the current model; this remains a limitation for future product evaluation.

## UX Evaluation

**Result: PARTIALLY VALIDATED.**

The existing frontend contract and report page expose coverage, limitations, nullable scores, findings, evidence and recommendations. The report distinguishes deterministic analysis from AI-assisted interpretation. Existing tests cover score-unavailable behavior and report states.

Not validated in this phase:

- moderated developer usability sessions;
- browser-based keyboard/screen-reader walkthrough;
- comprehension of partial-score wording;
- end-user actionability of recommendations.

No frontend redesign was justified by the available evidence.

## AI Evaluation

**Real provider: NOT VALIDATED.** No AI credentials were configured and no live request was made.

**Fake provider: VALIDATED technically.** Existing tests confirm:

- bounded context construction;
- no source blobs in AI context;
- deterministic prompt/data delimiters;
- invalid finding/evidence/recommendation references rejected;
- valid references accepted;
- deterministic report unchanged before and after AI;
- API behavior when AI is available or unavailable;
- request limiting without affecting the deterministic report.

Semantic usefulness, factuality in natural-language output, latency and cost with a real model remain **NOT VALIDATED**. AI should remain optional and experimental.

## Metrics

| Metric | Result | Status |
| --- | --- | --- |
| false-positive rate on public benchmark | not calculated; all five runs rate-limited | NOT ENOUGH DATA |
| false-negative count on public benchmark | not calculated | NOT ENOUGH DATA |
| useful finding rate | not calculated; no independent human review | NOT ENOUGH DATA |
| actionable recommendation rate | not calculated | NOT ENOUGH DATA |
| evidence adequacy rate | contract-level fixture pass only; no human adequacy sample | NOT ENOUGH DATA |
| controlled security calibration cases | all expected cases passed | VALIDATED, fixture scope only |

No metric is extrapolated from the failed remote run.

## Benchmark Results

The attempted real-world benchmark produced no analysis result because the unauthenticated GitHub API rate limit was exhausted. This is an operational limitation of the evaluation environment, not evidence that the repositories failed analysis. A future run must use a user-authorized GitHub token handled outside logs, or wait for reset, while preserving the same ingestion caps and methodology.

## Defects Discovered

1. **Evaluation blocked by external rate limit.** The current runner cannot produce a representative fresh benchmark when the unauthenticated GitHub quota is exhausted.
2. **Human usefulness is unmeasured.** Technical traceability does not prove that a developer understands or acts on a finding.
3. **Partial-score comprehension is unmeasured.** Explicit limitation text may still be insufficient UX communication.
4. **Hash-only evidence can be less immediately actionable.** It protects sensitive data but does not show safe context.

No new analyzer defect was demonstrated by this Phase 15 execution. No new rule was introduced and no scoring change was made.

## Changes Implemented

- Created this evaluation report.
- No production behavior, analyzer rule, score formula or architecture changed.

## Security Evaluation

The following remain validated by existing tests and code review:

- SSRF and GitHub host allowlist;
- safe canonical redirects;
- path traversal, symlink and submodule protections;
- bounded file/byte/request limits and timeouts;
- no external repository code execution;
- no complete secret persistence in evidence;
- AI context/reference validation and isolation;
- sanitized API errors.

The real-repository security finding recall was not measured in this phase.

## Architecture Assessment

| Component | Decision | Evidence |
| --- | --- | --- |
| Angular | KEEP | existing report/state tests; no demonstrated UX defect requiring replacement |
| Fastify | KEEP | API integration tests pass |
| Application layer | KEEP | deterministic/AI boundary remains isolated |
| In-process runner | KEEP | no measured load evidence requiring extraction |
| GitHub REST | KEEP | existing safe ingestion; rate limit is evaluation-environment constraint |
| Deterministic analyzer | KEEP, calibrate later if evidence appears | controlled cases pass; public recall not freshly measured |
| Scoring | KEEP | deterministic and transparent; user comprehension remains to measure |
| SQLite | KEEP | existing persistence tests pass; no operational evidence for migration |
| Optional AI | KEEP WITH LIMITATIONS | technical boundary passes; real semantic quality unavailable |

No workers, queues, caches, databases, providers or infrastructure were added.

## Recommended Changes for Phase 16

1. Run the same benchmark with authorized, non-logged GitHub credentials or after rate-limit reset.
2. Conduct a small human review with developers for finding usefulness, evidence sufficiency and recommendation actionability.
3. Validate partial-score wording through a focused UX test before changing the scoring model.
4. Evaluate real-provider AI semantics only after explicit credentials are configured.
5. Keep metrics labelled measured, estimated or not validated.

## Deferred Changes

- scoring formula redesign;
- new analyzer rules;
- richer secret scanning;
- hash/context evidence redesign;
- workers, queues, Redis, PostgreSQL and distributed systems;
- real-time features and new AI capabilities.

## v1.0.0 Assessment

`READY WITH LIMITATIONS` remains appropriate. Phase 15 did not reveal a release-blocking defect, but it also did not provide enough fresh real-world evidence to upgrade confidence or claim production readiness.

## Recommendation for Phase 16

Phase 16 should be a focused **human usability + authorized benchmark validation** phase, not an infrastructure phase. It should obtain independent developer judgements on findings/evidence/recommendations and repeat the public benchmark under a controlled GitHub API budget.

## Status Summary

- **VALIDATED:** local contracts, deterministic behavior, security calibration fixtures, evidence relationships, nullable/partial scoring semantics, FakeAI technical boundary.
- **PARTIALLY VALIDATED:** product usefulness, evidence actionability, recommendation usefulness, UX comprehension, real-repository behavior.
- **NOT VALIDATED:** real-provider AI semantics, fresh public benchmark quality metrics, human usefulness metrics, production performance.

## Proposed Conventional Commit

```text
test: evaluate product usefulness and finding quality
```
