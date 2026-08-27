# Phase 19 — Authenticated Benchmark & Snapshot Coverage Validation

## 1. Executive Summary

Phase 19 audited the configured GitHub authentication mechanism and attempted to obtain the evidence required for an authenticated benchmark and snapshot coverage experiment.

No GitHub token was available in the environment. The anonymous GitHub API also had only 2 requests remaining when checked. Per the phase rules, no token was invented, no rate limit was bypassed, and no benchmark was silently reduced or replaced with fixtures.

The requested benchmark of at least 15 public repositories and the real `maxFileCount` experiments at 10/50/100 are therefore:

```text
BENCHMARK = NOT VALIDATED
SNAPSHOT COVERAGE EXPERIMENT = NOT VALIDATED
```

This is an external credential/quota limitation, not evidence that the product failed. The release decision remains:

```text
GO WITH LIMITATIONS
```

## 2. Authentication Status

No `GITHUB_TOKEN` or `GH_TOKEN` variable was present. No token was printed, persisted, requested, or created.

Observed anonymous GitHub quota at audit time:

- core limit: 60;
- used: 58;
- remaining: 2.

No AI credentials were present either, but AI validation was not an objective of this phase.

Authentication status:

```text
NOT VALIDATED — authenticated GitHub access was unavailable
```

## 3. Benchmark Dataset

The required retained repositories were identified from the existing runner:

- `octocat/Hello-World`;
- `sindresorhus/type-fest`;
- `expressjs/express`;
- `angular/angular`;
- `facebook/react`.

An additional diverse set of at least 10 repositories was not executed because authenticated quota was unavailable. No commit SHAs, sizes, findings, durations, or status values are claimed for a Phase 19 benchmark.

Historical five-repository measurements remain in `docs/phase-16-real-world-evaluation.md` and are not Phase 19 measurements.

## 4. Snapshot Coverage Experiment

The intended scenarios were:

| Scenario | `maxFileCount` | Status |
|---|---:|---|
| A | 10 | NOT VALIDATED against real repositories |
| B | 50 | NOT VALIDATED against real repositories |
| C | 100 | NOT VALIDATED against real repositories |

The existing ingestion API accepts per-run limits and the GitHub test suite already exercises bounded values such as 5 and 8 files. Those tests validate limit enforcement and deterministic prioritization, but they do not measure real-repository quality at 10/50/100.

Not measured:

- files and bytes observed per real repository/scenario;
- requests per scenario;
- findings by category;
- score changes;
- latency changes;
- false-positive or false-negative changes;
- metadata/test/dependency detection improvement.

All are:

```text
NOT VALIDATED
```

## 5. Ground Truth

No new Phase 19 manual ground truth was created because no real benchmark findings were produced.

Existing controlled and historical evidence supports these bounded conclusions:

- security expressions and realistic secret-like patterns have regression coverage;
- absence findings are snapshot-scoped when coverage is partial;
- unresolved imports are heuristic and medium-confidence;
- root metadata prioritization and safe canonical redirects have regression coverage;
- secret values are not persisted in evidence.

Global ground truth metrics remain:

```text
Precision = NOT VALIDATED
Recall = NOT VALIDATED
False-positive rate = NOT VALIDATED
False-negative count = NOT VALIDATED
```

UNKNOWN observations were not reclassified as positive or negative.

## 6. Finding Accuracy

Status:

```text
PARTIALLY VALIDATED
```

The existing fixture and five-repository historical evidence validates selected rule behavior, but the Phase 19 expanded authenticated sample was unavailable. No new false positive or false negative is claimed.

## 7. Performance

A Phase 19 10/50/100 comparison was not executed:

```text
NOT VALIDATED
```

The historical Phase 16 network-dependent total durations of approximately 1.08–3.79 seconds remain the latest available context only. No evidence from this phase justifies workers, queues, cache, Redis, PostgreSQL, or other infrastructure.

## 8. Security Regression

No production security behavior was changed. Existing tests continue to cover:

- HTTPS and GitHub host allowlisting;
- safe redirects;
- path traversal, symlinks, and submodules;
- request, file, byte, tree, and timeout limits;
- secret redaction/hash-only evidence;
- AI isolation and reference validation.

No repository code was executed, no repository dependencies were installed, and no repository content or credentials were persisted.

Security regression status:

```text
VALIDATED for existing tested controls
```

Exhaustive real-world behavior at higher coverage remains `NOT VALIDATED`.

## 9. Product Usefulness

No human reviewers were available and no user results were simulated:

```text
HUMAN EVALUATION = NOT VALIDATED
```

The effect of increased real snapshot coverage on evidence, recommendations, confidence, and scores is also:

```text
NOT VALIDATED
```

## 10. AI Status

AI was not exercised in this phase.

```text
AI LIVE VALIDATION = NOT VALIDATED
```

Existing FakeAIProvider tests remain technical integration evidence only.

## 11. Coverage Decision

Evidence-based decision:

```text
KEEP CURRENT BOUNDED SELECTION WITH LIMITATIONS
```

This is not a conclusion that `maxFileCount = 10` is sufficient in general. It means no evidence was obtained in this phase to justify increasing the default or introducing adaptive selection.

The current policy remains preferable to an unbounded increase because it preserves deterministic, bounded ingestion and already prioritizes metadata/source/test signals. A future authenticated experiment should compare 10/50/100 on the same commit SHAs before changing the default.

## 12. Changes Applied

Only this documentation file was added:

```text
docs/phase-19-authenticated-benchmark.md
```

No analyzer, scoring, ingestion, frontend, API, AI, or infrastructure code was changed. No regression test was needed because no new defect was established.

## 13. Quality Gates

All required gates passed after documentation was created:

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

Exact test count:

```text
75 passing
```

Breakdown:

- Domain: 15;
- GitHub: 19;
- Analyzer: 17;
- Scoring: 3;
- Persistence: 2;
- AI: 4;
- API: 7;
- Frontend: 4.

Warnings were not hidden: local Node is `25.3.0` while the project targets Node 24, and SQLite remains experimental in the local runtime.

## 14. Final Release Decision

```text
GO WITH LIMITATIONS
```

Justification:

- existing deterministic and security controls remain green;
- no new defect was introduced;
- the authenticated benchmark could not be run because no token was available;
- anonymous quota was insufficient for the required sample;
- coverage scenarios 10/50/100 remain unmeasured on real repositories;
- precision, recall, human usefulness, and live AI quality remain unavailable.

This does not imply production-ready or enterprise-ready status.

## 15. Remaining Limitations

- authenticated GitHub benchmark of 15+ repositories: `NOT VALIDATED`;
- snapshot coverage experiment at 10/50/100: `NOT VALIDATED`;
- no authenticated token available;
- anonymous GitHub quota limited to 2 remaining requests;
- precision/recall and false-positive rate unavailable;
- no independent human reviewers;
- no live AI validation;
- partial snapshots and snapshot-scoped absence findings remain a product limitation;
- no production load, multi-instance, backup/recovery, or HA validation;
- no browser E2E or complete WCAG audit;
- local Node 25 differs from project/CI Node 24;
- `node:sqlite` remains experimental.

## 16. Recommendation for Next Step

After a GitHub token is safely available through server-side environment configuration, run the retained five repositories plus at least ten diverse public repositories at `maxFileCount` 10, 50, and 100 using the same commit SHAs where possible. Record requests, bytes, findings, scores, limitations, and timings without persisting repository contents or credentials. Then perform the manual ground-truth review before changing the default selection policy.

## Conventional Commit

```text
test: validate authenticated benchmark readiness
```
