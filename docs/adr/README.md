# Architecture Decision Records

Los ADRs registran decisiones con impacto transversal o difícil de revertir. No se crean para cada elección de librería.

## Decisiones base

- [ADR-001 — Arquitectura de monolito modular](ADR-001-project-architecture.md) — **MODIFY**, por ADR-007
- [ADR-002 — Estrategia de monorepo](ADR-002-monorepo-strategy.md) — **KEEP**
- [ADR-003 — Abstracción de proveedores de IA](ADR-003-ai-provider-abstraction.md) — **MODIFY**, alcance futuro
- [ADR-004 — Análisis determinista antes de IA](ADR-004-deterministic-analysis-before-ai.md) — **KEEP**, reforzado
- [ADR-005 — Salida estructurada de IA](ADR-005-structured-ai-output.md) — **MODIFY**, diferido a Phase 8
- [ADR-006 — Modelo asíncrono de análisis](ADR-006-analysis-job-model.md) — **MODIFY**, por ADR-007

## Decisiones de Fase 0.1

- [ADR-007 — Runtime mínimo del MVP](ADR-007-mvp-runtime-simplification.md)
- [ADR-008 — Angular como frontend del MVP](ADR-008-angular-frontend.md)
- [ADR-009 — Scoring determinista en el MVP](ADR-009-deterministic-mvp-scoring.md)
- [ADR-010 — GitHub REST para snapshots del MVP](ADR-010-github-rest-snapshot.md)
- [ADR-011 — Alcance incremental del analyzer](ADR-011-analysis-scope.md)
- [ADR-012 — SQLite como persistencia del MVP](ADR-012-mvp-persistence.md)
- [ADR-013 — Fastify como framework de API](ADR-013-fastify-api.md)

Cada ADR incluye `Status`, `Context`, `Decision`, `Consequences` y `Alternatives considered`. Una decisión nueva debe enlazar la anterior cuando la modifique y conservar el historial.
