# SQLite persistence

Phase 5 uses a small adapter in `packages/persistence` around Node 24's built-in `node:sqlite` `DatabaseSync` API.

## Decision

The adapter is preferred over an ORM for this MVP because the schema is small, access patterns are known, and avoiding a runtime dependency keeps the deployment surface narrow. The API is synchronous internally but is isolated behind repository interfaces, so a future implementation can migrate to PostgreSQL without changing domain semantics.

## Stored data

- `analysis_jobs`: normalized request, lifecycle timestamps, resolved commit, versions, error code, and result reference.
- `analysis_results`: snapshot metadata, versions, timestamps, and the validated serialized report.

The result payload includes facts, metrics, minimized evidence, findings, recommendations, dimension scores, and limitations. It does not include repository blobs or complete source files.

## Retention

`deleteOlderThan(cutoffIso)` is deterministic and safe to call repeatedly. It is intentionally exposed as an operation rather than scheduled by an external worker.

## Runtime

`node:sqlite` is experimental in the current Node 24 type/runtime surface. The project engine range remains Node 24, and the adapter is the only package that imports it. Tests use `:memory:` and a temporary file-backed database to verify restart behavior.
