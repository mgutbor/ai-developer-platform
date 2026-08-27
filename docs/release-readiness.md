# Readiness de release — v1.0.0

## Pregunta

**¿Está ai-developer-platform listo para publicarse como v1.0.0?**

**Respuesta: SÍ — LISTO, publicado como v1.0.0 con limitaciones documentadas.**

Este documento es la declaración autoritativa de readiness de release para la release MVP. Refleja el estado final tras todas las fases del MVP (1–25), incluida la validación ground-truth (Phase 22), la validación E2E del producto (Phase 23) y el pulido de UX/documentación/portfolio (Phase 24).

## Versión de release

**1.0.0** (tag `v1.0.0`, anotado, apuntando al commit final de la release MVP).

## Alcance de la release

El MVP v1.0.0: un Developer Health Report determinista y respaldado por evidencia para repositorios públicos de GitHub, entregado mediante una UI Angular y una API Fastify con persistencia SQLite.

### Qué incluye

- Validación de URL de repositorios públicos de GitHub e ingestión acotada anclada al commit.
- Traversal segmentado del Git-tree con terminación temprana que preserva la semántica (Phase 21) — repositorios grandes como `microsoft/TypeScript` y `nodejs/node` son ingeribles dentro de los límites.
- Análisis determinista de TypeScript/JavaScript (18 reglas) que produce facts, metrics, evidencia, findings y recomendaciones.
- Puntuación dimensional nullable (sin puntuación global).
- Ciclo de vida de `AnalysisJob` en proceso con persistencia SQLite y limpieza por retención.
- API de reporte Fastify (`/analyses`, `/analyses/:id`, `/report`, `/findings`, `/recommendations`, `/facts`, `/ai`).
- Experiencia de reporte en Angular con estados claros: loading, completed, completed-with-limitations, failed, snapshot-limit-exceeded, cobertura insuficiente (Phase 24).
- Interpretación de AI opcional y aislada (nunca autoritativa; sin validación de proveedor en vivo).
- Fronteras de seguridad: protecciones SSRF/redirect/traversal/symlink/submódulo, errores sanitizados, credenciales de GitHub solo server-side.
- Documentación: README, arquitectura, desarrollo, seguridad, portfolio, ADRs, roadmap, documentación de fases, release notes.

### Qué NO incluye explícitamente

- Repositorios privados y autenticación.
- Ingestión avanzada (límites ilimitados o configurables, rediseño del tree más allá del traversal segmentado).
- Reglas adicionales del analyzer o dimensiones de puntuación más allá de las 18 reglas / 5 dimensiones actuales.
- SAST completo, análisis semántico AST completo o resolución completa de módulos.
- Ejecución del código del repositorio, builds, tests o instalación de paquetes.
- Escaneo de bases de datos de vulnerabilidades.
- Puntuaciones globales o generadas por AI.
- Remediación automática, integración con GitHub App.
- Workers, colas, Redis, PostgreSQL, microservicios, realtime.
- RAG, embeddings, agents, chat, streaming.
- Billing, analytics, funcionalidades enterprise multi-tenant.
- Automatización E2E a nivel de navegador (Playwright) y auditoría automatizada con axe.

## Validación completada

### Phase 22 — Validación ground-truth (`KEEP WITH LIMITATIONS`)

- Dataset congelado de 8 repositorios públicos con commit SHAs exactos (`docs/phase-22-ground-truth-dataset.md`).
- 25 findings producidos y clasificados mediante revisión humana: **7 TP, 0 FP, 2 uncertain, 16 not-evaluable** (`docs/phase-22-final-results.md`).
- Conclusión: la muestra es **insuficiente para una evaluación defendible de precisión/recall**. Tasa evaluable 28% (7/25); la tasa del 100% TP entre findings evaluables se presenta explícitamente **no** como precisión del analyzer.
- Decisión: **KEEP WITH LIMITATIONS** — ninguna regla de producción justificada por la muestra.

### Phase 23 — E2E + validación de producto (`PASS WITH LIMITATIONS`)

- Servidor real del producto ejecutado por HTTP contra repositorios públicos reales de GitHub (`docs/phase-23-e2e-product-validation.md`).
- Escenarios PASS: análisis exitoso (`octocat/Hello-World` → commit SHA real, findings, evidencia, puntuaciones, cobertura), URL inválida (400), repositorio no encontrado (`REPOSITORY_NOT_FOUND`), límite de ingestión (`SNAPSHOT_LIMIT_EXCEEDED` en `react/react`), cobertura parcial/insuficiente, consistencia API↔UI, líneas base de accesibilidad y seguridad.
- Defecto encontrado y corregido: el servidor de producción nunca cableaba la credencial GitHub server-side en el cliente de GitHub (los análisis se ejecutaban sin autenticación, chocando con el límite sin autenticar de ~60 req/h). Corregido mínimamente en `apps/api/src/app.ts` (lee `GITHUB_TOKEN ?? GH_TOKEN`) con tests de regresión (`apps/api/src/app.token.test.ts`).
- Escenario de cero findings: **NO EJECUTADO** (ningún repo adecuado en la muestra); la UI distingue el estado de findings vacíos mediante código.

### Phase 24 — Pulido de UX + documentación + portfolio (`PASS`)

- Mensajes orientados al usuario para estados de fallo, cobertura y limitaciones en lenguaje llano (códigos internos como detalle secundario).
- Banner de cobertura que distingue complete / partial / insufficient; referencias de evidencia honestas.
- Revisión del README (quick-start, env vars, configuración de credenciales GitHub server-side), arquitectura CURRENT-vs-FUTURE, documentación de portfolio.

## Quality gates

Todos los gates pasan en el estado final de la release:

```text
pnpm install --frozen-lockfile
pnpm check:architecture
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --audit-level=high
git diff --check
```

Suite de tests: domain, github (25), analyzer, scoring, persistence, ai, api, web — 92 tests, 0 fallos (frontend 17, incluidos los tests de mapeo de mensajes de la Phase 24; la API incluye los tests de regresión del cableado de credenciales de la Phase 23).

## Verificación de seguridad

- Las credenciales de GitHub son **solo server-side / de entorno** (`GITHUB_TOKEN` o `GH_TOKEN`), resueltas por la API de producción y pasadas al cliente de GitHub; nunca se devuelven mediante respuestas de la API, nunca se persisten en SQLite, nunca se registran.
- El README y los docs muestran solo ejemplos con placeholders; no se commitea ningún token real.
- Los escaneos del working tree, de los cambios staged y de los docs no encontraron credenciales commiteadas, valores `Authorization`/`Bearer` ni secretos.
- Los contenidos del repositorio se tratan como datos; no se ejecuta código del repositorio, no se instalan dependencias de los repositorios analizados.
- Los errores están sanitizados (sin stack traces ni detalles internos para los usuarios); las protecciones SSRF/redirect/traversal/symlink/submódulo están cubiertas por tests.

## Validación de API/producto

El E2E real del producto contra repositorios públicos (Phase 23) validó: análisis exitoso, URL inválida, repositorio no encontrado, límite de ingestión, cobertura parcial, errores upstream, consistencia de datos del reporte (API ↔ UI), línea base de seguridad. El E2E a nivel de navegador (Playwright) no está configurado; el frontend se valida con tests unitarios más la verificación del contrato de la API contra el servidor real.

## Limitaciones conocidas

- **Ingestión acotada:** `maxFileCount=50`, `maxApiRequests=125`, `maxJsonResponseBytes=4 MiB`, `maxTotalBytes=2 MiB`, `maxFileBytes=256 KiB`, timeouts. La cobertura es `partial`/`insufficient` para la mayoría de los repositorios.
- **SNAPSHOT_LIMIT_EXCEEDED:** los repositorios muy grandes (`react/react`, `vitejs/vite`) no pueden completar un snapshot de 50 archivos dentro de `maxApiRequests=125`; el producto lo comunica como un fallo controlado, nunca como un análisis completo.
- **Evidencia basada en ausencia:** reglas como `AN-TEST-001`/`AN-TEST-002`/`AN-TOOL-001`/`AN-CQ-002`/`AN-DEP-001` pueden reportar "not detected" cuando el snapshot acotado puede no contener todos los archivos relevantes (Phase 22); la semántica de evidencia podría mejorar en una iteración futura.
- **AN-ARCH-002:** los findings de imports sin resolver reflejan fallos de la resolución estática acotada; no son defectos demostrables de forma fiable (Phase 22).
- **Ground truth:** muestra insuficiente para una precisión/recall defendible; sin afirmación de precisión del analyzer.
- **Sin E2E de navegador / axe automatizado** (tooling de Playwright y Lighthouse añadido deliberadamente no).
- **AI:** opcional y no validada en vivo (sin credenciales de proveedor configuradas); el reporte determinista es autoritativo.

## Gaps conocidos no bloqueantes

- Puntuaciones de Lighthouse sin medir (sin tooling configurado).
- Sin mediciones de carga/concurrencia a escala de producción.
- Sin runbook operativo de backup/retención.
- Sin evaluación de AI con proveedor real.
- Sin rate limiting multi-instancia.

## Requisitos operativos

- Node.js 24 (`.nvmrc`), pnpm 10.34.5.
- Ejecutar `pnpm install --frozen-lockfile`, después `pnpm dev` (web `http://localhost:4200`, API `http://127.0.0.1:3000`) o build/run mediante los scripts del paquete.
- Archivo SQLite configurado mediante `DATABASE_PATH` (por defecto `analysis.db`); `:memory:` usado en tests.
- No commitear `.env`, bases de datos SQLite, logs, salida de build ni cachés de Angular.

### Variables de entorno requeridas

| Variable | Propósito | Requerida |
| --- | --- | --- |
| `GITHUB_TOKEN` (o `GH_TOKEN`) | Credencial server-side para la ingestión de la GitHub API | **Sí** para análisis reales de repos no triviales (sin ella, aplica el límite sin autenticar de ~60 req/h) |
| `HOST` | Host de escucha de la API | No (por defecto `127.0.0.1`) |
| `PORT` | Puerto de la API | No (por defecto `3000`) |
| `DATABASE_PATH` | Ruta SQLite | No (por defecto `analysis.db`) |
| Env vars del proveedor de AI | Interpretación de AI opcional | No (AI opcional) |

### Requisitos de API/token de GitHub

- Acceso público a la GitHub API con un token server-side (`GITHUB_TOKEN` o `GH_TOKEN`). El token se resuelve como `GITHUB_TOKEN ?? GH_TOKEN`, se pasa solo al cliente de GitHub y nunca se imprime/persiste/devuelve.
- Sin autenticación orientada al usuario; el acceso al repositorio se limita a repositorios públicos.

## Reproducibilidad

- El análisis se ancla a un commit SHA inmutable antes de la ingestión.
- El dataset ground-truth de la Phase 22 está congelado con SHAs exactos y un runner determinista (`apps/api/src/validate-ground-truth.ts`) que reproduce los mismos snapshots/resultados.
- Analyzer/scoring deterministas: mismo commit + mismas reglas → mismo reporte.
- Toda la documentación de fases, los ADRs y este documento están versionados en el repositorio.

## Decisión de release

**READY**

El MVP se publica como **v1.0.0** con las limitaciones documentadas anteriormente. Es una release MVP controlada, no una afirmación incondicional de readiness de producción.

## Recomendación final

Congelar el MVP en v1.0.0. El trabajo futuro debe abordar las limitaciones documentadas (ingestión acotada para repos muy grandes, semántica de evidencia basada en ausencia, automatización de E2E/axe de navegador, evaluación de AI con proveedor real, operaciones a escala de producción) — ninguna bloquea esta release. No debe añadirse nuevo alcance de producto sin una fase post-MVP dedicada.
