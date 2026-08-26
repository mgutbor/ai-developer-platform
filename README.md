# AI Developer Platform

Plataforma para analizar repositories públicos de GitHub y generar un Developer Health Report respaldado por evidencia determinista, análisis estático y una capa opcional de interpretación AI.

> Estado: **MVP listo para release con limitaciones explícitas**. El análisis determinista es la fuente autoritativa; la interpretación AI es opcional.


## Objetivo

Responder de forma estructurada a estas preguntas sobre un repository:

- Qué problemas técnicos presenta.
- Qué evidencia sustenta cada problema.
- Qué impacto puede tener.
- Qué debería mejorarse primero.

La arquitectura prioriza análisis determinista, reproducibilidad, seguridad y trazabilidad; la IA se mantiene opcional y secundaria.

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

- Experiencia Angular para crear análisis, seguir progreso y consultar el report.
- Endpoint `GET /health`.
- Comunicación Angular → API con estados loading, online y unavailable.
- Contratos API explícitos para health y report, sin exponer entidades internas.
- Dominio puro con factories validadas para snapshots, facts, metrics, evidence, findings, recommendations y resultados.
- Ingestión GitHub REST acotada para repositories públicos, con resolución de commit, selección segura de archivos y límites explícitos.
- Pipeline `POST /analyses` → job in-process → ingestion → analyzer → scoring por dimensión → SQLite → report.
- Endpoints `GET /analyses/:id`, `/report`, `/findings`, `/recommendations` y `/facts`.
- Idempotencia por repository/ref/version, timeout de análisis y cleanup explícito.
- Interpretación AI opcional mediante `packages/ai`, con contexto limitado, referencias validadas y endpoint separado `/analyses/:id/ai`.

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
- [Phase 13 product validation](docs/phase-13-product-validation.md)
- [AI architecture](docs/ai.md)
- [AI evaluation](docs/ai-evaluation.md)
- [Release readiness](docs/release-readiness.md)
- [Release notes v1.0.0](docs/release-notes-v1.0.0.md)
- [Changelog](../CHANGELOG.md)
- [Roadmap](docs/roadmap.md)
- [ADRs](docs/adr/)

## Límites del MVP

El MVP admite únicamente repositories públicos de GitHub y utiliza límites conservadores de ingestion. El score es dimensional, determinista y no representa una medida absoluta de calidad. `unknown`, `insufficient_data` y `completed_with_limitations` deben interpretarse como límites de observación, no como puntuaciones negativas.

La interpretación AI es opcional, secundaria y no modifica findings, evidence, recommendations ni scores. Requiere configuración server-side del provider; sin ella, el report determinista continúa funcionando.

Quedan fuera del MVP: autenticación, repositories privados, dashboard avanzado, RAG, embeddings, agentes, streaming, workers distribuidos, colas, Redis, PostgreSQL, billing y analytics.
