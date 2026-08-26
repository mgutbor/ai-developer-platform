# ADR-016 — Phase 5 analysis pipeline and SQLite adapter

- **Status:** Accepted for MVP
- **Date:** 2026-08-26

## Context

Phases 2–4 established pure domain, ingestion, and deterministic analyzer packages, but there was no executable path from an HTTP request to a persisted report. The MVP needs a small vertical slice while retaining the option to extract a worker or change storage later.

## Decision

Compose the pipeline in `apps/api` through an application service and an in-process runner. The runner persists `AnalysisJob` state, calls GitHub ingestion, passes the bounded result to the analyzer, applies deterministic dimension scoring, persists the validated report, and exposes read-only report endpoints.

Use SQLite through `packages/persistence`, encapsulated behind `AnalysisJobRepository` and `AnalysisResultRepository`. Use Node 24's `node:sqlite` API rather than adding an ORM or a database client dependency. Store report payloads only after domain validation; never store repository blobs.

Use a normalized repository/ref/version key for idempotent creation. Keep the global score absent, preserve nullable dimensions, and map domain objects to API contracts explicitly.

## Consequences

- The first complete product flow is executable and testable without distributed infrastructure.
- Jobs survive process restarts when a file-backed SQLite path is configured.
- The in-process runner and local SQLite database are not horizontally scalable.
- Node 24 and its experimental SQLite API are runtime requirements for this adapter.
- Timeout, cleanup, rate limiting, and external worker extraction remain explicit future hardening decisions.

## Alternatives considered

- **Synchronous request processing:** rejected because it does not provide a stable lifecycle for bounded but potentially slow ingestion.
- **External queue and worker:** deferred until measured duration, concurrency, or availability requires it.
- **ORM or SQLite client dependency:** rejected for the small MVP schema and unnecessary runtime surface.
- **Global aggregate score:** deferred because dimension comparability and calibration are not yet established.
