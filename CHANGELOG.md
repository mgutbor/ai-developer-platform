# Changelog

All notable changes to this project are documented here.

## [1.0.0] — 2026-08-27

### Added

- Public GitHub repository URL validation and bounded REST ingestion.
- Segmented Git-tree acquisition for large repositories with semantics-preserving early termination (Phase 21).
- Reproducible repository snapshots anchored to an immutable commit SHA.
- Deterministic TypeScript and JavaScript analysis (18 rules).
- Evidence-backed findings and recommendations.
- Deterministic dimensional scoring without a global score.
- In-process `AnalysisJob` lifecycle with SQLite persistence and retention cleanup.
- Fastify report API and Angular report experience.
- Clear user-facing states: loading, completed, completed-with-limitations, failed with specific reason, snapshot-limit-exceeded, insufficient coverage, empty findings (Phase 24).
- Optional AI-assisted interpretation with bounded context, structured output and validated references.
- Security boundaries for SSRF, path traversal, untrusted repository content and prompt injection.
- Server-side GitHub credential wiring (`GITHUB_TOKEN`/`GH_TOKEN`) for the production API (Phase 23 fix) with regression tests.
- Automated quality checks, deterministic fixtures and validation documentation.

### Validated

- Phase 22 — ground-truth validation: frozen 8-repository dataset, 25 findings human-classified (7 TP, 0 FP, 2 uncertain, 16 not-evaluable); sample insufficient for defensible precision/recall; decision `KEEP WITH LIMITATIONS`.
- Phase 23 — real E2E product validation against public repositories (success, invalid URL, not found, ingestion limit, partial coverage, API↔UI consistency, security baseline); decision `PASS WITH LIMITATIONS`.
- Phase 24 — UX/documentation/portfolio polish; decision `PASS`.
- Full quality-gate suite green (install, architecture, format, lint, typecheck, 92 tests, build, audit).

### Limitations

- Only public GitHub repositories are supported.
- Ingestion is bounded and may complete with explicit limitations; coverage is `partial`/`insufficient` for most repositories.
- Very large repositories (`react/react`, `vitejs/vite`) exceed the request budget and report `SNAPSHOT_LIMIT_EXCEEDED`.
- The analyzer uses conservative static heuristics and does not execute repository code.
- Absence-based rules may report "not detected" when the bounded snapshot may not contain all relevant files.
- Scores are dimensional signals, not an absolute quality rating.
- AI interpretation is optional and not authoritative; real-provider quality is not validated.
- Full WCAG 2.2 AA conformance and browser E2E (Playwright/Lighthouse) are not claimed or automated.
- The runtime remains a single-process MVP using local SQLite.
