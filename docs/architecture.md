# Arquitectura

## Estado tras Phase 2

La Foundation y el modelo de dominio están implementados. La ingesta de repositories, el analyzer, la persistencia y los endpoints de report siguen planificados.

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
```

- `apps/web`: pantalla Foundation, routing preparado, environment configuration y cliente mínimo de health.
- `apps/api`: composición Fastify, `GET /health`, CORS local, headers básicos, logging integrado y error handler público.
- `packages/contracts`: contratos serializables de API (`HealthResponse` y el shape futuro de `AnalysisResultResponse`). No importa entidades del dominio.
- `packages/domain`: tipos, value sets y factories validadas para snapshots, facts, metrics, evidence, findings, recommendations, dimension scores y resultados.
- Root: pnpm workspaces, TypeScript strict, ESLint, Prettier, tests y GitHub Actions.

### Planificado

```text
apps/api
    |
    +--> application/report mapping
    +--> github/ingestion adapters
    +--> analyzer rules
    +--> SQLite adapter
```

Los módulos `github`, `ingestion`, `analyzer` y `report` se crearán cuando cada uno tenga una responsabilidad y un consumidor real. No se crean packages vacíos.

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

En Phase 2 la independencia del dominio se verifica por sus dependencias declaradas, imports exclusivamente locales, compilación aislada y `pnpm check:architecture`. Se añadirá una regla automatizada más fuerte solo cuando existan varios adapters con dependencias reales.

## Current repository structure

```text
apps/
  web/                 # Angular Foundation
  api/                 # Fastify Foundation
packages/
  contracts/           # contratos externos serializables
  domain/              # modelo e invariantes de negocio

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

La ingesta GitHub, las reglas deterministas, SQLite, `AnalysisJob`, los mappings HTTP y la IA pertenecen a fases posteriores. Esta fase solo establece el lenguaje e invariantes que esos componentes consumirán.
