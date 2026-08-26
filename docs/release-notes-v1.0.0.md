# AI Developer Platform v1.0.0

## What it is

AI Developer Platform analyzes a bounded snapshot of a public GitHub repository and produces an evidence-backed Developer Health Report. The deterministic report is the authoritative product output. An optional AI layer can explain and prioritize existing report material.

## What v1.0.0 does

1. Accepts a public GitHub repository URL and optional ref.
2. Resolves the ref to an immutable commit SHA.
3. Retrieves bounded repository metadata, tree entries and textual files through GitHub REST.
4. Runs deterministic TypeScript/JavaScript analysis.
5. Produces facts, metrics, evidence, findings and recommendations.
6. Calculates nullable dimensional scores.
7. Persists jobs and reports in SQLite.
8. Exposes the report through Fastify API endpoints and an Angular UI.
9. Optionally generates a separately labeled AI interpretation.

## Quick start

Requirements:

- Node.js 24;
- pnpm 10.34.5.

```bash
pnpm install --frozen-lockfile
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

## Interpreting results

- **Finding:** a bounded, deterministic observation that meets a documented rule condition.
- **Evidence:** a snapshot-scoped reference to the source material or metric supporting a finding. Secrets are not shown as complete excerpts.
- **Recommendation:** an action linked to a finding; it is not itself an observed fact.
- **Dimensional score:** a deterministic signal for one supported dimension. It is not a universal quality rating and there is no global MVP score.
- **unknown:** the available snapshot does not support a reliable conclusion.
- **insufficient_data:** too little relevant data exists to calculate a meaningful result.
- **completed_with_limitations:** the analysis completed, but ingestion or analysis constraints reduced what could be observed.

## AI-assisted interpretation

AI is optional and secondary. It receives a bounded context derived from the deterministic report, not direct GitHub access or unrestricted repository content. It may summarize and prioritize existing findings, but it cannot create findings, evidence, paths, ranges, recommendations or scores. If the provider is unavailable or fails, the deterministic report remains available.

The current OpenAI adapter is configured server-side with provider settings and credentials. Real-provider quality, cost and latency are not part of the validated CI path.

## Explicit exclusions

v1.0.0 does not include:

- private repositories or authentication;
- GitHub App integration;
- full SAST or complete AST semantic analysis;
- complete runtime module resolution;
- repository code execution, builds, tests or package installation;
- vulnerability database scanning;
- global or AI-generated scores;
- automatic remediation;
- workers, queues, Redis, PostgreSQL, microservices or high availability;
- RAG, embeddings, agents, chat or streaming;
- billing, analytics or realtime features.

## Release limitations

This is a controlled MVP release. Browser E2E, automated axe auditing, real-provider AI evaluation, production traffic/load behavior, distributed rate limiting, backup/recovery operations and deployment hardening remain outside the validated release surface.

See [`docs/release-readiness.md`](release-readiness.md), [`docs/ai.md`](ai.md), [`docs/security.md`](security.md) and [`docs/roadmap.md`](roadmap.md) for details.
