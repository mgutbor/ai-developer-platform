# Phase 29 — JTBD Validation Experiment

> Phase 29 is an experiment, not a build phase. No production code was changed.
> Machine-observed evidence comes from real executions of the product
> (Phase 22 frozen dataset + anonymous runs of the released v1.0.0 product and
> the Phase 26/27 code, which produce the same findings with additional
> evidence semantics and verification guidance). No human validation was
> fabricated; the interview protocol is prepared but the sessions are pending
> real developers.

## 1. Hypothesis

> A developer evaluating an unfamiliar public GitHub repository can use
> ai-developer-platform to discover at least one technically relevant,
> **verifiable** and **actionable** risk that is not immediately obvious from a
> short manual inspection of the repository.

## 2. Primary JTBD

> "Before adopting or contributing to an unfamiliar repository, help me quickly
> understand whether there are technical risks I should know about."

## 3. Aha moment

> "I discovered something about this repository that I would probably not have
> noticed in my first few minutes looking at it — and I can verify why the tool
> is telling me this."

## 4. North Star (experiment metric)

Percentage of analyses producing at least one finding a developer considers both
**verifiable and actionable**. Proxy used in this machine-only phase: share of
executions producing at least one finding classified `NON_OBVIOUS +
VERIFIABLE + ACTIONABLE`.

## 5. Experiment design

- **Method:** run the real product (HTTP flow: POST /analyses → poll → report)
  on a fixed sample of well-known public repositories; establish a lightweight
  3–5 minute human-inspection baseline per repository; classify every finding
  for novelty, verifiability, actionability, trust and misleading risk.
- **Constraint:** GitHub anonymous quota (~60 req/h/IP). No waiting strategy:
  if quota is exhausted, the run stops, incomplete rows are marked, and the
  experiment ends honestly.
- **Reuse of prior evidence:** Phase 22 executed the same product on the same
  class of repositories with a token (8 repos, 25 findings); the anonymous
  runs cover 2 additional small repos without any token. Both are machine
  observations of the same deterministic pipeline; Phase 26/27 added evidence
  semantics and verification to the same findings (verified by analyzer tests).
- **Bias controls:** the sample deliberately includes repositories where the
  analyzer is likely to produce little or nothing (react, vite) and well-known
  repos (hardest case for novelty). No limitation is counted as a finding. High
  scores are not treated as quality. Absence-based findings are not treated as
  confirmed defects.

## 6. Repository sample (10)

| # | Repository | Situation | Expected analyzer result | Evidence source |
|---|---|---|---|---|
| 1 | `octocat/Hello-World` | very small, demo | 3 absence findings, insufficient coverage | anonymous run + Phase 22 |
| 2 | `sindresorhus/camelcase` | small, mature, single-purpose | 6 findings, partial coverage | anonymous run |
| 3 | `sindresorhus/type-fest` | small-medium TS library, strong docs | 7 findings, partial | Phase 22 (token) |
| 4 | `expressjs/express` | medium, mature, strong tests/CI | 4 findings, partial | Phase 22 (token) |
| 5 | `axios/axios` | medium JS library | not executed (quota) | — |
| 6 | `nestjs/nest` | medium-large, strong docs/CI | 2 findings, partial | Phase 22 (token) |
| 7 | `vuejs/core` | large, strong tests | 5 findings, partial | Phase 22 (token) |
| 8 | `angular/angular` | very large, strong tests/CI | 4 findings, partial | Phase 22 (token) |
| 9 | `facebook/react` | very large | **failed** (`ingestion_limit_reached`) | Phase 22 |
| 10 | `vitejs/vite` | large | **failed** (`ingestion_limit_reached`) | Phase 22 |

**Executed:** 8 of 10 (2 failed before producing a report, by design of the
sample). **Not executed in this phase:** `axios/axios` (anonymous quota 0/60 at
experiment start; no waiting per design).

## 7. Baseline methodology (lightweight, 3–5 min per repo)

Baseline signals recorded from well-known public facts about each repository
(the kind a developer sees on the GitHub page): README quality, test presence,
CI presence, linting/tooling, dependency management (lockfile), project
structure, recent activity, obvious maintenance concerns. Baselines are
deliberately shallow; uncertain items are marked `UNCERTAIN`.

| Repo | README | Tests | CI | Lint | Lockfile | Structure/activity |
|---|---|---|---|---|---|---|
| Hello-World | minimal | none | none | none | n/a | demo, single file |
| camelcase | good | yes | yes | yes (xo) | yes | tiny, mature |
| type-fest | excellent | yes | yes | yes (xo) | UNCERTAIN | TS types library |
| express | good | extensive (mocha) | yes | yes (eslint) | yes (package-lock) | mature, lib/ monolith |
| nestjs | excellent | yes | yes | yes | yes | framework, structured |
| vuejs/core | excellent | extensive (vitest) | yes | yes | yes | monorepo packages/ |
| angular | excellent | extensive (karma/jest) | yes | yes | yes | huge monorepo |
| react | excellent | extensive | yes | yes | yes | huge monorepo |
| vite | excellent | extensive (vitest) | yes | yes | yes | monorepo |

## 8. Product observations (machine-observed)

| Repo | Status | Coverage | Confidence | Files | Requests | Findings |
|---|---|---|---|---|---|---|
| Hello-World | ok | insufficient | low | 1 / ~4 | 5 | 3 |
| camelcase | ok | partial | medium | — | 13 | 6 |
| type-fest | ok | partial | — | 50 | 62 | 7 |
| express | ok | partial | — | 21 | 93 | 4 |
| nestjs | ok | partial | — | 50 | 96 | 2 |
| vuejs/core | ok | partial | — | 50 | 83 | 5 |
| angular | ok | partial | — | 50 | 109 | 4 |
| react | **failed** | n/a | n/a | n/a | 125 | 0 |
| vite | **failed** | n/a | n/a | n/a | 125 | 0 |

## 9. Finding evaluation matrix

Every finding, classified for the **pre-adoption user who does not know the
repository** (1–5: 5 = strongly, 1 = not at all).

| Repo | Finding | Rule | Verifiable | Actionable | Novel | Trustworthy | Misleading risk | Developer value |
|---|---|---|---|---|---|---|---|---|
| Hello-World | Test files not detected | AN-TEST-001 | 2 | 1 | 1 (demo repo) | 3 | medium (absence on 1/4 files) | 1 |
| Hello-World | Test tooling not detected | AN-TEST-002 | 2 | 1 | 1 | 3 | medium | 1 |
| Hello-World | Lint config not detected | AN-TOOL-001 | 2 | 1 | 1 | 3 | medium | 1 |
| camelcase | Test files not detected | AN-TEST-001 | 2 | 2 | 2 (repo has tests; snapshot miss) | 2 | **high** (false-ish) | 1 |
| camelcase | No lockfile detected | AN-DEP-001 | 2 | 3 | 2 | 2 | high (absence claim) | 2 |
| camelcase | TS strictness unverified | AN-CQ-002 | 2 | 1 | 2 | 3 | low (honest) | 1 |
| camelcase | Source file > heuristic | AN-MAINT-001 | 3 (path+lines) | 1 | 2 | 3 | low | 1 |
| type-fest | Tests/tooling/lint absence (3) | AN-TEST-001/002, AN-TOOL-001 | 2 | 2 | 2 | 3 | medium | 1–2 |
| type-fest | No lockfile detected | AN-DEP-001 | 2 | 3 | 2 | 2 | high | 2 |
| type-fest | Strictness unverified | AN-CQ-002 | 2 | 1 | 2 | 3 | low | 1 |
| type-fest | Large source file | AN-MAINT-001 | 3 | 1 | 2 | 3 | low | 1 |
| type-fest | Unresolved import | AN-ARCH-002 | 2 | 2 | 2 | 2 | **high** (resolver limitation) | 1 |
| express | No lockfile detected | AN-DEP-001 | 2 | 3 | 2 | **1** | **high (package-lock.json exists; snapshot miss)** | 1 |
| express | Large source file (lib/application.js) | AN-MAINT-001 | 3 | 1 | 3 | 3 | low | 2 |
| express | Unresolved import | AN-ARCH-002 | 2 | 2 | 2 | 2 | high | 1 |
| express | Secret-like demo content | AN-SEC-003 | 2 (hash only) | 2 | **4** | 2 | medium (likely test fixture) | 2 |
| nestjs | Strictness unverified | AN-CQ-002 | 2 | 1 | 2 | 3 | low | 1 |
| nestjs | Unresolved import | AN-ARCH-002 | 2 | 2 | 2 | 2 | high | 1 |
| vuejs/core | Test files not in snapshot | AN-TEST-001 | 2 | 1 | 2 | 3 | low (honest not_inspected) | 1 |
| vuejs/core | Strictness unverified | AN-CQ-002 | 2 | 1 | 2 | 3 | low | 1 |
| vuejs/core | Large source file | AN-MAINT-001 | 3 | 1 | 2 | 3 | low | 1 |
| vuejs/core | Unresolved import | AN-ARCH-002 | 2 | 2 | 2 | 2 | high | 1 |
| vuejs/core | Possible secret-like value | AN-SEC-003 | 2 | 3 | **4** | 2 | medium (unverifiable) | 2 |
| angular | Tests not in snapshot / strictness / large file / import (4) | — | 2–3 | 1–2 | 2 | 3 | low-medium | 1 |
| react | **no report** (limit) | — | — | — | — | — | — | 0 |
| vite | **no report** (limit) | — | — | — | — | — | 0 |

**Novelty summary:** `OBVIOUS` ≈ 8 · `NON_OBVIOUS` ≈ 3 (express demo-secret,
vuejs possible-secret, express large file) · `UNCERTAIN` ≈ 14.
**Key metric:** `NON_OBVIOUS + VERIFIABLE + ACTIONABLE` = **0 of 25 findings**.
The three NON_OBVIOUS findings are all unverifiable (hash-only evidence) and
low/medium actionability.

## 10. Trust evaluation

Per useful finding: WHAT / WHY / WHERE / VERIFY / LIMITATION.

| Aspect | Result | Evidence |
|---|---|---|
| WHAT (understand the issue) | **PASS** | clear titles, descriptions, impact text |
| WHY (why it matters) | **PASS** | impact field is explicit and measured |
| WHERE (locate evidence) | **PARTIAL** | path + line range, but no content |
| VERIFY (independently confirm) | **FAIL** | evidence is `excerptHash` only; developer must open the repo |
| LIMITATION (what was NOT inspected) | **PASS** | coverage + limitations + `inspectedScope` are explicit and honest |

Critical patterns observed:

- **Absence-based + partial snapshot:** several absence claims are wrong for the
  real repository (e.g., express `AN-DEP-001` "no lockfile" while
  `package-lock.json` exists; camelcase "no tests" while tests exist). The
  `not_inspected` semantics (Phase 26) mitigate the worst cases, but the value
  is a *null signal*, not information.
- **`AN-ARCH-002` (unresolved imports):** consistently produced on repos whose
  imports obviously resolve (angular, vue, nest, type-fest). These are
  resolver-policy artifacts, not defects; a developer investigating them would
  conclude the tool is wrong. High misleading risk.
- **Hash-only evidence:** no finding can be verified from the report alone.
  This directly breaks the aha moment ("I can verify why").
- **High confidence on partial coverage:** mitigated by Phase 26 coverage
  messaging, but dimension scores still read as verdicts.

## 11. Actionability evaluation

| Classification | Findings | Notes |
|---|---|---|
| `NO_ACTION` | ~15 | absence/tooling/strictness findings on repos where the fact is visible or irrelevant to adoption |
| `INVESTIGATE` | ~9 | imports (likely false), lockfile (likely false), secrets (real but unverifiable) |
| `MITIGATE` | 0 | nothing in the sample warranted a pre-adoption mitigation decision |
| `REJECT` | 0 | nothing |
| `ADOPT_WITH_CAUTION` | 0 | nothing |

**Recommendation effectiveness:** the Phase 27 recommendations and verification
guidance are well-formed and honest, but they guide *the owner fixing the repo*,
not the *adopter deciding whether to adopt*. For the pre-adoption JTBD, the
recommendations did not change any adoption decision in this sample.

## 12. Novelty evaluation (central question)

> Would a developer reasonably discover this within the first 3–5 minutes on
> GitHub?

- Absence findings on **tiny repos** (Hello-World): `OBVIOUS` — a 5-minute look
  shows a demo repo with no tests.
- Absence findings on **known mature repos** (express, type-fest, vue, angular):
  mostly `OBVIOUS` or wrong (snapshot miss) — and even when right, the developer
  can see tests/CI on the GitHub page.
- `AN-SEC-003` secret-like signals: `NON_OBVIOUS` (a developer does not grep a
  repo for secrets in 5 minutes) — **but unverifiable** (hash only) and likely
  low-value fixtures.
- `AN-MAINT-001` large files: `NON_OBVIOUS`-borderline, low actionability.

**Conclusion on novelty:** the product's current output is *mostly obvious or a
null signal*, with a small genuine signal (secrets) that the product cannot make
verifiable. This is the opposite of the required `NON_OBVIOUS + VERIFIABLE +
ACTIONABLE` finding.

## 13. Developer interview protocol (prepared, NOT conducted)

8 questions — the document below records the protocol; real developer responses
must be entered later in `docs/jtbd-validation-template.md`:

1. What do you think this product is for?
2. What was the first thing that caught your attention?
3. Did you discover anything you would not have noticed yourself?
4. Which finding did you trust?
5. Which finding did you not trust?
6. Did any result change what you would do with the repository?
7. What information was confusing or unnecessary?
8. Would you use this before adopting another GitHub repository? Why?

## 14. Machine-observed evidence (this phase)

- 8 executions of the real product on well-known public repos; 25 findings.
- 2 anonymous executions of the released product (Hello-World, camelcase).
- **0 of 25 findings** classified `NON_OBVIOUS + VERIFIABLE + ACTIONABLE`.
- 3 findings classified `NON_OBVIOUS` (all secrets or file-size, all
  unverifiable, all low/medium actionability).
- 2 of 10 sample repos produced **no report at all** (react, vite — the two
  largest, i.e., the repos where pre-adoption risk analysis would matter most).
- Controlled failure behavior verified in prior phases (`GITHUB_RATE_LIMITED`,
  `SNAPSHOT_LIMIT_EXCEEDED`) — engineering is sound; value is not demonstrated.

## 15. Human-validation section

**Status: PENDING — not performed.** No developer interviews were conducted in
this phase and none were fabricated. The protocol (section 13) and the
recording template (`docs/jtbd-validation-template.md`) are ready. The decision
below is based exclusively on machine-observed evidence; a GO decision cannot be
made without the human sessions.

## 16. Success criteria (applied)

| Criterion | Result |
|---|---|
| ≥70% of sessions produce a `NON_OBVIOUS + VERIFIABLE + ACTIONABLE` finding | **NOT MET (0/8)** |
| Developers understand purpose without explanation | not testable (no sessions) |
| Developers trust evidence enough to investigate | not testable (no sessions); machine evidence shows verifiability FAIL |
| Findings change developer's next action | not testable; machine evidence shows 0 `MITIGATE`/`REJECT`/`ADOPT_WITH_CAUTION` |
| Differentiated value over a quick manual GitHub inspection | **NOT DEMONSTRATED** on this sample |

## 17. Risks and biases (explicit)

- **Sample bias (favorable to the product):** none intended — the sample is
  well-known repos, which is the *hardest* novelty test. Unknown-repo novelty is
  therefore **untested**, and absence findings would likely be more novel there.
- **Sample bias (unfavorable):** well-known repos understate value for truly
  unknown repos; conclusions about novelty should not be extrapolated to
  unknown repos.
- **Absence-based counting:** no limitation was counted as a finding; absence
  findings were not treated as defects.
- **No human validation:** all qualitative conclusions are machine-only.
- **Stale artifacts:** the anonymous reports predate Phase 26/27; the findings
  are identical under the current code (verified by analyzer tests), which adds
  `evidenceStatus` and verification — neither changes the novelty/verifiability
  conclusions (verifiability still fails: no content evidence).
- **Experimenter bias:** mitigated by using only recorded machine outputs and
  per-repo baselines written before scoring.

## 18. Decision

**NO-GO / PIVOT — for the current product as a pre-adoption risk tool.**

Based on machine-observed evidence alone:

1. The 70% threshold is clearly missed: **0/8 executed repositories** produced
   a `NON_OBVIOUS + VERIFIABLE + ACTIONABLE` finding.
2. Most useful-seeming findings are `OBVIOUS` (visible on the GitHub page) or
   absence claims that the real repository contradicts (`express` lockfile,
   `camelcase` tests) — a trust liability, not a signal.
3. `AN-ARCH-002` findings are resolver artifacts, repeatedly produced on repos
   whose imports resolve — misleading and noisy.
4. The one genuinely novel signal class (`AN-SEC-003` secrets) is unverifiable
   by design (hash-only evidence), so the aha moment ("I can verify why")
   cannot occur.
5. The repos that most need pre-adoption analysis (react, vite — large,
   unknown internals) produce **no report** under the current ingestion limits.

Qualification: this decision rejects the *current implementation* for the JTBD,
not the JTBD itself. The enabling conditions identified in Phase 28 (verifiable
content evidence; key-files + repository signals to fix coverage and quota;
risk-ordered reporting) remain untested. The novelty potential of absence
triage on genuinely **unknown** repositories is also untested.

**Recommended continuation (Phase 30, only if justified):** a narrow,
prototype-level experiment — NOT a build — that (a) runs on a sample of
genuinely unfamiliar, mid-size repositories, (b) adds redacted content evidence
for `verified`/secret findings, and (c) collects the 3–5 developer sessions
defined here. Exit gate unchanged: ≥70% of sessions with a verifiable,
actionable, non-obvious finding. If that experiment also fails, **stop feature
development** and keep the project as a portfolio artifact.

## 19. Recommendation for Phase 30 (conditional)

- **Type:** prototype experiment (isolated, experimental tooling only).
- **Do NOT build:** MVP 2.0 features, AI, accounts, more rules, ingestion
  expansion.
- **Must include:** unknown-repo sample; redacted evidence excerpts; developer
  sessions via the protocol in section 13.
- **Decision gate:** ≥70% aha per session → proceed; otherwise stop.

---

*Honesty note: this phase produced no GO evidence. The product remains a
well-engineered, honest triage prototype whose value for the pre-adoption JTBD
is not demonstrated by machine evidence and requires human validation that has
not yet occurred.*
