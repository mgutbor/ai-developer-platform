# GitHub ingestion package

`@ai-developer-platform/github` provides bounded, secure GitHub REST access for public repository snapshots.

The package contains:

- canonical public GitHub URL/ref validation;
- an injectable `GitHubClient` port;
- a native `fetch` REST adapter;
- bounded tree/blob ingestion;
- safe path and text decoding policies;
- classified ingestion errors.

It depends only on the Phase 2 domain package. It does not contain analyzer rules, findings, scoring, SQLite, Fastify handlers, Angular code, AI integration, repository execution, cloning, archive extraction, or local filesystem access.

See [`docs/github-ingestion.md`](../../docs/github-ingestion.md) for the limits and security policy.
