# ADR-014 — Domain model and report contracts

- **Status:** Accepted for Phase 2
- **Date:** 2026-08-26

## Context

The Foundation only contained a health response contract. Future ingestion, analysis, persistence, API, and frontend work need a shared vocabulary, but exposing framework or storage models would couple the product to implementation details. Evidence also needs to remain verifiable against the exact repository revision, and incomplete observations must not be interpreted as negative results.

## Decision

Create `packages/domain` as a plain TypeScript package containing immutable records, controlled value sets, and explicit factories for `RepositorySnapshot`, `Fact`, `Metric`, `Evidence`, `Finding`, `Recommendation`, `DimensionScore`, and `AnalysisResult`.

Keep `packages/contracts` boundary-oriented. It contains serializable API shapes and does not import domain entities. Future API adapters will map domain records to those DTOs explicitly.

Make evidence first-class and snapshot-scoped. Findings require evidence references; findings and recommendations must resolve their reciprocal relationships in an `AnalysisResult`. Represent `unknown`, `not_detected`, and `insufficient_data` explicitly, with nullable values and scores where data is inadequate. Preserve `analyzerVersion` and `ruleSetVersion` independently for reproducibility.

Do not add `AnalysisJob`, persistence, analyzer logic, GitHub adapters, or AI implementation until there is a real consumer in a later phase.

## Consequences

- Core semantics can be tested without infrastructure or external services.
- Invalid paths, ranges, controlled values, cross-snapshot references, orphan evidence, and unresolved relationships are rejected at creation boundaries.
- API contracts can evolve independently from domain internals.
- Entity IDs remain simple opaque strings, while snapshot identity is deterministic from the analyzed revision.
- Future adapters must perform explicit mapping and preserve the invariants enforced here.
- The model is intentionally small; job lifecycle and execution semantics remain a later decision.

## Alternatives considered

- **Expose domain entities directly from the API:** rejected because transport serialization would become part of the domain contract.
- **Use one generic JSON schema or validation framework:** rejected because it would add abstraction without a current boundary consumer.
- **Represent findings as free text with embedded evidence:** rejected because traceability and relationship validation would be lost.
- **Model every planned concept now, including `AnalysisJob`:** rejected because empty abstractions would increase coupling before their lifecycle is implemented.
