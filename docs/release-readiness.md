# Release readiness — v1.0.0

## Question

**Is ai-developer-platform ready to be released as v1.0.0?**

**Answer: YES — READY, released as v1.0.0 with documented limitations.**

This document is the authoritative release-readiness statement for the MVP release. It reflects the final state after all MVP phases (1–25), including the ground-truth validation (Phase 22), the end-to-end product validation (Phase 23) and the UX/documentation/portfolio polish (Phase 24).

## Release version

**1.0.0** (tag `v1.0.0`, annotated, pointing to the final MVP release commit).

## Release scope

The v1.0.0 MVP: a deterministic, evidence-backed Developer Health Report for public GitHub repositories, delivered through an Angular UI and a Fastify API with SQLite persistence.

### What is included

- Public GitHub repository URL validation and commit-anchored bounded ingestion.
- Segmented Git-tree traversal with semantics-preserving early termination (Phase 21) — large repositories like `microsoft/TypeScript` and `nodejs/node` are ingestible within limits.
- Deterministic TypeScript/JavaScript analysis (18 rules) producing facts, metrics, evidence, findings and recommendations.
- Nullable dimensional scoring (no global score).
- In-process `AnalysisJob` lifecycle with SQLite persistence and retention cleanup.
- Fastify report API (`/analyses`, `/analyses/:id`, `/report`, `/findings`, `/recommendations`, `/facts`, `/ai`).
- Angular report experience with clear states: loading, completed, completed-with-limitations, failed, snapshot-limit-exceeded, insufficient coverage (Phase 24).
- Optional, isolated AI interpretation (never authoritative; no live-provider validation).
- Security boundaries: SSRF/redirect/traversal/symlink/submodule protections, sanitized errors, server-side-only GitHub credentials.
- Documentation: README, architecture, development, security, portfolio, ADRs, roadmap, phase docs, release notes.

### What is explicitly NOT included

- Private repositories and authentication.
- Advanced ingestion (unbounded or configurable limits, tree redesign beyond segmented traversal).
- Additional analyzer rules or scoring dimensions beyond the current 18 rules / 5 dimensions.
- Full SAST, complete AST semantic analysis, or complete module resolution.
- Repository code execution, builds, tests or package installation.
- Vulnerability database scanning.
- Global or AI-generated scores.
- Automatic remediation, GitHub App integration.
- Workers, queues, Redis, PostgreSQL, microservices, realtime.
- RAG, embeddings, agents, chat, streaming.
- Billing, analytics, multi-tenant enterprise features.
- Browser-level E2E automation (Playwright) and automated axe auditing.

## Validation completed

### Phase 22 — Ground-truth validation (`KEEP WITH LIMITATIONS`)

- Frozen dataset of 8 public repositories with exact commit SHAs (`docs/phase-22-ground-truth-dataset.md`).
- 25 findings produced and classified by human review: **7 TP, 0 FP, 2 uncertain, 16 not-evaluable** (`docs/phase-22-final-results.md`).
- Conclusion: the sample is **insufficient for a defensible precision/recall evaluation**. Evaluable rate 28% (7/25); the 100% TP rate among evaluable findings is explicitly **not** presented as analyzer precision.
- Decision: **KEEP WITH LIMITATIONS** — no production rule changes justified by the sample.

### Phase 23 — E2E + product validation (`PASS WITH LIMITATIONS`)

- Real product server driven over HTTP against real public GitHub repositories (`docs/phase-23-e2e-product-validation.md`).
- Scenarios PASS: successful analysis (`octocat/Hello-World` → real commit SHA, findings, evidence, scores, coverage), invalid URL (400), repository not found (`REPOSITORY_NOT_FOUND`), ingestion limit (`SNAPSHOT_LIMIT_EXCEEDED` on `react/react`), partial/insufficient coverage, API↔UI consistency, accessibility and security baselines.
- Defect found and fixed: the production server never wired the server-side GitHub credential into the GitHub client (analyses ran unauthenticated, hitting the ~60 req/h unauthenticated limit). Fixed minimally in `apps/api/src/app.ts` (reads `GITHUB_TOKEN ?? GH_TOKEN`) with regression tests (`apps/api/src/app.token.test.ts`).
- Zero-finding scenario: **NOT EXECUTED** (no suitable repo in the sample); the UI distinguishes the empty-findings state via code.

### Phase 24 — UX + documentation + portfolio polish (`PASS`)

- User-facing messaging for failure states, coverage and limitations in plain language (internal codes as secondary detail).
- Coverage banner distinguishing complete / partial / insufficient; honest evidence references.
- README overhaul (quick-start, env vars, server-side GitHub credential setup), architecture CURRENT-vs-FUTURE, portfolio documentation.

## Quality gates

All gates pass on the final release state:

```text
pnpm install --frozen-lockfile
pnpm check:architecture
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --audit-level=high
git diff --check
```

Test suite: domain, github (25), analyzer, scoring, persistence, ai, api, web — 92 tests, 0 failures (frontend 17 including the Phase 24 message-mapping tests; API includes the Phase 23 credential-wiring regression tests).

## Security verification

- GitHub credentials are **server-side / environment-only** (`GITHUB_TOKEN` or `GH_TOKEN`), resolved by the production API and passed to the GitHub client; never returned through API responses, never persisted in SQLite, never logged.
- README and docs show placeholder examples only; no real token is committed.
- Scans of the working tree, staged changes and docs found no committed credentials, `Authorization`/`Bearer` values, or secrets.
- Repository contents are treated as data; no repository code is executed, no dependencies of analyzed repositories are installed.
- Errors are sanitized (no stack traces or internal details to users); SSRF/redirect/traversal/symlink/submodule protections are covered by tests.

## API/product validation

Real product E2E against public repositories (Phase 23) validated: successful analysis, invalid URL, repository-not-found, ingestion-limit, partial coverage, upstream errors, report data consistency (API ↔ UI), security baseline. Browser-level E2E (Playwright) is not configured; frontend is validated by unit tests plus API-contract verification against the real server.

## Known limitations

- **Bounded ingestion:** `maxFileCount=50`, `maxApiRequests=125`, `maxJsonResponseBytes=4 MiB`, `maxTotalBytes=2 MiB`, `maxFileBytes=256 KiB`, timeouts. Coverage is `partial`/`insufficient` for most repositories.
- **SNAPSHOT_LIMIT_EXCEEDED:** very large repositories (`react/react`, `vitejs/vite`) cannot complete a 50-file snapshot within `maxApiRequests=125`; the product surfaces this as a controlled failure, never as a complete analysis.
- **Absence-based evidence:** rules such as `AN-TEST-001`/`AN-TEST-002`/`AN-TOOL-001`/`AN-CQ-002`/`AN-DEP-001` can report "not detected" when the bounded snapshot may not contain all relevant files (Phase 22); evidence semantics could improve in a future iteration.
- **AN-ARCH-002:** unresolved-import findings reflect bounded static-resolution failures; not demonstrably real defects (Phase 22).
- **Ground truth:** sample insufficient for defensible precision/recall; no claim of analyzer accuracy.
- **No browser E2E / automated axe** (Playwright and Lighthouse tooling intentionally not added).
- **AI:** optional and not live-validated (no provider credentials configured); deterministic report is authoritative.

## Known non-blocking gaps

- Lighthouse scores unmeasured (no tooling configured).
- No production-scale load/concurrency measurements.
- No operational backup/retention runbook.
- No real-provider AI evaluation.
- No multi-instance rate limiting.

## Operational requirements

- Node.js 24 (`.nvmrc`), pnpm 10.34.5.
- Run `pnpm install --frozen-lockfile`, then `pnpm dev` (web `http://localhost:4200`, API `http://127.0.0.1:3000`) or build/run via the package scripts.
- SQLite file configured via `DATABASE_PATH` (default `analysis.db`); `:memory:` used in tests.
- Do not commit `.env`, SQLite databases, logs, build output or Angular caches.

### Required environment variables

| Variable | Purpose | Required |
| --- | --- | --- |
| `GITHUB_TOKEN` (or `GH_TOKEN`) | Server-side credential for GitHub API ingestion | **Yes** for real analyses of non-trivial repos (without it, unauthenticated ~60 req/h limit applies) |
| `HOST` | API listen host | No (default `127.0.0.1`) |
| `PORT` | API port | No (default `3000`) |
| `DATABASE_PATH` | SQLite path | No (default `analysis.db`) |
| AI provider env vars | Optional AI interpretation | No (AI optional) |

### GitHub API/token requirements

- Public GitHub API access with a server-side token (`GITHUB_TOKEN` or `GH_TOKEN`). The token is resolved as `GITHUB_TOKEN ?? GH_TOKEN`, passed to the GitHub client only, never printed/persisted/returned.
- No user-facing authentication; repository access is limited to public repositories.

## Reproducibility

- Analysis is anchored to an immutable commit SHA before ingestion.
- The Phase 22 ground-truth dataset is frozen with exact SHAs and a deterministic runner (`apps/api/src/validate-ground-truth.ts`) reproducing the same snapshots/results.
- Deterministic analyzer/scoring: same commit + same rules → same report.
- All phase documentation, ADRs and this document are versioned in the repository.

## Release decision

**READY**

The MVP is released as **v1.0.0** with the documented limitations above. It is a controlled MVP release, not an unqualified production-readiness claim.

## Final recommendation

Freeze the MVP at v1.0.0. Future work should address the documented limitations (bounded ingestion for very large repos, absence-based evidence semantics, browser E2E/axe automation, real-provider AI evaluation, production-scale operations) — none of which block this release. No new product scope should be added without a dedicated post-MVP phase.
