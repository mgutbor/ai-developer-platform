# Changelog

All notable changes to this project are documented here.

## [1.0.0] — 2026-08-26

### Added

- Public GitHub repository URL validation and bounded REST ingestion.
- Reproducible repository snapshots anchored to an immutable commit SHA.
- Deterministic TypeScript and JavaScript analysis.
- Evidence-backed findings and recommendations.
- Deterministic dimensional scoring without a global score.
- In-process `AnalysisJob` lifecycle with SQLite persistence and retention cleanup.
- Fastify report API and Angular report experience.
- Optional AI-assisted interpretation with bounded context, structured output and validated references.
- Security boundaries for SSRF, path traversal, untrusted repository content and prompt injection.
- Automated quality checks, deterministic fixtures and validation documentation.

### Limitations

- Only public GitHub repositories are supported.
- Ingestion is bounded and may complete with explicit limitations.
- The analyzer uses conservative static heuristics and does not execute repository code.
- Scores are dimensional signals, not an absolute quality rating.
- AI interpretation is optional and not authoritative.
- Real-provider AI quality, cost and latency are not validated.
- Full WCAG 2.2 AA conformance and browser E2E are not claimed.
- The runtime remains a single-process MVP using local SQLite.
