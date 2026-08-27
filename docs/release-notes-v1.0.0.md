# AI Developer Platform v1.0.0

## Qué es

AI Developer Platform analiza un snapshot acotado de un repositorio público de GitHub y produce un Developer Health Report respaldado por evidencia. El reporte determinista es la salida autoritativa del producto. Una capa de AI opcional puede explicar y priorizar el material existente del reporte, pero nunca crea ni modifica findings, evidencia ni puntuaciones.

## Qué hace v1.0.0

1. Acepta la URL de un repositorio público de GitHub y una ref opcional.
2. Resuelve la ref a un commit SHA inmutable.
3. Obtiene metadatos acotados del repositorio, entradas del tree y archivos textuales mediante GitHub REST (traversal segmentado del tree con terminación temprana que preserva la semántica).
4. Ejecuta análisis determinista de TypeScript/JavaScript (18 reglas en arquitectura, testing, documentación, dependencias, calidad de código, seguridad, mantenibilidad y tooling).
5. Produce facts, metrics, evidencia, findings y recomendaciones.
6. Calcula puntuaciones dimensionales nullable (sin puntuación global).
7. Persiste jobs y reportes en SQLite.
8. Expone el reporte mediante endpoints de la API Fastify y una UI Angular.
9. Genera opcionalmente una interpretación de AI etiquetada por separado.

## Inicio rápido

Requisitos:

- Node.js 24;
- pnpm 10.34.5.

```bash
pnpm install --frozen-lockfile
export GITHUB_TOKEN="<server-side-token>"   # o GH_TOKEN; nunca commitees un token real
pnpm dev
```

Abre `http://localhost:4200`, introduce la URL de un repositorio público de GitHub y sigue el progreso del análisis hasta el reporte.

Validación de calidad:

```bash
pnpm check:architecture
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --audit-level=high
```

## Flujo de la API

```text
POST /analyses
GET  /analyses/:id
GET  /analyses/:id/report
GET  /analyses/:id/findings
GET  /analyses/:id/recommendations
GET  /analyses/:id/facts
POST /analyses/:id/ai
GET  /analyses/:id/ai
```

## Añadido

- Validación de URL de repositorios públicos de GitHub e ingestión acotada anclada al commit.
- Adquisición segmentada del Git-tree para repositorios grandes con terminación temprana determinista que preserva la semántica (`microsoft/TypeScript`, `nodejs/node` ingeribles dentro de los límites).
- Análisis determinista de TypeScript/JavaScript que produce facts, metrics, evidencia, findings y recomendaciones.
- Puntuación dimensional nullable (arquitectura, testing, documentación, dependencias, calidad de código) sin puntuación global.
- Ciclo de vida de `AnalysisJob` en proceso con persistencia SQLite, idempotencia y limpieza por retención.
- API de reporte Fastify y experiencia de reporte en Angular.
- Estados claros orientados al usuario: loading, completed, completed-with-limitations, failed con motivo específico, snapshot-limit-exceeded, cobertura insuficiente, findings vacíos (Phase 24).
- Interpretación asistida por AI opcional con contexto acotado, salida estructurada, referencias validadas y rate limiting local.
- Fronteras de seguridad para SSRF, redirects, path traversal, symlinks/submódulos, contenido no confiable del repositorio e inyección de prompts.
- Checks de calidad automatizados, fixtures deterministas, documentación de validación por fases, documentación de portfolio y de release.

## Validado

- **Phase 22 (ground truth):** dataset congelado de 8 repositorios; 25 findings clasificados por humanos (7 TP, 0 FP, 2 uncertain, 16 not-evaluable). Conclusión: muestra insuficiente para una precisión/recall defendible; decisión `KEEP WITH LIMITATIONS`.
- **Phase 23 (producto E2E):** servidor real del producto validado contra repositorios públicos — análisis exitoso (commit SHA real, findings, evidencia, puntuaciones, cobertura), URL inválida (400), repositorio no encontrado, límite de ingestión (`SNAPSHOT_LIMIT_EXCEEDED`), cobertura parcial/insuficiente, consistencia API↔UI, líneas base de accesibilidad y seguridad. Decisión `PASS WITH LIMITATIONS`. Se corrigió un defecto real de producción: la credencial GitHub server-side ahora se cablea en el cliente de GitHub (con tests de regresión).
- **Phase 24 (UX/docs/portfolio):** mensajes de fallo, cobertura y limitaciones en lenguaje llano; documentación de README, arquitectura y portfolio. Decisión `PASS`.
- Suite completa de quality gates en verde: install, architecture check, format, lint, typecheck, tests (92, 0 fallos), build, audit (sin vulnerabilidades conocidas), `git diff --check`.

## Seguridad

- Las credenciales de GitHub son **solo server-side / de entorno** (`GITHUB_TOKEN` o `GH_TOKEN`). La aplicación las resuelve desde el entorno, las pasa al cliente de GitHub y nunca las devuelve, persiste ni registra.
- Ningún valor de credencial aparece en documentación, artefactos, respuestas de la API ni SQLite.
- Los ejemplos del README usan solo placeholders.
- Los contenidos del repositorio se tratan como datos: no se ejecuta código del repositorio ni se instalan dependencias del repositorio analizado.
- Los errores están sanitizados para los usuarios (sin stack traces ni detalles internos).

## Limitaciones conocidas

- **Ingestión acotada:** `maxFileCount=50`, `maxApiRequests=125`, `maxJsonResponseBytes=4 MiB`, `maxTotalBytes=2 MiB`, `maxFileBytes=256 KiB`. La cobertura es `partial`/`insufficient` para la mayoría de los repositorios y se comunica honestamente en la UI.
- **SNAPSHOT_LIMIT_EXCEEDED:** los repositorios muy grandes (`react/react`, `vitejs/vite`) no pueden completar un snapshot de 50 archivos dentro de `maxApiRequests=125`; el producto reporta un fallo controlado y nunca presenta un análisis incompleto como completo.
- **Evidencia basada en ausencia:** las reglas pueden reportar "not detected" cuando el snapshot acotado puede no contener todos los archivos relevantes.
- **AN-ARCH-002:** los findings de imports sin resolver reflejan límites de la resolución estática acotada, no defectos demostrados del repositorio.
- **Ground truth:** la muestra validada es insuficiente para una afirmación estadísticamente defendible de precisión/recall.
- **Sin E2E de navegador (Playwright) / axe automatizado:** el frontend se valida con tests unitarios y verificación del contrato de la API contra el servidor real.
- **AI opcional:** no validada con un proveedor en vivo (sin credenciales configuradas); el reporte determinista es autoritativo.
- Solo se soportan repositorios públicos de GitHub.

## No incluido

- Repositorios privados, autenticación e integración con GitHub App.
- Ingestión avanzada o ilimitada y reglas adicionales del analyzer.
- SAST completo, análisis AST completo, resolución completa de módulos y escaneo de vulnerabilidades.
- Ejecución del código del repositorio, builds, tests ni instalación de paquetes.
- Puntuaciones globales o generadas por AI y remediación automática.
- Workers, colas, Redis, PostgreSQL, microservicios, realtime, billing, analytics.
- RAG, embeddings, agents, chat, streaming.

## Estado de la release

Esta es la **release MVP v1.0.0** — la fase MVP final. El producto se publica como v1.0.0 con las limitaciones documentadas anteriormente. Las mejoras de ingestión acotada, semántica de evidencia, automatización de E2E/axe de navegador, evaluación de AI en vivo y operaciones a escala de producción quedan diferidas deliberadamente al trabajo post-MVP.

Ver [`docs/release-readiness.md`](release-readiness.md), [`docs/portfolio.md`](portfolio.md), [`docs/security.md`](security.md), [`docs/architecture.md`](architecture.md) y [`docs/roadmap.md`](roadmap.md).
