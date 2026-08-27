# AI Developer Platform

Plataforma para analizar repositorios públicos de GitHub y generar un **Developer Health Report** respaldado por evidencia determinista, análisis estático y una capa opcional de interpretación AI.

> Estado: **MVP v1.0 listo para release con limitaciones explícitas**. El análisis determinista es la fuente autoritativa; la interpretación AI es opcional y secundaria. El flujo completo fue validado end-to-end (Phase 23) y el cierre de validación con ground-truth está documentado (Phase 22).

## Objetivo

Responder de forma estructurada a estas preguntas sobre un repositorio:

- Qué problemas técnicos presenta.
- Qué evidencia sustenta cada problema.
- Qué impacto puede tener.
- Qué debería mejorarse primero.

La arquitectura prioriza análisis determinista, reproducibilidad, seguridad y trazabilidad; la IA se mantiene opcional y secundaria.

## Capacidades principales

- Análisis de **repositorios públicos de GitHub** fijado a un commit SHA inmutable.
- Snapshot **acotado y determinista**: selección priorizada de archivos dentro de límites explícitos (requests, bytes, tamaño de archivo, timeout).
- **Análisis determinista** (18 reglas): arquitectura, testing, documentación, dependencias, calidad de código, seguridad, mantenibilidad y tooling.
- **Score dimensional determinista** (5 dimensiones) con confidence y coverage separadas; sin score global.
- Findings con **evidencia trazable** (path, rango, referencia de evidencia) y recomendaciones vinculadas.
- Reporte Angular responsive y accesible, con estados claros (loading, completado, completado con limitaciones, fallido, límite de snapshot superado).
- Persistencia SQLite mínima (no se almacena contenido del repositorio).
- Interpretación AI **opcional**, aislada y no autoritativa (solo con provider configurado server-side).

## Arquitectura

Flujo validado end-to-end (Phase 23):

```text
Angular (apps/web)
  ↓ http (contracts)
Fastify API (apps/api)
  ↓
AnalysisApplication / AnalysisRunner (in-process, concurrency 1)
  ↓
GitHubRestClient → Ingestión REST acotada (traversal segmentado)
  ↓
Analyzer determinista → Scoring dimensional
  ↓
SQLite (packages/persistence) → Report (mapping explícito)
  ↓
Angular UI (report)
```

Separación clara por packages con fronteras verificadas por `pnpm check:architecture`:

| Package | Responsabilidad |
| --- | --- |
| `apps/web` | Angular standalone; consume solo contratos API |
| `apps/api` | Fastify; aplicación, runner in-process, mapping a contratos |
| `packages/contracts` | DTOs serializables públicos |
| `packages/domain` | Modelo e invariantes de negocio, sin infraestructura |
| `packages/github` | Validación de referencias, cliente REST e ingestión acotada |
| `packages/analyzer` | Análisis determinista puro (facts, metrics, evidence, findings) |
| `packages/scoring` | Scores deterministas por dimensión |
| `packages/persistence` | Adapter SQLite aislado |
| `packages/ai` | Interpretación AI opcional y aislada |

## Stack tecnológico

- Node.js 24 LTS (`.nvmrc`; Node `v25` muestra warning de engine y no se recomienda).
- pnpm 10.34.5, workspaces.
- TypeScript 6 en modo strict.
- Angular 22 standalone components.
- Fastify 5.
- Vitest (Angular) y Node test runner con `tsx` (API).
- ESLint flat config, Prettier.
- SQLite (`node:sqlite`).

## Estructura del repositorio

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
  ai/                  # interpretación AI opcional
docs/                  # producto, arquitectura, seguridad, roadmap, ADRs y fases
scripts/               # scripts de verificación (check:architecture)
```

## Requisitos

- Node.js `24`.
- pnpm `10.34.5`.

Usa `.nvmrc` o un gestor de versiones equivalente para seleccionar Node 24.

## Instalación

```bash
pnpm install --frozen-lockfile
```

## Variables de entorno

### API (`apps/api`)

| Variable | Descripción | Defecto |
| --- | --- | --- |
| `HOST` | Interfaz de escucha de la API | `127.0.0.1` |
| `PORT` | Puerto de la API | `3000` |
| `DATABASE_PATH` | Fichero SQLite persistente | `analysis.db` |
| `GITHUB_TOKEN` | Token GitHub server-side para autenticar la ingestión | — |
| `GH_TOKEN` | Alternativa a `GITHUB_TOKEN` | — |

### Web (`apps/web`)

La URL de la API se configura en `apps/web/src/environments/environment.ts` (`/api` en producción) y `environment.development.ts` (`http://127.0.0.1:3000` en desarrollo).

## Configuración de GitHub (importante)

La ingestión de GitHub usa credenciales **server-side únicamente**. Sin token, la API pública de GitHub limita a ~60 requests/hora, por lo que análisis de repositorios no triviales fallarán con un error de rate limit.

Configura el token como variable de entorno del proceso de la API (nunca en el frontend, nunca en el repositorio, nunca en logs):

```bash
export GITHUB_TOKEN="github_pat_..."   # o GH_TOKEN
pnpm dev
```

- El token se resuelve como `GITHUB_TOKEN ?? GH_TOKEN`.
- Se pasa al cliente GitHub solo por variable de entorno; no se imprime, persiste ni devuelve al frontend.
- Los ejemplos usan placeholders; **no documentes ni commitees un token real**.

## Desarrollo local

Arrancar Angular y Fastify conjuntamente:

```bash
pnpm dev
```

- Web: `http://localhost:4200`
- API: `http://127.0.0.1:3000`
- Health: `http://127.0.0.1:3000/health`

Flujo de usuario: introduce la URL de un repositorio público de GitHub → se crea el job → progreso con polling → reporte persistido. Navegación: `/`, `/analyses/:id`, `/analyses/:id/report`.

## Testing

```bash
pnpm test
```

Suites: domain, github, analyzer, scoring, persistence, ai, api (Fastify inject + pipeline) y web (Vitest/Angular). Los tests de GitHub y analyzer no dependen de red; el pipeline usa ingestión fake y SQLite en memoria.

## Build

```bash
pnpm build
```

## Quality commands

```bash
pnpm check:architecture
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm audit --audit-level=high
```

Para aplicar formato:

```bash
pnpm format
```

## Flujo de análisis

1. `POST /analyses` valida la URL, normaliza la referencia y crea/recupera el job (idempotente por repository/ref/versiones).
2. El runner in-process (concurrency 1, timeout 75 s) ejecuta: GitHub REST → ingestión acotada → analyzer → scoring → SQLite.
3. `GET /analyses/:id` devuelve el estado del job; `GET /analyses/:id/report` el reporte persistido.
4. La UI hace polling controlado y renderiza el reporte.

## Ingestión acotada y cobertura

El MVP analiza un **snapshot acotado**, no el repositorio completo:

- `maxFileCount=50`, `maxApiRequests=125`, `maxJsonResponseBytes=4 MiB`, `maxTotalBytes=2 MiB`, `maxFileBytes=256 KiB`, timeout de request 10 s e ingestion 60 s.
- Repositorios muy grandes (`react/react`, `vitejs/vite`) pueden superar el presupuesto de requests: el job falla con `SNAPSHOT_LIMIT_EXCEEDED` (resultado controlado, nunca se presenta como análisis completo).
- La cobertura del reporte (`complete` / `partial` / `insufficient`) y sus limitaciones se muestran explícitamente en la UI con lenguaje claro.
- Los códigos internos (`tree_segmented_early_termination`, `file_count_limit_reached`, etc.) aparecen como detalle secundario, no como mensaje principal.

## Consideraciones de seguridad

- Solo repositorios públicos de GitHub; sin ejecución de código del repositorio analizado ni instalación de sus dependencias.
- Contenido del repositorio tratado estrictamente como datos; no se persisten blobs completos.
- Credenciales GitHub server-side únicamente; nunca en el frontend, en respuestas, en SQLite ni en logs.
- Errores sanitizados: sin stack traces ni detalles internos hacia el usuario.
- SSRF, redirects, traversal, symlinks y submodules protegidos en la ingestión (`docs/security.md`).
- Headers de seguridad básicos en la API (`nosniff`, `DENY`, `no-referrer`).

## Documentación

- [Producto](docs/product.md)
- [Arquitectura](docs/architecture.md)
- [Guía de desarrollo](docs/development.md)
- [Modelo de análisis](docs/analysis-model.md)
- [Modelo de dominio](docs/domain-model.md)
- [GitHub ingestion](docs/github-ingestion.md)
- [Analyzer](docs/analyzer.md)
- [Frontend](docs/frontend.md)
- [Scoring](docs/scoring.md)
- [Seguridad](docs/security.md)
- [Roadmap](docs/roadmap.md)
- [ADRs](docs/adr/)
- Fases de validación: [22 — ground truth](docs/phase-22-final-results.md), [23 — E2E](docs/phase-23-e2e-product-validation.md), [24 — UX/portfolio](docs/phase-24-ux-documentation-portfolio.md)

## Estado del MVP

- **Phase 22** ✅ Ground-truth / validación del analyzer — decisión: `KEEP WITH LIMITATIONS`.
- **Phase 23** ✅ Validación E2E del producto — decisión: `PASS WITH LIMITATIONS` (se corrigió el wiring del token GitHub).
- **Phase 24** ✅ UX + documentación + portfolio.
- **Phase 25** 🏁 Release v1.0 (fase final del MVP).

## Limitaciones conocidas

- Solo repositorios públicos de GitHub; sin autenticación de usuarios ni repositorios privados.
- Ingestión acotada: la cobertura es `partial`/`insufficient` para repositorios grandes y `SNAPSHOT_LIMIT_EXCEEDED` para muy grandes.
- El score es dimensional, determinista y no representa una medida absoluta de calidad; `unknown`, `insufficient_data` y dimensiones sin datos son límites de observación, no puntuaciones negativas.
- La semántica de evidencia de reglas basadas en ausencia puede mejorarse en el futuro (Phase 22).
- Sin E2E de navegador (Playwright) configurado; la validación del frontend es por tests unitarios + contrato API verificado contra el servidor real.
- La interpretación AI es opcional y requiere un provider configurado server-side.

## Futuro (fuera del MVP)

Autenticación y repositorios privados, dashboard avanzado, RAG/embeddings/agentes, streaming, workers distribuidos, colas, Redis, PostgreSQL, billing, analytics y rate limiting público avanzado. Ver `docs/roadmap.md`.
