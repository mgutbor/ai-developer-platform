# AI Developer Platform

Plataforma para analizar repositories de GitHub y generar un Developer Health Report respaldado por evidencia determinista, análisis estático y una capa futura de IA.

> Estado: **Fase 1 — Foundation & Developer Experience completada**. El vertical slice de análisis todavía no está implementado.

## Objetivo

Responder de forma estructurada a estas preguntas sobre un repository:

- Qué problemas técnicos presenta.
- Qué evidencia sustenta cada problema.
- Qué impacto puede tener.
- Qué debería mejorarse primero.

La arquitectura prioriza análisis determinista, reproducibilidad, seguridad y trazabilidad antes de incorporar IA.

## Stack actual

- Node.js 24 LTS.
- pnpm workspaces.
- TypeScript 6 en modo strict.
- Angular 22 standalone components.
- Fastify 5 para la API.
- Vitest para tests Angular y Node test runner mediante `tsx` para la API.
- ESLint flat config y Prettier.

Las versiones de Angular y sus peer dependencies se mantienen alineadas. Node `v25` está EOL; se recomienda usar la línea 24 definida en `.nvmrc`.

## Foundation implementada

- Monorepo ejecutable con `apps/web`, `apps/api` y `packages/contracts`.
- Pantalla Angular mínima de Foundation.
- Endpoint `GET /health`.
- Comunicación Angular → API con estados loading, online y unavailable.
- Contrato `HealthResponse` compartido sin exponer entidades internas.
- TypeScript estricto, ESLint, Prettier y scripts raíz.
- Tests de API y Angular.
- Workflow de GitHub Actions para install, lint, format, typecheck, test y build.

## Estructura actual

```text
apps/
  web/                 # Angular standalone application
  api/                 # Fastify API y composición de Foundation
packages/
  contracts/           # contratos públicos compartidos

docs/                  # producto, arquitectura, seguridad, roadmap y ADRs
```

Los packages `domain`, `github`, `ingestion`, `analyzer` y `report` están diseñados, pero todavía no se crean porque no tienen responsabilidad implementada en esta fase.

## Requisitos

- Node.js `24`.
- pnpm `10.34.5`.

Usa `.nvmrc` o un gestor de versiones equivalente para seleccionar Node 24. El entorno utilizado para esta fase tenía Node `v25.3.0`, que muestra un warning de engine por estar fuera de la línea recomendada.

## Instalación

```bash
pnpm install --frozen-lockfile
```

## Desarrollo

Arrancar Angular y Fastify conjuntamente:

```bash
pnpm dev
```

- Web: `http://localhost:4200`
- API: `http://127.0.0.1:3000`
- Health: `http://127.0.0.1:3000/health`

La pantalla de Foundation comprueba automáticamente la disponibilidad de la API.

## Quality commands

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

Para aplicar formato:

```bash
pnpm format
```

## Arquitectura y roadmap

- [Arquitectura](docs/architecture.md)
- [Architecture review](docs/architecture-review.md)
- [Guía de desarrollo](docs/development.md)
- [Modelo de análisis](docs/analysis-model.md)
- [Roadmap](docs/roadmap.md)
- [ADRs](docs/adr/)

## Funcionalidades todavía no implementadas

GitHub ingestion, analyzer, findings, evidence, recommendations, scoring, SQLite, `AnalysisJob` real, IA, autenticación y dashboard pertenecen a fases posteriores. No se ejecuta código de repositories analizados.
