# ADR-011 — Alcance incremental del analyzer

- **Status:** Accepted for MVP
- **Date:** 2026-08-26

## Context

Analizar muchos lenguajes con profundidad exige parsers, fixtures, reglas y conocimiento específico. El proyecto es inicialmente frontend-oriented y necesita validar primero la utilidad del report, no prometer cobertura universal.

## Decision

Adoptar tres tiers:

- **Tier 1:** TypeScript y JavaScript con análisis profundo de estructura, imports, configuración, tests, linting, formatting, CI/CD y documentación.
- **Tier 2:** detección superficial de Angular, React y Node.js mediante manifests, configuración y convenciones; no se harán afirmaciones profundas específicas del framework sin evidencia suficiente.
- **Tier 3:** otros lenguajes detectados como metadata y excluidos del scoring profundo; se informará de la limitación.

El vertical slice priorizará Architecture, Testing, Documentation, Dependencies y Code Quality. Maintainability se limitará a señales estáticas simples. Accessibility y Security se expondrán inicialmente como tooling/configuration coverage, no como auditorías completas.

## Consequences

- Menor superficie de analyzer y resultados más honestos.
- Mayor calidad demostrable en el stack principal.
- Repositories fuera de Tier 1 seguirán siendo parcialmente útiles, pero con `insufficient_data`.
- Añadir un lenguaje requiere fixtures, reglas, evidence model y criterios de aceptación propios.

## Alternatives considered

- **Soportar todos los lenguajes superficialmente:** rechazado porque produciría reportes amplios pero poco fiables.
- **Empezar con Angular y React por separado:** pospuesto; TypeScript/JavaScript ofrece una base común y los frameworks se detectan como contexto.
- **Ejecutar linters de cada repository:** rechazado por seguridad y reproducibilidad.
