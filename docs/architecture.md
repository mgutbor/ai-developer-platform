# Arquitectura

## Estado tras Phase 5

La Foundation, el modelo de dominio, la ingestión GitHub, el analyzer, el scorer determinista, la persistencia SQLite y el vertical slice HTTP están implementados. La UI completa del report, el hardening público y la IA siguen planificados.

```text
Angular web
    |
    | API contracts
    v
Fastify API
    |
    +--> application service
    |       |
    |       +--> in-process AnalysisJob runner
    |       +--> GitHub REST ingestion
    |       +--> deterministic analyzer
    |       +--> deterministic dimension scorer
    |       +--> SQLite persistence
    |
    +--> report contract mappings
```

## Runtime components

- `apps/web`: Angular 22 standalone application. La pantalla actual sigue siendo Foundation; el report UI pertenece a Phase 6.
- `apps/api`: Fastify 5, application service, runner in-process, endpoints de análisis y mapping explícito a contratos.
- `packages/contracts`: DTOs serializables de health, jobs y report; no importa entidades del dominio.
- `packages/domain`: significado e invariantes de snapshots, jobs y reportes; no depende de infraestructura.
- `packages/github`: validación de referencias públicas, cliente REST, límites y `IngestionResult`; no contiene handlers ni reglas de análisis.
- `packages/analyzer`: facts, metrics, evidence, findings y recommendations deterministas sobre snapshots limitados.
- `packages/scoring`: cálculo puro de dimension scores; no calcula un score global.
- `packages/persistence`: adapter SQLite sobre `node:sqlite`; no expone filas ni APIs SQLite fuera del package.

No existe `packages/report`: el mapping actual es pequeño y pertenece al boundary HTTP de `apps/api`. No existe `apps/worker`.

## Current repository structure

```text
apps/
  web/                 # Angular application
  api/                 # Fastify transport and application composition
packages/
  contracts/           # public API contracts
  domain/              # business model and invariants
  github/              # bounded GitHub REST ingestion
  analyzer/            # deterministic repository analysis
  scoring/             # deterministic dimension scoring
  persistence/         # SQLite adapter

docs/
```

## Data flow

```text
POST /analyses
    |
    v
queued AnalysisJob
    |
    v
in-process runner (concurrency 1)
    |
    +--> GitHub REST -> IngestionResult
    +--> analyzer -> AnalysisResult
    +--> scorer -> dimension scores
    +--> SQLite -> persisted job and report
    |
    v
GET /analyses/:id
GET /analyses/:id/report
GET /analyses/:id/findings
GET /analyses/:id/recommendations
GET /analyses/:id/facts
```

El job se persiste antes de encolarse y tras las transiciones relevantes. El timeout total por defecto es 75 segundos. Las requests repetidas con el mismo repository, ref y versiones devuelven el job existente.

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

El dominio usa factories explícitas, value sets cerrados y objetos/arrays de solo lectura en runtime. `unknown`, `not_detected` e `insufficient_data` no se convierten en `false` ni en cero. Los dimension scores son nullable y no existe score global.

## Dependency direction

```text
web
  |
  v
contracts <---- explicit mapping ---- apps/api
                                      |
                                      v
                                  application
                                      |
                         domain-oriented ports
                           /        |          \
                          v         v           v
                       github    analyzer    persistence
                                  scoring
```

Reglas vigentes:

- `packages/domain` no depende de Angular, HTTP, Fastify, GitHub, SQLite, filesystem, browser APIs ni IA.
- `packages/contracts` no depende de `packages/domain`; representa la frontera serializable.
- `apps/web` puede depender de `packages/contracts`, pero no de `domain`, `github`, `analyzer`, `scoring`, `persistence` o SQLite.
- `packages/analyzer` y `packages/scoring` dependen únicamente del dominio.
- `packages/persistence` encapsula `node:sqlite` y depende del dominio.
- `apps/api` compone transporte, aplicación y adapters; no expone filas SQLite ni entidades internas directamente.
- GitHub puede depender del dominio para crear snapshots; el dominio no puede conocer GitHub.

`pnpm check:architecture` comprueba imports prohibidos en contracts, domain, github, analyzer, scoring y persistence. Las dependencias y referencias TypeScript del workspace comprueban además la dirección de compilación.

## API boundary

`POST /analyses` valida la forma del payload, normaliza la referencia y devuelve `202 { id, status }` para un job nuevo. Una solicitud idempotente devuelve `200` con el mismo job. Los endpoints GET devuelven DTOs creados mediante `apps/api/src/mapper.ts`, nunca objetos SQLite ni respuestas GitHub.

## Persistence boundary

SQLite guarda metadata del job y un payload de resultado validado. No se guardan blobs completos ni contenidos de repository. `:memory:` se usa en tests; el servidor usa `DATABASE_PATH` o `analysis.db`. La limpieza se expone como operación idempotente, sin scheduler externo.

## Deferred

- Angular report experience.
- Public API rate limiting and broader hardening.
- Cleanup scheduler.
- AI assessment and provider integration.
- Global score.
- Dedicated worker, queue, PostgreSQL, realtime and multi-instance deployment.
