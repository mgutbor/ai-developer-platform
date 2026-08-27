# AI Developer Platform v1.0.0

## What it is

AI Developer Platform analyzes a bounded snapshot of a public GitHub repository and produces an evidence-backed Developer Health Report. The deterministic report is the authoritative product output. An optional AI layer can explain and prioritize existing report material, but it never creates or modifies findings, evidence or scores.

## What v1.0.0 does

1. Accepts a public GitHub repository URL and optional ref.
2. Resolves the ref to an immutable commit SHA.
3. Retrieves bounded repository metadata, tree entries and textual files through GitHub REST (segmented tree traversal with semantics-preserving early termination).
4. Runs deterministic TypeScript/JavaScript analysis (18 rules across architecture, testing, documentation, dependencies, code quality, security, maintainability and tooling).
5. Produces facts, metrics, evidence, findings and recommendations.
6. Calculates nullable dimensional scores (no global score).
7. Persists jobs and reports in SQLite.
8. Exposes the report through Fastify API endpoints and an Angular UI.
9. Optionally generates a separately labeled AI interpretation.

## Quick start

Requirements:

- Node.js 24;
- pnpm 10.34.5.

```bash
pnpm install --frozen-lockfile
export GITHUB_TOKEN="<server-side-token>"   # or GH_TOKEN; never commit a real token
pnpm dev
```

Open `http://localhost:4200`, enter a public GitHub repository URL and follow the analysis progress to the report.

Quality validation:

```bash
pnpm check:architecture
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --audit-level=high
```

## API flow

```text
POST /analyses
GET  /analyses/:id
GET  /analyses/:id/report
GET  /analyses/:id/findings
GET  /analyses/:id/recommendations
GET  /analyses/:id/facts
POST /analyses/:id/ai
GET  /analyses/:id/ai
```

## Added

- Public GitHub repository URL validation and commit-anchored bounded ingestion.
- Segmented Git-tree acquisition for large repositories with deterministic, semantics-preserving early termination (`microsoft/TypeScript`, `nodejs/node` ingestible within limits).
- Deterministic TypeScript/JavaScript analysis producing facts, metrics, evidence, findings and recommendations.
- Nullable dimensional scoring (architecture, testing, documentation, dependencies, code quality) without a global score.
- In-process `AnalysisJob` lifecycle with SQLite persistence, idempotency and retention cleanup.
- Fastify report API and Angular report experience.
- Clear user-facing states: loading, completed, completed-with-limitations, failed with specific reason, snapshot-limit-exceeded, insufficient coverage, empty findings (Phase 24).
- Optional AI-assisted interpretation with bounded context, structured output, validated references and local rate limiting.
- Security boundaries for SSRF, redirects, path traversal, symlinks/submodules, untrusted repository content and prompt injection.
- Automated quality checks, deterministic fixtures, phase validation documentation, portfolio and release documentation.

## Validated

- **Phase 22 (ground truth):** frozen 8-repository dataset; 25 findings human-classified (7 TP, 0 FP, 2 uncertain, 16 not-evaluable). Conclusion: sample insufficient for defensible precision/recall; decision `KEEP WITH LIMITATIONS`.
- **Phase 23 (E2E product):** real product server validated against public repositories — successful analysis (real commit SHA, findings, evidence, scores, coverage), invalid URL (400), repository not found, ingestion limit (`SNAPSHOT_LIMIT_EXCEEDED`), partial/insufficient coverage, API↔UI consistency, accessibility and security baselines. Decision `PASS WITH LIMITATIONS`. Fixed a real production defect: the server-side GitHub credential is now wired into the GitHub client (with regression tests).
- **Phase 24 (UX/docs/portfolio):** plain-language failure, coverage and limitation messaging; README, architecture and portfolio documentation. Decision `PASS`.
- Full quality-gate suite green: install, architecture check, format, lint, typecheck, tests (92, 0 failures), build, audit (no known vulnerabilities), `git diff --check`.

## Security

- GitHub credentials are **server-side / environment-only** (`GITHUB_TOKEN` or `GH_TOKEN`). The application resolves them from the environment, passes them to the GitHub client, and never returns, persists or logs them.
- No credential value appears in documentation, artifacts, API responses or SQLite.
- README examples use placeholders only.
- Repository contents are treated as data: no repository code is executed and no analyzed-repository dependencies are installed.
- Errors are sanitized for users (no stack traces or internal details).

## Known limitations

- **Bounded ingestion:** `maxFileCount=50`, `maxApiRequests=125`, `maxJsonResponseBytes=4 MiB`, `maxTotalBytes=2 MiB`, `maxFileBytes=256 KiB`. Coverage is `partial`/`insufficient` for most repositories and is surfaced honestly in the UI.
- **SNAPSHOT_LIMIT_EXCEEDED:** very large repositories (`react/react`, `vitejs/vite`) cannot complete a 50-file snapshot within `maxApiRequests=125`; the product reports a controlled failure and never presents an incomplete analysis as complete.
- **Absence-based evidence:** rules may report "not detected" when the bounded snapshot may not contain all relevant files.
- **AN-ARCH-002:** unresolved-import findings reflect bounded static-resolution limits, not proven repository defects.
- **Ground truth:** the validated sample is insufficient for a statistically defensible precision/recall statement.
- **No browser E2E (Playwright) / automated axe** tooling; frontend validated by unit tests and API-contract verification against the real server.
- **AI optional:** not validated with a live provider (no credentials configured); deterministic report is authoritative.
- Only public GitHub repositories are supported.

## Not included

- Private repositories, authentication and GitHub App integration.
- Advanced or unbounded ingestion and additional analyzer rules.
- Full SAST, complete AST analysis, complete module resolution and vulnerability scanning.
- Repository code execution, builds, tests or package installation.
- Global or AI-generated scores and automatic remediation.
- Workers, queues, Redis, PostgreSQL, microservices, realtime, billing, analytics.
- RAG, embeddings, agents, chat, streaming.

## Release status

This is the **v1.0.0 MVP release** — the final MVP phase. The product is released as v1.0.0 with the documented limitations above. Improvements to bounded ingestion, evidence semantics, browser E2E/axe automation, live AI evaluation and production-scale operations are intentionally deferred to post-MVP work.

See [`docs/release-readiness.md`](release-readiness.md), [`docs/portfolio.md`](portfolio.md), [`docs/security.md`](security.md), [`docs/architecture.md`](architecture.md) and [`docs/roadmap.md`](roadmap.md).
