# Guía de desarrollo

## Foundation actual

Phase 3 añade `packages/github` al monorepo pnpm. Angular y Fastify siguen siendo la web y API de Foundation; GitHub ingestion está implementado como librería desacoplada, mientras analyzer, SQLite, `AnalysisJob`, endpoint HTTP e IA siguen planificados.

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
```

La web no importa entidades internas del backend. La API no expone directamente modelos internos. `packages/contracts` contiene únicamente contratos públicos. `pnpm check:architecture` verifica que `domain` no importe infraestructura y que `github` no importe UI, Fastify, persistencia ni IA.

`domain` y `github` tienen responsabilidades implementadas. `github` no contiene handlers ni analyzer; el endpoint HTTP, `analyzer` y `report` se crearán cuando tengan un consumidor real. No se crean carpetas vacías para anticipar funcionalidades.

## Configuración

Angular usa `src/environments/environment.ts` para producción y `environment.development.ts` para desarrollo. La API acepta `HOST`, `PORT` y una configuración local fija de CORS para la Foundation. No hay secrets reales ni URLs de producción configuradas.

## Security baseline

La API valida `PORT`, usa `HOST` configurable y limita CORS a origins locales explícitos. Expone headers básicos de seguridad y errores internos como `Internal server error`. No se implementan todavía SSRF protection completa, rate limiting avanzado, OAuth ni GitHub security porque aún no existe ese flujo.

## Dependency review

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

## Testing scope

La Foundation cubre:

- creación y estados de la aplicación Angular;
- éxito y error de la llamada `/health`;
- respuesta y status code de la API;
- contratos TypeScript mediante compilación;
- invariantes de dominio mediante tests unitarios;
- URL/ref validation, REST response validation, selección, decodificación, límites y reproducibilidad de GitHub mediante tests sin red;
- límites de dependencias de `domain` y `github` mediante `pnpm check:architecture`;
- lint, format, typecheck y build.

E2E, accessibility completa, endpoint HTTP de ingestión, integración live de GitHub y analyzer fixtures pertenecen a fases posteriores; los tests del adapter usan transporte inyectado y no dependen de red.
