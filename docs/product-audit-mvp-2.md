# Product Audit — MVP 2.0 Definition (Phase 28)

> Phase 28 is a strategy and validation-planning phase. No code was changed.
> Verdicts are based on the actual implementation (analyzer, scoring, ingestion,
> contracts, frontend), real E2E executions from Phases 22–27, and the v1.0.0
> conceptual audit (`docs/product-audit-v1.0.0.md`).

## 1. Executive summary

`ai-developer-platform` is a deterministic, zero-configuration analyzer of public
GitHub repositories: paste a URL, get a report with findings, evidence status,
dimension scores, recommendations and verification guidance. It works, it is
honest about its limitations, and it is exceptionally well engineered for an MVP.

The developer value is nevertheless **low-to-moderate (3–4/10)**. The reason is
not engineering quality — it is that the current product competes, for repos a
developer already owns, with tools that are strictly better at every individual
job (ESLint, TypeScript, SonarCloud, Dependabot, CodeQL, gitleaks, CI, IDE).
For repos the developer does **not** own, the current product is often not
usable at all: the bounded ingestion exceeds the anonymous GitHub quota for
repositories larger than tiny, and the evidence model does not yet let a
developer verify a finding without opening the repository.

There is, however, one defensible niche where the existing architecture has a
real structural advantage: **a zero-configuration technical risk snapshot of an
unfamiliar public repository before adopting it, using it as a dependency, or
contributing to it.** No competing tool delivers this with zero setup, no clone,
and an explicit, auditable statement of what was and was not inspected.

**Verdict: continue, but narrow the product to that job.** The current
"general repository analyzer" is not a differentiated product. The due-diligence
snapshot is. Phase 29 must validate that hypothesis with a thin experiment
before any significant build.

## 2. Current product reality (factual)

### Input
A public GitHub repository URL (optionally a ref). Nothing else. No accounts,
no auth, no configuration. Anonymous GitHub access works within the IP quota
(~60 requests/hour); an optional server-side `GITHUB_TOKEN` raises it to
~5,000/hour.

### Pipeline
```
URL → AnalysisJob → GitHub REST → bounded ingestion → deterministic analyzer
→ scoring → SQLite persistence → report API → Angular frontend
```

### Bounded ingestion (actual limits)
- `maxFileCount = 50` files
- `maxApiRequests = 125` requests per analysis
- `maxJsonResponseBytes = 4 MiB` per response
- `maxTotalBytes = 2 MiB` total file content
- `maxFileBytes = 256 KiB` per file
- `maxTreeEntries = 5000` tree entries
- request timeout 10 s, analysis timeout 60 s
- segmented tree traversal with semantics-preserving early termination
  (Phase 21), visited-tree protection, no blob fetch before final selection

### Analyzer
14 rule IDs across 6 dimensions, fully deterministic:
- documentation: `AN-DOC-001` (README absent)
- testing: `AN-TEST-001` (no test files), `AN-TEST-002` (no test tooling)
- tooling/code quality: `AN-TOOL-001` (no lint config), `AN-CQ-002`
  (strictness unverified), `AN-CQ-003` (strict disabled), `AN-CQ-004`
  (TODO/FIXME count), `AN-CQ-005` (TS ignore directives)
- dependencies: `AN-DEP-001` (manifest without lockfile)
- maintainability: `AN-MAINT-001` (source file > 400-line heuristic)
- architecture: `AN-ARCH-001` (deep nesting), `AN-ARCH-002` (unresolved import)
- security: `AN-SEC-002` (sensitive filename), `AN-SEC-003` (committed /
  possible / placeholder / demo secret-like values; **only a hash is stored**)

### Output (report)
- repository identity, commit SHA, analyzer/rule versions
- coverage: `complete | partial | insufficient`
- confidence: `high | medium | low`
- `inspectedScope`: file count, tree entries seen, total bytes
- dimension scores (0–10 or `null` when signals insufficient) for
  architecture, maintainability, testing, documentation, dependencies,
  code quality — **no global score** (explicit MVP decision)
- findings with severity, category, title, description, impact,
  `evidenceStatus` (`verified | absence_based | not_inspected | not_verified`)
- evidence: kind, path, line range, stable `excerptHash` — **no content
  excerpts** (deliberate security decision)
- recommendations with title, description, priority and **verification
  guidance** (added in Phase 27)
- limitations list, error codes (`SNAPSHOT_LIMIT_EXCEEDED`,
  `GITHUB_RATE_LIMITED`, etc.)

### Real E2E observations (Phases 22–23, product-value experiment)
- `octocat/Hello-World`: completed in ~3 s, **1 of ~4 files** ingested,
  coverage `insufficient`, 3 absence-based findings, 6 dimension scores.
- `sindresorhus/camelcase`: completed, coverage `partial`, 6 findings.
- `sindresorhus/type-fest` (small-medium): **consumed all 60 anonymous
  requests** and failed with `GITHUB_RATE_LIMITED`; no report.
- `expressjs/express`: no quota available; failed immediately, controlled.
- react/react and vitejs/vite (Phase 22): `maxApiRequests=125` exhausted before
  a 50-file snapshot; no findings.

## 3. Developer journey (what a developer actually receives)

```
INPUT:  a GitHub URL of a public repository
ANALYSIS: zero config; queued → running → report (seconds to ~1 min)
REPORT:  coverage banner, dimension scores, findings, recommendations, limitations
FINDING: title + description + impact + severity + evidenceStatus
WHY:     impact text ("why it matters")
ACTION:  recommendation title + description
VERIFY:  verification guidance ("how to verify", Phase 27)
```

Where the journey breaks:

1. **Coverage ceiling.** For any repository above "tiny", the report is built on
   a partial snapshot; for medium+ repositories it frequently fails outright
   (anonymous quota) or returns no findings (react/react, vitejs/vite). The
   developer cannot get a report at all for the repositories that would be most
   worth analyzing.
2. **Absence dominates.** Most findings are `absence_based` ("X was not
   detected in the inspected snapshot"). These are honest but weak: they cannot
   confirm a defect, and a developer who owns the repo already knows whether
   they have tests.
3. **Evidence is not verifiable content.** The evidence points to a path and a
   hash. The developer cannot see *what was observed* without opening the
   repository — at which point the product's value proposition (understanding
   without the repo) collapses.
4. **Scores risk false precision.** `8.5/10` on a partial snapshot reads as a
   quality verdict even with the honesty framing; the dimension scores add
   credibility to the report but not much decision power.

## 4. Developer output audit

| Output | Exists | Comprehensible | Actionable | Verifiable | Real value |
|---|---|---|---|---|---|
| Finding | YES | YES | PARTIAL | NO (no content) | MEDIUM |
| Evidence | YES | YES (status) | NO | PARTIAL (path/range) | LOW |
| Coverage | YES | YES | YES (sets expectations) | YES | MEDIUM-HIGH |
| Confidence | YES | PARTIAL (can imply more than known) | — | PARTIAL | LOW-MEDIUM |
| Score | YES | PARTIAL (false precision risk) | LOW | NO | LOW |
| Recommendation | YES | YES | YES | YES (P27) | MEDIUM-HIGH |
| Verification | YES | YES | YES | YES (re-run) | MEDIUM-HIGH |

The two outputs that carry real, defensible value today are **coverage
(including the honesty framing)** and **recommendation + verification**.
The two weakest are **evidence** (traceability, not content) and **scores**
(false precision risk). Findings sit in the middle: individually plausible, but
dominated by absence-based claims on partial snapshots.

## 5. Value audit (honest, not inflated)

- **Functional (technical) value: HIGH.** It works end to end, is deterministic,
  reproducible, tested, and honest.
- **Utility for a repo you own: LOW-MEDIUM.** Your IDE, linter, type checker,
  CI and Dependabot already do every individual check deeper and with your full
  codebase. The report adds a summary, not new information.
- **Utility for a repo you do not own: MEDIUM but conditional.** The idea
  ("what are this repo's technical risks?") is useful; the delivery currently
  fails for most such repos (coverage/quotas) and cannot show evidence content.
- **Differentiation: LOW-MEDIUM.** Nothing in the current output is something a
  developer cannot get, with more depth, from existing tools — *except* the
  zero-config, no-clone, auditable combination.

## 6. Alternatives / competitor test

| Tool | Detects | Stronger than this product | Where this product could win |
|---|---|---|---|
| ESLint / Biome | Lint rules on your code | Deeper, configurable, local, full codebase | Nothing for owned repos |
| TypeScript | Type errors | Exhaustive for TS | Nothing |
| SonarCloud/SonarQube | Deep static analysis, maintainability | Far deeper; free tier for public repos | Requires setup/auth; this product is zero-config |
| Dependabot/Renovate | Dependency updates | Continuous, automated PRs | Nothing for owned repos; needs repo access |
| CodeQL | Security queries | Deeper, CI-integrated | Needs GitHub Actions setup |
| gitleaks / secret scanners | Committed secrets | Specialized and better | Determinism + report integration |
| Snyk | Dependency vulnerabilities | Advisory-based, continuous | Nothing for owned repos |
| GitHub native signals | Stars, activity, license, README | Always available | GitHub does not synthesize a technical risk summary |
| IDE + human review | Everything, with judgment | Best possible | Requires context and time |

**Conclusion:** for repositories a developer owns, there is no defensible
differentiation. For **unknown public repositories**, existing tools require
setup, repo access, or a clone — none deliver a zero-config risk snapshot. The
differentiation is real but narrow and currently unimplemented.

## 7. Jobs To Be Done

Candidate jobs:

1. **Pre-adoption / pre-dependency risk snapshot**
   - User: a developer evaluating an unfamiliar public repo (adopt, depend on,
     contribute to).
   - Situation: browsing GitHub, deciding in minutes whether the repo is
     healthy enough.
   - Problem: README + stars + activity do not reveal technical risk (secrets,
     broken test setup, unmaintained deps, documentation drift).
   - Motivation: avoid adopting something that will cost time later.
   - Output: a short, risk-ordered technical snapshot.
   - Frequency: occasional, high stakes.
   - Value: high if it surfaces one real risk per repo.

2. **Inherited-codebase onboarding**
   - User: a developer who just joined a team or inherited a repo.
   - Situation: needs a map of where to start.
   - Problem: the product does not currently have the depth (per-file content,
     dependency graph) to be genuinely useful here.
   - Value: high, but requires capabilities this product does not have.

3. **Objective second opinion on my own repo**
   - User: an owner before a release or audit.
   - Situation: wants a neutral check.
   - Problem: existing tools are better; the report adds little beyond a
     summary.
   - Value: low.

4. **Trackable health over time**
   - User: an owner tracking improvement.
   - Situation: re-run on new commits.
   - Problem: requires auth, quotas, and persistence of history; value depends
     on the other jobs existing first.
   - Value: medium, later.

### PRIMARY JOB

> "Before adopting, depending on, or contributing to an unfamiliar public
> repository, I want a zero-configuration, honest technical risk snapshot that
> tells me what I should know — and what was not inspected — in under a minute."

This is the only job where the current architecture (no clone, no setup,
deterministic, explicit coverage) is a structural advantage, and the only job
where the current weaknesses (depth, evidence content) are tolerable in an MVP
2.0 that fixes them incrementally.

## 8. The "aha" moment

> "I just found out something about this repo that I would not have noticed in
> my first minutes of browsing — and I can see the actual code that proves it."

Concrete examples the product is closest to producing:
- a committed-looking credential in a config file (currently detected, but with
  no visible excerpt);
- a README/documentation claim that the code contradicts;
- test configuration that appears not to run any tests;
- an unmaintained or stale dependency in a project presented as maintained;
- evidence (with content) for any `verified` finding.

The aha requires two things the product does not yet do: **content evidence**
(what was seen) and **risk ordering** (this is the most important thing). The
current report cannot produce the moment as designed.

## 9. Current vs potential value

| Capability | Current value (1–5) | Potential value (1–5) | Effort | Priority |
|---|---|---|---|---|
| Findings | 3 | 4 | S | P1 |
| Evidence (status) | 3 | 4 | S | P1 |
| Evidence (content excerpts, redacted) | 1 | 5 | M | P0 |
| Coverage / honesty | 4 | 5 | S | P1 |
| Scores | 2 | 3 | S | P3 |
| Recommendations | 4 | 4 | S | P1 |
| Verification | 4 | 4 | S | P1 |
| Key-file presence analysis | 1 | 5 | M-L | P0 |
| Repository-level signals (license, activity, issues, releases) | 0 | 4 | M | P1 |
| Risk-ordered summary | 0 | 5 | M | P0 |
| Anonymous-quota viability for medium repos | 1 | 5 | L | P0 |
| Global score | 0 | 1 | M | P3 (do not build) |
| AI interpretation | 0 | 2–3 | XL | P3 (do not build yet) |

## 10. MVP 2.0 proposal (max 3 bets)

### Bet 1 — Verifiable evidence (safe content excerpts)

- **Problem:** a developer cannot confirm why a finding exists without opening
  the repo; evidence is traceability, not evidence.
- **User:** any developer reading the report.
- **Behavior:** every `verified` finding shows the observed content (line range
  or snippet) with secret redaction; `absence_based`/`not_inspected`/
  `not_verified` findings never show content and say why.
- **Value:** converts "trust the analyzer" into "I can check".
- **Evidence it works:** a developer confirms a finding from the report alone in
  a validation session.
- **Excludes:** full file content, raw secrets, AI summarization.
- **Risk:** redaction failures — mitigated by reusing the existing
  secret-classification logic and a strict "when in doubt, show nothing" rule
  (the Phase 26 security invariant).

### Bet 2 — High-signal key-file analysis + repository-level signals

- **Problem:** bounded ingestion makes reports partial for most repos and
  absence-based findings dominate; anonymous mode fails for medium repos.
- **User:** the pre-adoption evaluator.
- **Behavior:** ingest a curated set of high-signal files first (manifest,
  README, CI config, entry points, security-sensitive paths) plus cheap
  repository-level signals from the GitHub API (license, recent release/last
  commit, open-issue count, dependency manifests) — enough for a meaningful
  snapshot within the anonymous quota; presence-based checks over the key files
  instead of absence-based breadth.
- **Value:** a usable report for most public repos in seconds, with presence
  findings that are verifiable.
- **Evidence it works:** ≥80% of a 10-repo validation set completes within the
  anonymous quota and produces at least one presence-based finding.
- **Excludes:** full-repo traversal, cloning, deeper rules.
- **Risk:** changes ingestion economics (the Phase 21 guarantees must be
  preserved); mitigated by keeping the change additive and measured.

### Bet 3 — Risk-first due-diligence report (product shell)

- **Problem:** the report presents findings per dimension, not as a decision
  aid for "should I adopt this repo?".
- **User:** the pre-adoption evaluator.
- **Behavior:** the report leads with a short risk summary ("what you should
  know before adopting"), orders findings by risk to the adopter, and always
  shows what was not inspected.
- **Value:** the difference between "an interesting report" and "a decision
  aid".
- **Evidence it works:** a developer can state the single most important risk
  after 30 seconds with the report.
- **Excludes:** accounts, dashboards, badges, gamification.
- **Risk:** could become marketing — mitigated by keeping every statement
  tied to a finding or a fact.

These three bets are one product: evidence you can check (1) about the files
that matter (2), presented as a decision aid (3). They are ordered by
dependency — 1 and 2 enable 3.

## 11. What not to build

| Candidate | Build now? | Why / why not | Becomes justified when |
|---|---|---|---|
| AI / LLM interpretation | NO | Undermines the determinism-and-honesty differentiator; large effort; the original product.md vision of AI is not the validated value | Bets 1–3 validate the JTBD and evidence content exists to reason over |
| Chatbot | NO | No evidence anyone needs it | After accounts/usage exist |
| Global score | NO | False precision; the audit and Phase 22 explicitly rejected it | Only if a defensible composite metric is demonstrated (unlikely) |
| More analyzer rules | NO | Breadth without depth; the problem is evidence and coverage, not rule count | After key-file presence analysis proves value |
| More dimensions | NO | Same reason | After depth is proven |
| More ingestion (full traversal) | NO | The key-files strategy must be tested first; more requests worsen anonymous viability | If key-files proves insufficient and auth is solved |
| CLI | NO | Server-side product; the URL-in-browser flow is the differentiator | If power users demand automation |
| CI integration / GitHub App | NO | Requires accounts, auth, webhooks — a platform bet | After validation shows repeated use |
| Dashboards | NO | Not a decision aid | After usage data exists |
| Authentication / accounts | NO | Raises the activation barrier | After validated demand |
| Playwright / Lighthouse infra | NO | QA infrastructure is not developer value | Only when UX regressions actually hurt |
| Badges / gamification | NO | Marketing over substance | Never, in the near term |

## 12. North Star metric

**"% of analyses that produce at least one finding the developer confirms as
verifiable and would act on."**

Why: it measures the aha moment directly, it is evidence-oriented (not a
findings count), and it forces the product to optimize for the one thing that
matters — a developer doing something differently because of the report. It
requires a lightweight feedback control on the report (one click: "I would act
on this / not useful"). Until instrumentation exists, the proxy is: "% of
analyses with at least one `verified`, presence-based finding" — measurable
today.

## 13. Success criteria for MVP 2.0

A developer can:

1. Analyze an unfamiliar public repository with **zero setup** (no auth) and
   receive a report in under 60 seconds. *(observable, measurable)*
2. Read **at least one finding confirmed by content evidence** without opening
   the repository, in ≥80% of analyses on a 10-repo validation set.
   *(observable, measurable)*
3. State the **single most important risk** after 30 seconds with the report.
   *(observable, testable)*
4. Explain what was **not inspected** and why the result is trustworthy.
   *(observable, testable)*
5. Follow a **recommendation to verification** for every finding.
   *(already true since Phase 27 — must be preserved)*
6. In a 5–10 developer validation, report ≥1 finding per analysis they
   "would act on" in ≥70% of analyses. *(measurable, requires feedback
   instrumentation)*

## 14. Final product verdict

### Does it make sense to keep developing ai-developer-platform?

**YES — but narrow the product.**

The general repository analyzer, as released in v1.0.0, is not a differentiated
product: every individual capability is done better by tools developers already
use, and the bounded/anonymous limitations make it unusable for most medium+
repositories. Continuing to add rules, scores or coverage on that basis would be
building on an unvalidated premise.

However, there is a narrow, defensible job — **zero-configuration technical risk
snapshot of an unfamiliar public repository** — for which the existing
architecture (no clone, no setup, deterministic, explicit coverage semantics,
evidence-status honesty, recommendation + verification) is a structural
advantage, and for which the three MVP 2.0 bets form a coherent path.

This verdict is **conditional**: if the Phase 29 validation does not demonstrate
at least one aha per analysis for most repos, the correct answer becomes
**NO — insufficient differentiation**, and the project should stop feature work
and remain a portfolio artifact. The decision is intentionally reversible.

### What should Phase 29 be?

**A validation experiment, not an implementation phase.** Hypothesis: "a
zero-configuration risk snapshot of an unknown public repository produces at
least one actionable, verifiable insight per analysis that the evaluator would
not find within five minutes using existing tools." Phase 29 should build the
thinnest possible prototype on the current stack (key-file presence checks +
repository signals + redacted evidence excerpts + risk-ordered summary), run it
on ~10 real public repositories, and collect feedback from 3–5 developers.
The exit gate: ≥1 aha per analysis in ≥70% of cases → proceed to MVP 2.0 build;
otherwise → stop and keep the project as portfolio.

## 15. Recommended next phase (detail)

- **Name:** Phase 29 — Pre-adoption snapshot validation
- **Type:** validation experiment (thin prototype + interviews), NOT a build
- **In scope:** key-file presence checks; repository-level signals; redacted
  evidence excerpts for top findings; risk-ordered summary; 10-repo run;
  3–5 developer interviews
- **Out of scope:** AI, accounts, CI, CLI, GitHub App, global score, new rules
- **Success:** ≥70% of analyses produce a confirmed aha
- **Failure:** stop feature development; keep the deterministic analyzer as
  portfolio

---

*This document is a product-strategy audit. It makes no claims about product
readiness, accuracy, or coverage beyond what the implementation and real
executions demonstrate. See `docs/product-audit-v1.0.0.md` for the v1.0.0 audit
and `docs/phase-26-evidence-and-trust.md` / `docs/phase-27-developer-actionability.md`
for the trust and actionability work it builds on.*
