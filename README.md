# AI Developer Platform

Plataforma para analizar repositories de GitHub y generar un Developer Health Report respaldado por evidencia determinista, análisis estático y una capa futura de IA.

> Estado: **Phase 5 — Analysis Pipeline, SQLite & Deterministic Report completada**. La UI completa del report y la IA siguen fuera de alcance.


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

- Monorepo ejecutable con `apps/web`, `apps/api`, `packages/contracts`, `packages/domain`, `packages/github`, `packages/analyzer`, `packages/scoring` y `packages/persistence`.

- Pantalla Angular mínima de Foundation.
- Endpoint `GET /health`.
- Comunicación Angular → API con estados loading, online y unavailable.
- Contratos API explícitos para health y report, sin exponer entidades internas.
- Dominio puro con factories validadas para snapshots, facts, metrics, evidence, findings, recommendations y resultados.
- Ingestión GitHub REST acotada para repositories públicos, con resolución de commit, selección segura de archivos y límites explícitos.
- Pipeline `POST /analyses` → job in-process → ingestion → analyzer → scoring por dimensión → SQLite → report.
- Endpoints `GET /analyses/:id`, `/report`, `/findings`, `/recommendations` y `/facts`.
- Idempotencia por repository/ref/version, timeout de análisis y cleanup explícito.

- TypeScript estricto, ESLint, Prettier y scripts raíz.
- Tests unitarios del dominio, además de tests de API y Angular.
- Workflow de GitHub Actions para install, architecture check, lint, format, typecheck, test y build.

## Estructura actual

```text
apps/
  web/                 # Angular standalone application
  api/                 # Fastify API y composición del pipeline
packages/
  contracts/           # contratos públicos compartidos
  domain/              # modelo e invariantes de negocio
  github/              # adapter REST e ingestión segura acotada
  analyzer/            # análisis determinista puro y basado en evidencia
  scoring/             # scores deterministas por dimensión
  persistence/         # adapter SQLite aislado

docs/                  # producto, arquitectura, seguridad, roadmap y ADRs
```

Los packages `domain`, `github`, `analyzer`, `scoring` y `persistence` ya están implementados. `github` concentra la validación de referencias, el adapter REST y la ingestión acotada; `analyzer` consume esa salida de forma estructural y no depende del adapter; `scoring` calcula únicamente scores dimensionales; `persistence` encapsula SQLite. Ninguno contiene handlers Fastify, y no se almacenan blobs del repository.

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

La aplicación Angular permite iniciar análisis, consultar su progreso y abrir el report persistido. La navegación usa `/`, `/analyses/:id` y `/analyses/:id/report`; el cliente hace polling controlado y renderiza findings, evidence y recommendations como texto seguro.

## Quality commands

```bash
pnpm check:architecture
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
- [Modelo de dominio](docs/domain-model.md)
- [GitHub ingestion](docs/github-ingestion.md)
- [Analyzer](docs/analyzer.md)
- [Frontend](docs/frontend.md)
- [Phase 7 validation](docs/phase-7-validation.md)
- [Roadmap](docs/roadmap.md)
- [ADRs](docs/adr/)

## Funcionalidades todavía no implementadas

IA, autenticación, dashboard y report frontend completo pertenecen a fases posteriores. La API ya expone el vertical slice de análisis y el servidor usa `analysis.db` por defecto.
