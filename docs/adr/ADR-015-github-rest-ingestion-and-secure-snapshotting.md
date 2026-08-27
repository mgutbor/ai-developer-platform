# ADR-015 — GitHub REST ingestion and secure snapshotting

- **Status:** Accepted for Phase 3; amended in Phase 14
- **Date:** 2026-08-26

## Context

The product needs a reproducible source snapshot before analysis. The first slice must support public GitHub repositories without cloning, archive extraction, repository execution, or unbounded downloads. Repository URLs and repository contents are untrusted input, and the adapter must not become a generic server-side request proxy.

## Decision

Implement `@ai-developer-platform/github` as a framework-independent GitHub REST adapter and bounded ingestion service.

- Accept only public HTTPS `github.com` repository references.
- Resolve the requested ref through GitHub REST and anchor the snapshot to the returned full commit SHA.
- Retrieve metadata, the recursive tree, and selected blobs only through known `api.github.com` endpoints.
- Apply request/body/ingestion limits, classify rate limits and failures, and avoid response-body logging.

## Phase 14 amendment (2026-08-27)

Real-world validation (Phase 13) showed that disabling redirects entirely prevented analyzing valid public repositories that GitHub serves under canonical URLs (`facebook/react` redirects to `/repositories/{id}` and is canonicalized to `react/react`).

**Decision:** follow redirects only when every hop is HTTPS, targets a host in an explicit allowlist (`api.github.com` by default), has no port, carries a valid `location` header, and stays within `maxRedirects` (default 3). `fetch` runs with `redirect: 'manual'` so the client decides each hop. After a safe canonical redirect, the repository identity returned by GitHub is authoritative and used for downstream requests; without a redirect, the response must match the requested identity exactly. Redirects to external hosts, HTTP, or ports are rejected as `security_rejected`.

**Decision:** file selection is now prioritized deterministically within the same ingestion limits — root repository metadata (package.json, lockfiles, README, tsconfig, angular.json, vite/next config) first, then CI/tooling config, then source files, then tests, then documentation/examples/other. This prevents `.github/`, `.devcontainer/` or `examples/` from consuming the file budget before `package.json`, `README` and tests are considered.

**Consequences:** renamed public repositories are analyzable under their canonical identity; the SSRF surface remains unchanged (host allowlist, HTTPS, hop limit); bounded snapshots are more informative without increasing limits.
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
