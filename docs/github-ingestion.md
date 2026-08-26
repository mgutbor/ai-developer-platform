# GitHub REST ingestion

Phase 3 implements `@ai-developer-platform/github`, a framework-independent adapter for bounded snapshots of public GitHub repositories.

## Supported input

The accepted input is a canonical public HTTPS URL:

```text
https://github.com/{owner}/{repository}
https://github.com/{owner}/{repository}/tree/{ref}
```

An explicit ref may also be supplied to `parseRepositoryReference` or `ingestRepository`. SSH URLs, Git URLs, HTTP, arbitrary hosts, query strings, fragments, private repositories, and GitHub Enterprise are rejected. A trailing slash and an optional `.git` suffix are normalized.

## Flow

```text
validated repository URL
        |
        v
repository metadata
        |
        v
requested ref -> commit SHA
        |
        v
commit tree
        |
        v
bounded file selection -> bounded blobs -> UTF-8 text
        |
        v
RepositorySnapshot + RepositoryFile[] + limitations
```

The snapshot is created through the Phase 2 domain factory. Its identity is derived from normalized owner, repository name, and the full resolved commit SHA. The requested branch/ref is retained as context and is never used as the immutable identity.

## Transport and security

`GitHubRestClient` uses the platform `fetch` API and only constructs requests against `https://api.github.com`. It sends the GitHub JSON media type and API version, disables redirects, applies request and response-size limits, accepts an optional token without logging it, and classifies failures without exposing response bodies.

The package does not clone repositories, download archives, follow symlinks, fetch submodules, execute repository content, install dependencies, or access the local filesystem. Repository paths remain data and are validated as normalized relative paths.

## Selection policy and initial MVP limits

| Limit | Initial value |
| --- | ---: |
| Selected files | 50 |
| File size | 256 KiB |
| Total file bytes | 2 MiB |
| Tree entries considered | 5,000 |
| API requests per client | 125 |
| Request timeout | 10 seconds |
| Ingestion timeout | 60 seconds |
| JSON response size | 4 MiB |

The values are conservative initial limits, not production calibration. Source files with TypeScript/JavaScript/JSON extensions and selected project metadata are eligible. `node_modules`, `.git`, `dist`, `build`, `coverage`, `.cache`, `vendor`, source maps, generated/minified files, common credential filenames, common private-key extensions, and obvious binary extensions are excluded.

Blob responses must be base64, valid UTF-8, size-consistent, and free of obvious binary data. Git LFS pointer files are reported as unavailable rather than resolved.

## Partial results and errors

A truncated tree, excluded unsafe path, unavailable blob, oversized file, binary file, request limit, or Git LFS pointer is represented in `IngestionResult.limitations`. The result is not converted into an `AnalysisResult` and no findings are generated.

Transport and validation failures use `GitHubIngestionError` categories such as `invalid_repository`, `repository_not_found`, `invalid_ref`, `rate_limited`, `request_timeout`, `invalid_response`, `security_rejected`, and `ingestion_limit_reached`.

## Reproducibility and deferred integration

The same normalized repository and resolved commit produce the same snapshot identity. File retrieval order, selected contents, and limitations are bounded by the tree response and policy; operational timestamps are metadata rather than identity.

Phase 3 intentionally does not expose an HTTP endpoint. Fastify application wiring, persistence, analysis jobs, analyzer rules, evidence generation, scoring, and AI context selection belong to later phases. Caching is also deferred; the commit-anchored snapshot identity is sufficient for a future cache key.
