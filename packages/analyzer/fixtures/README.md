# Analyzer fixtures

The deterministic analyzer uses small in-memory fixtures declared in `src/fixtures.ts`.

The fixture set covers:

- clean TypeScript with tests, documentation, tooling, lockfile and CI;
- JavaScript without tests;
- Angular and React framework signals;
- missing lockfile and documentation;
- security and code-quality signals;
- malformed manifests and partial ingestion limitations.

Fixtures are data only. They are never imported, executed, installed or sent to a network service.
