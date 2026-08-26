# Deterministic analyzer

## Responsibility

`packages/analyzer` is a pure TypeScript package that consumes a bounded snapshot-shaped input and produces the domain `AnalysisResult`. It has no HTTP, GitHub, Fastify, Angular, SQLite, filesystem, network, environment, process execution, or AI dependency.

The analyzer treats repository files as untrusted data. It never imports, evaluates, installs, executes, or builds repository content.

## Input and output

The public API is:

```ts
analyze(input, options?): AnalysisResult
```

The input contains a validated `RepositorySnapshot`, bounded textual files, and optional ingestion limitations. The analyzer accepts the structural shape of Phase 3 `IngestionResult` without importing the GitHub adapter, preserving the boundary:

```text
GitHub adapter
      |
      v
bounded ingestion data
      |
      v
packages/analyzer
      |
      v
AnalysisResult
```

The result contains facts, metrics, evidence-backed findings, linked recommendations, versions, coverage, confidence, limitations, and no dimension scores. The global score is intentionally deferred.

## Pipeline

```text
input validation
  -> stable file classification
  -> manifest/config detection
  -> language/framework signals
  -> test, documentation, tooling and CI signals
  -> bounded import extraction
  -> facts
  -> metrics
  -> deterministic rules
  -> evidence, findings and recommendations
  -> AnalysisResult validation
```

The implementation uses JSON parsing for JSON manifests/configuration and bounded regular expressions for imports and textual signals. It does not use an AST or the TypeScript compiler program in this phase.

## Classification and scope

TypeScript and JavaScript are Tier 1: `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs` and `.cjs` are classified as source or tests according to their path. `package.json`, lockfiles, configuration, documentation, CI workflows, generated-looking paths and unknown files have separate classifications.

Angular, React and Node.js are detected only as verifiable ecosystem signals. The analyzer does not make framework-quality claims. Other languages are outside the deep-analysis scope and remain unknown or limited.

## Facts and metrics

Facts are direct observations such as `package_json_present`, `test_tooling`, `framework_detected`, `ci_capabilities`, `typescript_strict`, and file counts. Metrics are derived values such as:

- total, source, test, documentation, configuration, TypeScript and JavaScript file counts;
- source bytes, average source size and maximum source size;
- import count and TODO/FIXME count;
- `any`, `console` and `@ts-ignore` signal counts;
- total, direct, dev, peer and optional dependency counts;
- test-to-source ratio.

Missing manifests produce `insufficient_data`; absent detectable capabilities use `not_detected`. Unknown and insufficient data are never converted to zero or a strong negative claim.

The test-to-source ratio is `test file count / non-test source file count`. It is `insufficient_data` when no non-test source files are available.

## Rules currently implemented

The initial rule set is intentionally small and conservative:

- `AN-DOC-001`: README not detected.
- `AN-TEST-001`: test files not detected.
- `AN-TEST-002`: test tooling not detected.
- `AN-TOOL-001`: lint tooling not detected.
- `AN-DEP-001`: package manifest without a supported lockfile.
- `AN-CQ-002` / `AN-CQ-003`: TypeScript strictness unverified or explicitly disabled.
- `AN-MAINT-001`: source file over the configurable line threshold.
- `AN-CQ-004`: TODO/FIXME count over the configurable threshold.
- `AN-CQ-005`: TypeScript ignore directives detected.
- `AN-ARCH-002`: relative import not matched by bounded static resolution.
- `AN-ARCH-001`: source path deeper than six segments.
- `AN-SEC-002` / `AN-SEC-003`: potentially sensitive filename or credential-like content.

Every finding has a deterministic rule ID/version, conservative severity, a source reference, evidence, and one reciprocal recommendation. Absence of accessibility or security tooling is exposed as a fact; it is not automatically converted into a vulnerability finding.

## Thresholds and limits

Defaults are centralized in `DEFAULT_ANALYZER_OPTIONS`:

- source-size heuristic: 400 lines;
- TODO/FIXME heuristic: 10 markers;
- imported-reference limit: 40 references.

These are MVP heuristics, not universal standards. They are configurable for tests and future calibration. Import resolution only checks bounded snapshot paths and common TypeScript/JavaScript extensions; it does not emulate every runtime or bundler resolver.

## Evidence and security

Evidence is created through domain factories and is scoped to the snapshot. It points to a normalized repository-relative path when a source location exists, otherwise to metadata, and stores only a stable hash. Full files and detected secrets are never persisted in the result.

Input files with another snapshot ID, unsafe paths, invalid sizes or missing content metadata are excluded and recorded through `invalid_input_files_excluded`. Malformed JSON is isolated to the affected manifest/config and produces a limitation rather than aborting the entire analysis.

## Determinism

For the same snapshot, input files, `analyzerVersion`, `ruleSetVersion` and options, output ordering, IDs, hashes, timestamps and values are stable. The result timestamp is inherited from `RepositorySnapshot`; the analyzer does not read the current clock, random values, locale, network or local filesystem.

## Fixtures and tests

The fixtures in `src/fixtures.ts` are small immutable in-memory data sets covering clean TypeScript, poor TypeScript, JavaScript/React, Angular signals, partial/malformed input and security signals. They are data only and are never executed or sent over the network.

Analyzer tests cover classification, manifests, lockfiles, frameworks, tooling, CI, metrics, findings, recommendations, evidence relationships, malformed input, unsafe input paths, secret redaction, import extraction, limits, determinism and a bounded performance sanity check.

## Deferred work

This phase does not implement AST analysis, complete module resolution, full circular-dependency analysis, vulnerability scanning, SAST, scoring, SQLite, job orchestration, API endpoints, frontend report screens or AI assessment. Those features require separate validation and contracts in later phases.
