# Arquitectura

## Estado tras Phase 3

La Foundation, el modelo de dominio y el package de ingestión GitHub están implementados. El analyzer, la persistencia, los jobs y los endpoints de report siguen planificados.

### Implementado

```text
apps/web/              # Angular 22 standalone application
    |
    | HTTP GET /health
    v
apps/api/              # Fastify 5 API
    |
    +--> packages/contracts/  # DTOs de frontera
    +--> packages/domain/     # significado e invariantes

packages/github/              # REST + snapshotting acotado, sin handlers
```

- `apps/web`: pantalla Foundation, routing preparado, environment configuration y cliente mínimo de health.
- `apps/api`: composición Fastify, `GET /health`, CORS local, headers básicos, logging integrado y error handler público.
- `packages/contracts`: contratos serializables de API (`HealthResponse` y el shape futuro de `AnalysisResultResponse`). No importa entidades del dominio.
- `packages/domain`: tipos, value sets y factories validadas para snapshots, facts, metrics, evidence, findings, recommendations, dimension scores y resultados.
- `packages/github`: validación de referencias públicas, cliente REST nativo con host allowlist, selección acotada, decodificación UTF-8, errores clasificados y `IngestionResult` en memoria. No genera findings.
- Root: pnpm workspaces, TypeScript strict, ESLint, Prettier, tests y GitHub Actions.

### Planificado

```text
apps/api
    |
    +--> application/report mapping
    +--> analyzer rules
    +--> SQLite adapter
    +--> ingestion HTTP endpoint
```

Los módulos `analyzer` y `report` se crearán cuando cada uno tenga una responsabilidad y un consumidor real. `packages/github` ya implementa el adapter y la ingestión; Fastify todavía no lo compone en un endpoint.

## Arquitectura objetivo refinada

El producto evolucionará hacia un monolito modular con dos aplicaciones runtime:

```text
Angular web
    | HTTP API contracts
    v
Fastify API
    | application orchestration
    v
Domain model
    | ports and adapters
    +--> GitHub REST snapshot
    +--> deterministic analyzer
    +--> SQLite persistence
```

El runner de `AnalysisJob` permanecerá inicialmente dentro de la API. No se crea `apps/worker` hasta que duración, concurrencia o disponibilidad lo justifiquen.

## Dependency direction

```text
web
  |
  v
contracts <---- API DTO mapping ---- apps/api
                                      |
                                      v
                                    domain
                                      |
                                      v
                              infrastructure adapters
```

Reglas vigentes:

- `packages/domain` no depende de Angular, HTTP, Fastify, GitHub, SQLite, filesystem, browser APIs ni IA.
- `packages/contracts` no depende de `packages/domain`; representa la frontera serializable.
- `apps/web` puede depender de `packages/contracts`, pero no de `domain`, `github`, `analyzer`, `report` o SQLite.
- `apps/api` compone transporte, contratos, aplicación y adapters; no expone entidades internas directamente.
- Los adapters dependerán de abstracciones del dominio, no al revés.

Las fronteras de `domain` y `github` se verifican mediante dependencias declaradas, compilación aislada, imports prohibidos y `pnpm check:architecture`. GitHub puede depender del dominio para crear snapshots; el dominio no puede conocer GitHub.

## Current repository structure

```text
apps/
  web/                 # Angular Foundation
  api/                 # Fastify Foundation
packages/
  contracts/           # contratos externos serializables
  domain/              # modelo e invariantes de negocio
  github/              # adapter REST e ingestión acotada

docs/
```

## Domain and report model

```text
RepositorySnapshot
        |
       Facts
        |
      Metrics
        |
     Evidence
        |
     Findings
        |
 Recommendations
        |
  AnalysisResult
```

`RepositorySnapshot` fija owner, repository, ref y commit SHA. Facts son observaciones directas; metrics son medidas derivadas; evidence es soporte minimizado; findings son problemas interpretados; recommendations son acciones vinculadas. `AnalysisResult` valida la integridad de las referencias y conserva las versiones del analyzer y del ruleset.

El dominio usa factories explícitas, value sets cerrados y objetos/arrays de solo lectura en runtime. `unknown`, `not_detected` e `insufficient_data` no se convierten en `false` ni en cero. Los dimension scores son nullable y no existe score global en este vertical slice.

## Frontend Foundation

Angular usa standalone components, routing preparado y environment file replacement. La aplicación tiene una única pantalla de Foundation y no contiene dashboard, report, forms de análisis ni state manager global.

## Backend Foundation

Fastify se compone mediante `buildApp`, separado del proceso de escucha, lo que permite tests con `fastify.inject()`. La API expone únicamente `GET /health`.

## Contracts

`packages/contracts` contiene `HealthResponse` y tipos serializables del futuro report. Estos tipos no sustituyen la validación de `packages/domain`: el mapping de API deberá convertir explícitamente entidades válidas a DTOs cuando existan endpoints de report.

## Future flow

`packages/github` implementa la ingesta REST acotada, pero no existe todavía un endpoint HTTP ni un mapping de API. Las reglas deterministas, SQLite, `AnalysisJob`, el report HTTP y la IA pertenecen a fases posteriores.
