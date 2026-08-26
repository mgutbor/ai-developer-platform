# Arquitectura

## Estado tras la Foundation

Esta sección distingue lo que existe realmente de lo que sigue siendo diseño. La Fase 1 no implementa análisis de repositories ni persistencia de resultados.

### Implementado

```text
apps/web/              # Angular 22 standalone application
    ↓ HTTP GET /health
apps/api/              # Fastify 5 API
    ↓
packages/contracts/    # HealthResponse compartido
```

- `apps/web`: pantalla Foundation, routing preparado, environment configuration y cliente mínimo de health.
- `apps/api`: composición Fastify, `GET /health`, CORS local, headers básicos, logging integrado y error handler público.
- `packages/contracts`: contrato externo `HealthResponse`, separado de entidades internas.
- Root: pnpm workspaces, TypeScript strict, ESLint, Prettier, tests y GitHub Actions.

### Planificado

```text
packages/
  domain/
  github/
  ingestion/
  analyzer/
  report/
```

Estos packages no se crean todavía porque no tienen comportamiento implementado en Foundation. Se incorporarán con sus primeras responsabilidades reales en las fases del roadmap.

## Arquitectura objetivo refinada

El producto evolucionará hacia un monolito modular con dos aplicaciones runtime:

```text
Angular web
    ↓ HTTP API
Fastify API
    ↓ in-process AnalysisJob runner
GitHub REST ingestion
    ↓
TypeScript/JavaScript analyzer
    ↓
SQLite
```

No se crea `apps/worker` en el MVP inicial. El runner será extraíble si aparecen señales de duración, concurrencia o disponibilidad.

## Dependency direction

```text
web
 ↓
contracts
 ↓
application/domain
 ↓
infrastructure adapters
```

Reglas vigentes:

- `packages/contracts` no depende del dominio.
- `apps/web` puede depender de `packages/contracts`, pero no de `domain`, `github`, `analyzer`, `report` o SQLite.
- `apps/api` compone contracts y Fastify; no expone entidades internas directamente.
- El futuro `domain` no dependerá de Angular, HTTP, Fastify, GitHub, SQLite, filesystem o IA.
- Los adapters dependerán de abstracciones del dominio, no al revés.

En Foundation la dirección se verifica mediante estructura de imports, referencias TypeScript y revisión de PR. Se añadirá una regla automatizada más fuerte solo cuando existan varios packages con dependencias reales; no se introduce un dependency-cruiser-like tool prematuramente.

## Current repository structure

```text
apps/
  web/
    src/app/core/api/health.service.ts
    src/app/app.ts
    src/app/app.html
  api/
    src/app.ts
    src/server.ts
    src/app.test.ts
packages/
  contracts/
    src/index.ts

docs/
```

## Frontend Foundation

Angular usa standalone components, routing preparado y environment file replacement para distinguir desarrollo y producción. La aplicación tiene una única pantalla de Foundation y no contiene dashboard, report, forms de análisis ni state manager global.

El cliente HTTP está aislado en un service de data access. La UI muestra loading, online y unavailable, con retry en caso de error. La API URL local se configura únicamente en el environment de desarrollo; producción usa una ruta relativa `/api`.

## Backend Foundation

Fastify se compone mediante `buildApp`, separado del proceso de escucha, lo que permite tests con `fastify.inject()`. La API expone únicamente:

```text
GET /health
```

No existen todavía endpoints de análisis, findings, recommendations o facts.

La API aplica CORS explícito para los origins locales de Angular y headers básicos de seguridad. La configuración mínima de `HOST` y `PORT` se valida antes de escuchar.

## Contracts

`HealthResponse` es un contrato externo compartido por web y API. Las entidades internas del futuro dominio no se exportarán directamente a la web ni se mezclarán con DTOs públicos.

## Future flow

La ingesta, el analyzer determinista, SQLite y `AnalysisJob` pertenecen a fases posteriores. La IA, providers, prompts, structured output y validation quedan condicionados a la validación del MVP determinista.
