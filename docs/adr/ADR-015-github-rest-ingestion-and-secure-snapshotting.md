# ADR-015 — GitHub REST ingestion and secure snapshotting

- **Status:** Accepted for Phase 3
- **Date:** 2026-08-26

## Context

The product needs a reproducible source snapshot before analysis. The first slice must support public GitHub repositories without cloning, archive extraction, repository execution, or unbounded downloads. Repository URLs and repository contents are untrusted input, and the adapter must not become a generic server-side request proxy.

## Decision

Implement `@ai-developer-platform/github` as a framework-independent GitHub REST adapter and bounded ingestion service.

- Accept only public HTTPS `github.com` repository references.
- Resolve the requested ref through GitHub REST and anchor the snapshot to the returned full commit SHA.
- Retrieve metadata, the recursive tree, and selected blobs only through known `api.github.com` endpoints.
- Disable redirects, apply request/body/ingestion limits, classify rate limits and failures, and avoid response-body logging.
- Select only bounded TypeScript/JavaScript/JSON source and relevant metadata files. Exclude dependency/generated/binary/credential paths.
- Validate repository-relative paths, reject symlinks and submodules, decode only valid bounded base64 UTF-8 blobs, and never execute repository content.
- Return an in-memory `IngestionResult`; do not expose an HTTP endpoint or add persistence in this phase.

The implementation uses native `fetch` with an injectable transport for deterministic tests. No GitHub SDK, clone library, archive library, queue, worker, or cache is introduced.

## Consequences

- Snapshot identity is reproducible for a given owner, repository, and commit SHA.
- Large, truncated, binary, unavailable, or unsupported content produces explicit limitations instead of false completeness.
- Fastify remains responsible for future HTTP composition, while the domain remains unaware of GitHub.
- Initial limits are intentionally conservative and require measurement before production recalibration.
- A future public endpoint must map the ingestion result to an explicit API contract and apply payload/rate limits at the HTTP boundary.

## Alternatives considered

- **GitHub GraphQL:** deferred because the Phase 3 operations are already expressible through a small REST client.
- **`git clone`:** rejected for the first slice because it expands filesystem, hooks, submodules, LFS, and volume risks.
- **GitHub archives:** rejected because archive extraction adds zip/archive bomb and path handling complexity.
- **Octokit or another SDK:** rejected because native `fetch` is sufficient for the small operation surface and keeps transport behavior explicit.
- **Fastify endpoint in this phase:** deferred because the adapter and security behavior can be tested without prematurely defining ingestion/job API semantics.
