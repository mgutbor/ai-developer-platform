# Guía de desarrollo

## Phase 5

Phase 5 connects GitHub ingestion, the deterministic analyzer, dimension scoring and SQLite through an in-process `AnalysisJob` runner. The Angular application remains the Foundation screen; the complete report UI is planned for Phase 6.


## Requisitos

- Node.js 24 LTS, seleccionado mediante `.nvmrc`.
- pnpm 10.34.5.

El entorno usado para validar la Foundation tiene Node `v25.3.0`, que está fuera de la línea recomendada y genera un warning de engine. CI utiliza Node 24.

## Instalación

```bash
pnpm install --frozen-lockfile
```

## Desarrollo

```bash
pnpm dev
```

Esto arranca la web Angular en `http://localhost:4200` y la API Fastify en `http://127.0.0.1:3000`. La pantalla inicial consulta `GET /health` y muestra los estados loading, online o unavailable.

También pueden arrancarse por separado:

```bash
pnpm --filter @ai-developer-platform/api dev
pnpm --filter @ai-developer-platform/web start
```

## Quality commands

```bash
pnpm check:architecture
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

El test de API utiliza `fastify.inject()`. Angular utiliza el builder de tests basado en Vitest generado por Angular CLI.

## Estructura y límites

```text
apps/web/             # Angular; consume API contracts
apps/api/             # Fastify; endpoint health y composición inicial
packages/contracts/   # contratos externos compartidos
packages/domain/      # modelo e invariantes sin infraestructura
packages/github/      # adapter REST e ingestión acotada
packages/scoring/      # scores deterministas por dimensión
packages/persistence/  # adapter SQLite aislado
```

La web no importa entidades internas del backend. La API no expone directamente modelos internos. `packages/contracts` contiene únicamente contratos públicos. `pnpm check:architecture` verifica que `contracts` no dependa del dominio, que `domain` no importe infraestructura, que `github` no importe UI, Fastify, persistencia ni IA, que `analyzer`/`scoring` no importen GitHub, runtime, filesystem, transporte o IA, y que `persistence` no importe transporte ni otros adapters de producto.

`domain`, `github`, `analyzer`, `scoring` y `persistence` tienen responsabilidades implementadas. `apps/api` contiene la aplicación, el runner, el mapping y los endpoints HTTP; `packages/persistence` es el único consumidor de `node:sqlite`. No se ejecutan scripts, tests, builds ni package managers del repository analizado.


## Configuración

La API acepta `HOST`, `PORT`, `DATABASE_PATH` y una configuración local fija de CORS para la Foundation. `DATABASE_PATH` permite usar un fichero SQLite persistente; los tests usan `:memory:`.

La ingestión de GitHub usa credenciales server-side únicamente, resueltas como `process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN` y pasadas al `GitHubRestClient` por el servidor de producción (`apps/api/src/app.ts`, verificado en Phase 23). Sin token, la API pública de GitHub limita a ~60 requests/hora y los análisis de repositorios no triviales fallarán con un error de rate limit. El token nunca se imprime, persiste ni devuelve al frontend; los tests de wiring usan un stub fetch offline.


## Baseline de seguridad

La API valida `PORT`, usa `HOST` configurable y limita CORS a origins locales explícitos. Expone headers básicos de seguridad y errores internos como `Internal server error`. La protección SSRF de la ingestión GitHub y sus límites de red ya están implementados; rate limiting público avanzado, OAuth y controles de GitHub adicionales quedan para hardening posterior.

## Revisión de dependencias

| Package | Purpose | Why needed now | Alternative | Risk |
| --- | --- | --- | --- | --- |
| Angular 22 | Foundation web y standalone components | Requisito arquitectónico y pantalla inicial | React, descartado por ADR-008 | Framework principal y compatibilidad con Node/TypeScript |
| Fastify 5 | API y `/health` | HTTP, logging, plugins y testing por injection | Express o NestJS, evaluados en ADR-013 | Dependencia de framework encapsulada en API |
| `@fastify/cors` | CORS local explícito | Permite comunicación web/API en desarrollo | Hook propio, menos mantenible | Solo origins locales conocidos |
| TypeScript 6 | Compilación strict | Contratos y apps TypeScript | TypeScript 7 incompatible con peer range Angular actual | Actualizar según compatibilidad Angular |
| Vitest + jsdom | Tests Angular | Builder de unit tests de Angular CLI | Karma, no necesario para el setup actual | Solo dev dependency |
| tsx | Ejecutar tests TypeScript de API | Evita compilar manualmente antes de cada test | Node test runner sobre JS compilado | Solo desarrollo |
| ESLint + typescript-eslint | Calidad estática | Detecta errores simples en TS | Reglas propias, menos consistentes | Configuración deliberadamente pequeña |
| Prettier | Formato común | Check reproducible en CI | Formato manual, descartado | Documentación prose excluida |
| `concurrently` | Arranque local web/API | Un único `pnpm dev` | Dos terminales, menos DX | Solo herramienta de desarrollo |
| `@ai-developer-platform/github` | Resolución e ingestión REST acotada | Responsabilidad real de Phase 3 | SDK de GitHub, descartado | Adapter propio; límites y validación cubiertos por tests |
| `@ai-developer-platform/analyzer` | Facts, metrics y findings deterministas | Responsabilidad real de Phase 4 | AST framework y parser completo, diferidos | Heurísticas acotadas; sin infraestructura ni ejecución |

## Alcance del testing

La Foundation cubre:

- creación y estados de la aplicación Angular;
- éxito y error de la llamada `/health`;
- pipeline API con fake ingestion, analyzer, scorer y SQLite;
- round-trip y restart de persistencia SQLite;
- lifecycle de AnalysisJob, idempotencia, errores sanitizados y cleanup;
- contratos TypeScript mediante compilación;
- invariantes de dominio mediante tests unitarios;
- URL/ref validation, REST response validation, selección, decodificación, límites y reproducibilidad de GitHub mediante tests sin red;
- límites de dependencias de `domain`, `github` y `analyzer` mediante `pnpm check:architecture`;
- analyzer fixtures in-memory, golden assertions, malformed input, security, determinism y performance sanity;
- lint, format, typecheck y build.

E2E, accessibility completa y report frontend pertenecen a fases posteriores. Los tests de GitHub y analyzer no dependen de red; los tests del pipeline usan fake ingestion y SQLite en memoria.
