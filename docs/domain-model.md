# Domain model

Phase 2 establishes the canonical business vocabulary for repository analysis. The model is implemented in `@ai-developer-platform/domain` and is independent from HTTP, Angular, Fastify, GitHub, SQLite, the filesystem, and AI providers.

## Traceability chain

```text
RepositorySnapshot
        |
       Facts
        |
      Metrics
        |
     Evidence
        |
     Findings
        |
 Recommendations
        |
  AnalysisResult
```

- `RepositorySnapshot` identifies the exact public GitHub revision. `commitSha`, not a mutable branch, is the authoritative source identity.
- `Fact` is a direct observation. It has an explicit status: `observed`, `not_detected`, `unknown`, or `insufficient_data`.
- `Metric` is a derived measurement. It records the source fact IDs, unit, provenance, and rule version.
- `Evidence` is minimized support scoped to one snapshot. It uses a normalized relative path and either an excerpt hash or a redacted excerpt, never a full source file.
- `Finding` is an interpreted problem or risk. It requires at least one evidence reference and controlled severity, category, confidence, source, and rule provenance.
- `Recommendation` is an actionable improvement linked to one or more findings.
- `AnalysisResult` is the validated report aggregate. It checks references, snapshot consistency, reciprocal finding/recommendation links, evidence ownership, unique IDs, versions, and nullable dimension scores.

## Domain versus API contracts

`packages/domain` represents business meaning and validates invariants. `packages/contracts` represents serialized boundary shapes such as `AnalysisResultResponse`; it does not import domain entities. An API adapter will map domain records to boundary DTOs when report endpoints exist.

This keeps changing Fastify, Angular, GitHub, or SQLite from changing the semantics of the domain model.

## IDs and versions

Snapshot IDs are always deterministic from normalized owner, repository name, and the full commit SHA:

```text
snapshot:owner/name@commitSha
```

Other entity IDs are opaque strings supplied by the creation boundary. This avoids a UUID dependency and keeps persistence/debugging simple; a future adapter is responsible for generating collision-safe IDs according to its storage policy. `analyzerVersion` and `ruleSetVersion` are stored separately because implementation changes and rule changes can affect reproducibility independently.

## Uncertainty

`unknown`, `not_detected`, and `insufficient_data` are distinct states. Non-observed facts and metrics carry `null` values. A dimension score may also be `null` only with `insufficient` coverage. Unknown data is never converted to `false`, and insufficient data is never converted to zero.

## Phase 5 lifecycle

`AnalysisJob` now belongs to the domain because it has a real lifecycle consumer. Valid transitions are `queued → running → completed`, `completed_with_limitations`, `failed`, or `cancelled`; queued jobs may also fail or be cancelled before starting. Persistence and HTTP remain adapters around these domain semantics.
