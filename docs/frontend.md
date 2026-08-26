# Frontend

## Phase 6 scope

The Angular application now exposes the first user-facing vertical slice:

```text
repository URL → POST /analyses → polling → report
```

The frontend does not contain analyzer, scoring, persistence, or GitHub logic. It consumes the DTOs in `packages/contracts` through `AnalysisService`.

## Structure

- `core/api/analysis.service.ts`: typed HTTP calls for analysis creation, status, and report retrieval.
- `features/analysis/pages/home.page.*`: repository URL form and client-side validation.
- `features/analysis/pages/progress.page.*`: status display and bounded polling.
- `features/analysis/pages/report.page.*`: findings, evidence, recommendations, dimension scores, and limitations.

## Routing

- `/`: repository input.
- `/analyses/:id`: queued/running/terminal job status.
- `/analyses/:id/report`: persisted report loaded from the API, so browser refresh is supported.

Polling runs every four seconds with `exhaustMap`, stops at terminal states, and is cleaned up with `takeUntilDestroyed`. WebSockets and global state are intentionally deferred.

## Accessibility and safety

Pages use semantic headings, labels, associated errors, status announcements, keyboard-focusable controls, visible focus styles, responsive layouts, and text interpolation. Repository paths, filenames, descriptions, and evidence hashes are treated as untrusted text; the UI does not use `innerHTML`.

The current tests validate component behavior and HTTP interactions. This is an accessibility baseline, not a complete WCAG 2.2 AA audit; automated axe testing and browser-level E2E remain candidates for a later hardening phase.
