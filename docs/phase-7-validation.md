# Phase 7 — MVP validation and hardening

## Validation date

2026-08-26. The local runtime was Node `v25.3.0`; the project target and CI remain Node 24. The Node 25 run emits the expected engine and `node:sqlite` experimental warnings.

## Controlled dataset

The analyzer fixtures provide deterministic cases for:

- clean TypeScript with tests, README, lint, formatting, strict TypeScript, lockfile, and CI;
- poor TypeScript with TODO/FIXME, `any`, `@ts-ignore`, missing tests/tooling, and an unresolved relative import;
- JavaScript with superficial React detection;
- Angular-like TypeScript with superficial Angular detection;
- security signals with a secret-like pattern and sensitive paths;
- partial/malformed input with invalid paths, wrong snapshot IDs, and explicit tree limitations.

Expected behavior is asserted by analyzer and scoring tests. Sensitive evidence stores a stable hash rather than source content. Partial input produces explicit limitations and does not become a negative quality assertion by itself.

## Findings and false-positive review

Current findings are deliberately conservative and evidence-backed:

- missing README, tests, test tooling, or lint tooling;
- package manifest without a supported lockfile;
- unverified or disabled TypeScript strictness;
- oversized source file, excessive TODO/FIXME markers, or `@ts-ignore`;
- statically unresolved relative import;
- unusually deep source path;
- potentially sensitive filename or credential-like content.

The fixtures cover positive and negative cases for the main rules. Tooling absence is low severity; security signals are high severity only when a concrete sensitive path/content signal exists. The analyzer does not claim vulnerability status, test sufficiency, accessibility compliance, or repository quality from a single heuristic.

## Live repositories

A controlled local API run used the real GitHub REST adapter, without cloning, installing, executing, or building repository content:

| Repository | Result | Duration | Findings | Limitations | Coverage |
| --- | --- | ---: | ---: | ---: | --- |
| `octocat/Hello-World` | completed_with_limitations | 2s | 3 | 1 | insufficient |
| `githubtraining/hellogitworld` | completed_with_limitations | 2s | 3 | 1 | insufficient |

The reports were retrieved through `GET /analyses/:id/report`. These small repositories demonstrate that the pipeline handles real public input and communicates insufficient analysis data instead of fabricating a score. External availability means live repositories are not CI dependencies.

## Security review

- SSRF: GitHub URL parsing and API host allowlisting remain enforced; redirects are not trusted.
- Paths: traversal, absolute paths, control characters, symlinks, and submodules are rejected or excluded by ingestion.
- Repository content: no package manager, shell, test, build, import, or executable is invoked.
- Secrets: ingestion excludes common sensitive files; analyzer evidence is hash-only for credential-like content; frontend uses text interpolation and no `innerHTML`.
- Resource exhaustion: tree, file, byte, request, file-size, and timeout limits are explicit; runner concurrency is one by default.
- Dependencies: `pnpm audit --audit-level=high` reports no known vulnerabilities.

## Reliability and retention

Automated tests cover GitHub 404/rate-limit/timeout/malformed responses, bounded retries, job failures/timeouts, SQLite round-trip/restart/cleanup, idempotency, and analyzer determinism. The current SQLite cleanup is deterministic and idempotent. A process restart leaves a persisted `running` job as `running`; recovery/requeue is intentionally deferred until a worker or durable scheduler is justified.

## Accessibility and frontend

The frontend has semantic headings and labels, visible keyboard focus, `aria-live` status messages, associated form errors, responsive layouts, safe text rendering, and retry states. Component tests cover valid/invalid submission, navigation, and creation errors. No axe or browser E2E suite is currently configured, so this is an accessibility baseline rather than a WCAG certification.

## Product usefulness and architecture decision

The current report is useful for showing reproducible signals and traceability, but small repositories frequently have insufficient coverage. The UI therefore exposes limitations and nullable scores instead of presenting false precision. The existing Angular + Fastify + modular application + in-process runner + GitHub REST + deterministic analyzer + SQLite architecture remains appropriate for the MVP.

Do not extract a worker, queue, PostgreSQL, cache, or realtime layer without measured evidence such as sustained queue growth, timeout/completion-rate degradation, concurrent write contention, or a deployment requirement for multiple API instances.
