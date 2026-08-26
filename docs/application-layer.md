# Phase 5 application layer and persistence

Phase 5 composes the existing pure ingestion and analyzer packages into a small, persistent vertical slice.

```text
POST /analyses
      |
      v
AnalysisJob (queued)
      |
      v
in-process runner (concurrency 1)
      |
      +--> GitHub REST ingestion
      +--> deterministic analyzer
      +--> deterministic dimension scoring
      +--> SQLite persistence
      |
      v
GET /analyses/:id/report
```

## Responsibilities

- `packages/domain`: `AnalysisJob` lifecycle and report invariants.
- `packages/github`: public GitHub validation, bounded ingestion, and snapshot creation.
- `packages/analyzer`: pure facts, metrics, evidence, findings, and recommendations.
- `packages/scoring`: pure dimension scoring; it never calculates a global score.
- `packages/persistence`: SQLite adapter using Node 24's `node:sqlite`; no SQLite type escapes this package.
- `apps/api/src/application.ts`: orchestration, idempotency, timeout, and error classification.
- `apps/api/src/mapper.ts`: explicit domain-to-contract serialization.
- `apps/api/src/app.ts`: thin Fastify transport handlers.

## Job lifecycle

The runner accepts one job at a time by default. A job is persisted before enqueueing and after each lifecycle transition. Valid transitions are:

```text
queued  -> running -> completed
                  -> completed_with_limitations
                  -> failed
                  -> cancelled
queued  -> failed
queued  -> cancelled
```

The default analysis timeout is 75 seconds. A timed-out or failed pipeline becomes `failed`; the public response contains a stable error code and no stack trace or provider body.

## Idempotency

`POST /analyses` normalizes the repository URL and uses:

```text
canonicalRepositoryUrl | requestedRef | analyzerVersion | ruleSetVersion
```

as the persisted idempotency key. Repeating the same request returns the existing job with HTTP `200`; a new request returns `202`. The key is intentionally based on the requested ref because the commit is resolved by the runner. The resulting snapshot remains anchored to the resolved commit SHA.

## Persistence

SQLite stores job metadata and a serialized, validated `AnalysisResult` payload. The result payload contains facts, metrics, findings, minimized evidence, recommendations, dimension scores, limitations, snapshot metadata, and versions. Repository file contents are never stored. The adapter supports `:memory:` for tests and a file path for the API server.

`deleteOlderThan(cutoffIso)` removes expired results and jobs. Cleanup is an explicit idempotent operation; scheduling is deferred.

## Scoring

The scorer applies documented severity penalties to a base score of 10 per dimension and clamps to `[0, 10]`. A dimension is nullable when the result has no observed deterministic signal for it. There is no global score. Scoring does not mutate analyzer findings or recommendations.

## API

- `GET /health`
- `POST /analyses` — returns `202 { id, status }`, or `200` for an idempotent duplicate.
- `GET /analyses/:id` — job metadata and lifecycle.
- `GET /analyses/:id/report` — complete mapped report.
- `GET /analyses/:id/findings`
- `GET /analyses/:id/recommendations`
- `GET /analyses/:id/facts`

The report endpoints return `404 RESULT_NOT_AVAILABLE` until a job has a result.

## Deliberate limitations

- The in-process runner is not horizontally scalable.
- SQLite is local and uses Node's experimental `node:sqlite` API; Node 24 is required by the project engine range.
- There is no API rate limiting yet; this remains Phase 7 hardening.
- The server's default SQLite file is `analysis.db`, excluded by `.gitignore`.
- No global score, AI assessment, worker, queue, PostgreSQL, or frontend report UI is implemented in this phase.
