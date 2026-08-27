# Phase 23 — Validación E2E + de producto

## 1. Objetivo

Validar el flujo real del producto desde el frontend Angular a través del pipeline completo del backend y de vuelta al informe visible por el usuario, y responder una pregunta:

> **"¿Puede un usuario real enviar una URL de repositorio de GitHub y recibir un resultado confiable y comprensible a través del producto completo?"**

Esta fase no añade funcionalidad. Valida, ejercita los paths de error y corrige solo defectos genuinos de integración.

## 2. Alcance

Escenarios de producto validados:
1. Análisis exitoso (repositorio real de GitHub a través del producto en ejecución).
2. URL de repositorio inválida.
3. Repositorio inexistente (404 de GitHub).
4. Límite de ingestion (resultado de recursos acotados).
5. Cobertura parcial / insuficiente.
6. Error de upstream/API.
7. Resultado con cero findings.
8. Consistencia de datos del informe (API ↔ UI).
9. Baseline de accesibilidad / UX.
10. Baseline de seguridad.

Fuera de alcance: nuevas reglas del analyzer, cambios de scoring, rediseño de ingestion, AI, rediseño de UX, infraestructura nueva.

## 3. Arquitectura existente validada

```text
Angular (apps/web)
  ↓ http (AnalysisService: createAnalysis, getAnalysis, getReport)
API (apps/api, Fastify)
  ↓
AnalysisApplication / AnalysisRunner (cola in-process, maxConcurrentJobs=1)
  ↓
GitHubRestClient (REST, acotado) → Ingestion (recorrido segmentado de árbol, Phase 21)
  ↓
Analyzer (reglas deterministas) → Scoring (5 dimensiones)
  ↓
SqlitePersistence → Mapeo del report (mapper.ts) → /analyses/:id/report
  ↓
Página del report de Angular
```

El entrypoint `server.ts` inicia `buildApp({ databasePath })`. Endpoints ejercitados en esta fase: `GET /health`, `POST /analyses`, `GET /analyses/:id`, `GET /analyses/:id/report`.

## 4. Estrategia de tests

- **E2E real (obligatorio):** el servidor real del producto (`tsx src/server.ts`) se inició en `127.0.0.1:3199` con una base de datos SQLite real y se condujo por HTTP real (curl/Python urllib) contra repositorios públicos reales de GitHub. Esto ejercita el pipeline real: HTTP → job → GitHub REST → ingestion → analyzer → scoring → persistence → report.
- **Tests de regresión:** nuevo `apps/api/src/app.token.test.ts` (cableado de credenciales, fetch stub offline) + suites existentes de API/pipeline/domain/github/analyzer/scoring/persistence/web.
- **Frontend:** unit tests de Angular (`ng test`) + verificación a nivel de código de que el contrato de respuesta de la API coincide con `AnalysisService` y los campos consumidos por la página del report.
- **No ejecutado:** E2E de navegador con Playwright — no hay harness de Playwright configurado en el repo (solo una referencia transitiva en el lockfile), y añadir infraestructura de navegador está fuera del alcance de esta fase.

## 5. Matriz de validación

| Escenario | Comportamiento esperado | Resultado real | PASS/FAIL | Evidencia |
|----------|--------------------|---------------|-----------|----------|
| Análisis exitoso | URL aceptada → job → resolución real de GitHub → snapshot → analyzer → scoring → persistido → informe renderizado con findings/scores/cobertura | `octocat/Hello-World` POST → 202 en cola → `completed_with_limitations` → informe 200; SHA de commit real `7fd1a60b…`; cobertura `insufficient`; 3 findings; 3 evidence; 3 recommendations; dimension scores `{architecture:10, maintainability:10, testing:8.5, documentation:10, dependencies:null, code_quality:9.5}`; confianza `low` | **PASS** | Driver E2E real, `/tmp/e2e_run.py` escenario 1 |
| URL inválida | Rechazo limpio, error útil, sin job roto, sin fuga de detalles de implementación | `not-a-url`, `https://example.com/foo/bar`, `https://github.com` → HTTP 400 `INVALID_REPOSITORY_URL` (`repositoryUrl or ref is invalid`); sin job creado | **PASS** | escenario 2 |
| Repositorio no encontrado | 404 de GitHub → estado de error del job significativo, sin stack/token | `octocat/this-repo-does-not-exist-xyz123` → job `failed`, `errorCode=REPOSITORY_NOT_FOUND`, sin stack en la respuesta | **PASS** | escenario 3 |
| Límite de ingestion | Resultado acotado (`SNAPSHOT_LIMIT_EXCEEDED`), sin hang, el resultado incompleto nunca se presenta como completo | `react/react` (maxFileCount=50) → job `failed` en ~50s con `errorCode=SNAPSHOT_LIMIT_EXCEEDED`; informe 404 `RESULT_NOT_AVAILABLE`; sin stack/token | **PASS** | `/tmp/e2e_limit.py react/react` |
| Cobertura parcial / insuficiente | Cobertura + limitaciones preservadas de ingestion a informe; la UI distingue de completo | Hello-World cobertura `insufficient`; `nodejs/node` (tras el fix del token) `completed_with_limitations`, cobertura `partial`, limitaciones expuestas (p. ej. `tree_segmented_acquisition`, `file_count_limit_reached`) | **PASS** | escenarios 1, 5; driver de límite nodejs/node |
| Error de upstream/API | Error controlado, sin loading infinito, sin fuga de credenciales, job consistente | GitHub no encontrado → `REPOSITORY_NOT_FOUND` job failed (404 real); path de rate-limit clasificado `GITHUB_RATE_LIMITED` (observado pre-fix en nodejs/node); ambos controlados, sin fuga | **PASS** | escenarios 3 + ejecución pre-fix de nodejs/node; pipeline.test.ts "marks GitHub failures" |
| Cero findings | La UI distingue "completado, sin findings" vs "fallido" vs "cobertura insuficiente" | La página del report renderiza `No findings detected.` cuando `findings.length === 0` (empty state) y muestra la cobertura por separado; no se ejercitó un repositorio genuinamente sin findings en la muestra congelada (todos los repos completados produjeron ≥2 findings) | **NOT EXECUTED** (sin repo adecuado en la muestra; el código de la UI soporta la distinción — empty state de `report.page.html` + campo de cobertura) |
| Consistencia de datos del informe | Identidad del repositorio, SHA de commit, findings, severidad, dimensión, ruleId, evidencia, scores, cobertura, limitaciones preservados API→UI | El mapper es la única fuente para `/report`, `/findings`, `/recommendations`, `/facts` (todos usan el mismo `mapFinding`/`mapEvidence`); el JSON del informe E2E real coincidió con los campos exactos de `AnalysisResultResponse` que consumen el `AnalysisService` y `report.page` de Angular (snapshot.owner/name/commitSha, findings[].severity/category/confidence/ruleId/evidenceIds/recommendationIds, dimensionScores, coverage, limitations) | **PASS** | mapper.ts + informe E2E real + report.page.html |
| Baseline de accesibilidad | El teclado puede llegar a la interacción primaria; loading/error/éxito comprensibles; nombres accesibles; sin problema bloqueante | Página home: input de formulario + submit (focus/teclado nativos); página de progreso: `role="status" aria-live="polite"`, mensajes de estado terminales; página del report: `role="status"`/`role="alert"`, secciones etiquetadas (`aria-labelledby`), enlace back, botón retry; sin bloqueante obvio para el flujo central | **PASS** (baseline, por inspección; sin rediseño) | páginas home/progress/report |
| Baseline de seguridad | Sin tokens al frontend/respuestas de API/persistence; los errores no exponen secretos; el código se trata como datos; sin credenciales en artefactos | Los tests de regresión prueban que la API envía `Authorization: Bearer <GITHUB_TOKEN>` (y fallback `GH_TOKEN`) pero nunca lo devuelve; el E2E real afirma que no hay `Bearer`/`ghp_` en ninguna respuesta; los paths de error devuelven códigos/mensajes saneados (sin stack); el token solo se lee del entorno, nunca se registra/persiste; el código del repositorio se trata como datos | **PASS** | app.token.test.ts + aserciones E2E + security.md |

## 6. Ejecución E2E real

Ejecutado contra el servidor real del producto en `127.0.0.1:3199` (base de datos SQLite en `/tmp`), autenticado con la credencial del entorno, ejecuciones secuenciales.

### Análisis exitoso — `octocat/Hello-World`

```text
POST /analyses {"repositoryUrl":"https://github.com/octocat/Hello-World"}
→ 202 { id: "analysis-job:…", status: "queued" }
GET /analyses/:id (poll) → completed_with_limitations, resultAvailable=true,
    commitSha=7fd1a60b01f91b314f59955a4e4d4e80d8edf11d
GET /analyses/:id/report → 200
  snapshot: octocat / hello-world
  commitSha: 7fd1a60b…
  coverage: insufficient
  limitations: ["tree_segmented_acquisition", "Global score is intentionally not calculated in the MVP."]
  findings: 3 | evidence: 3 | recommendations: 3
  dimensionScores: {architecture:10, maintainability:10, testing:8.5,
                    documentation:10, dependencies:null, code_quality:9.5}
  confidence: low
```

- La dimensión `dependencies` es `null` (no un cero silencioso) — consistente con el invariante "null scores stay null / insufficient coverage does not become zero" de la Phase 22.
- No apareció ningún `Bearer`, `ghp_`, `Authorization` ni contenido de stack en ninguna respuesta.

### Límite de ingestion — `react/react` (post-fix)

```text
POST /analyses {"repositoryUrl":"https://github.com/react/react"} → 202
GET /analyses/:id (poll, ~50s) → failed, errorCode=SNAPSHOT_LIMIT_EXCEEDED
GET /analyses/:id/report → 404 { code: RESULT_NOT_AVAILABLE }
```

Resultado acotado controlado: el producto nunca presenta un snapshot parcial como completo, y el estado del job es consistente (`failed`, sin resultado).

### Cobertura parcial — `nodejs/node` (post-fix)

Con la credencial cableada, `nodejs/node` con `maxFileCount=50` **se completa** en ~30s con `completed_with_limitations` (cobertura `partial`), SHA de commit real `d6e67a5e…`, informe 200. El recorrido acotado de la Phase 21 mantiene su conteo de requests dentro de `maxApiRequests=125`, por lo que el snapshot se completa con limitaciones documentadas.

## 7. Resultados

Todos los escenarios centrales **PASS**. El único escenario NOT EXECUTED (cero findings) es una brecha de disponibilidad de muestra, no un defecto de producto: la UI ya distingue el estado de findings vacíos del fallo y de la cobertura insuficiente.

## 8. Defectos descubiertos

### Defecto 1 — el servidor de producción nunca usó la credencial de GitHub configurada (CORREGIDO)

- **Síntoma (reproducido):** la primera ejecución E2E real de límite de ingestion (`nodejs/node`) falló en 16s con `GITHUB_RATE_LIMITED`. Los runners de validación independientes (Phases 20–22) autenticaban bien, por lo que esto era específico del servidor del producto.
- **Causa raíz:** `applicationFrom()` en `apps/api/src/app.ts` construía `new GitHubRestClient()` **sin token**. `GitHubRestClient` solo acepta un token mediante `options.token` (no lee el entorno), por lo que el servidor de producción se ejecutaba **sin autenticación** contra la API de GitHub (≈60 req/h con límite no autenticado). El análisis de un usuario real de cualquier repositorio no trivial chocaría con ese límite casi de inmediato. Este es un defecto genuino de integración, no un resultado de recursos acotados.
- **Fix (mínimo):** `applicationFrom()` ahora resuelve la credencial server-side exactamente como los runners de la Phase 22 — `const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN` — y la pasa a `GitHubRestClient({ token })` (vacío/espacios en blanco → cliente no autenticado). El token se lee solo del entorno y nunca se registra, devuelve ni persiste. Se añadió un test seam opcional `githubFetch` a `BuildAppOptions` (defaults al `fetch` global; sin cambio de comportamiento de producción).
- **Tests de regresión:** `apps/api/src/app.token.test.ts` — (1) con `GITHUB_TOKEN` establecido, la primera solicitud del cliente de GitHub lleva `Authorization: Bearer <token>`; (2) cae a `GH_TOKEN` cuando `GITHUB_TOKEN` no está establecido.
- **Re-validación post-fix:** `react/react` ahora falla con el documentado `SNAPSHOT_LIMIT_EXCEEDED` (resultado acotado en `maxApiRequests=125`) en lugar de `GITHUB_RATE_LIMITED`; `nodejs/node` se completa con `completed_with_limitations`.

No se demostró ningún otro defecto. No se hicieron cambios de analyzer/scoring/límites de ingestion.

## 9. Correcciones aplicadas

- `apps/api/src/app.ts`: cablear `GITHUB_TOKEN ?? GH_TOKEN` en el `GitHubRestClient` de producción; añadir el test seam `githubFetch`.
- `apps/api/src/app.token.test.ts`: nueva suite de regresión (2 tests).

## 10. Limitaciones conocidas

- **Escenario de cero findings NOT EXECUTED** — ningún repositorio de la muestra produjo un conjunto de findings genuinamente vacío; el empty-state de la UI está implementado y verificado a nivel de código.
- **Sin E2E a nivel de navegador** — Playwright no está configurado; la validación del frontend es mediante unit tests de Angular + verificación del contrato de API contra el servidor real.
- **La cobertura es partial/insufficient en la mayoría de los repositorios** (snapshots acotados); el producto lo expone con honestidad, y sigue siendo una limitación de producto documentada (`maxApiRequests=125` vs `maxFileCount=50` para repositorios muy grandes — `react/react`, `vitejs/vite`).
- `react/react` y `vitejs/vite` no pueden completar un snapshot de 50 archivos dentro del presupuesto de requests; registrado, no "corregido" en esta fase.

## 11. Verificación de seguridad

- `GITHUB_TOKEN`/`GH_TOKEN` se leen del entorno, se pasan al cliente, nunca se imprimen, devuelven, persisten ni commitean (verificado por test de regresión + aserciones de respuesta E2E + escaneos de secretos de diffs/artefactos).
- Las respuestas de la API y los paths de error nunca incluyen stack traces, tokens ni detalles internos de implementación.
- El código del repositorio se trata estrictamente como datos; nunca se ejecuta; no se instalan dependencias de los repos analizados.
- Sin credenciales en ningún artefacto generado.

## 12. Baseline de accesibilidad

- Home: control de formulario + submit alcanzables por teclado; labels nativos; mensaje de validación inline.
- Progreso: `role="status"` `aria-live="polite"`; mensajes terminales comprensibles por estado de job.
- Report: `role="status"`/`role="alert"` para loading/error; secciones etiquetadas mediante `aria-labelledby`; enlaces back y botones retry; findings/evidence/recommendations son listas semánticas.
- Sin bloqueante obvio para el flujo central. (El pulido completo es la Phase 24.)

## 13. Conclusión final

**PASS WITH LIMITATIONS.**

> El flujo actual del producto MVP es demostrablemente funcional end-to-end: un usuario real puede enviar una URL de repositorio público de GitHub, la solicitud fluye a través de API → job → GitHub REST autenticado → ingestion acotada → analyzer determinista → scoring → persistence → report, y el frontend consume ese report correctamente (el análisis real de `octocat/Hello-World` se completó con un SHA de commit real, findings, evidencia, recomendaciones, dimension scores, cobertura y limitaciones, sin fuga de credenciales).

Limitaciones: E2E a nivel de navegador no configurado; repo de cero findings no ejercitado (brecha de muestra); la ingestion acotada implica cobertura parcial en la mayoría de los repos y `SNAPSHOT_LIMIT_EXCEEDED` en repositorios muy grandes — todo expuesto con honestidad. Se encontró un defecto genuino de producción (cableado de credenciales ausente), se corrigió de forma mínima y se cubrió con tests de regresión.

## 14. Recomendación para la Phase 24

Avanzar a **pulido de UX + documentación + portfolio**:

- Pulido de UX: hacer más claros para el usuario final los estados de cobertura parcial/insuficiente y `SNAPSHOT_LIMIT_EXCEEDED` (p. ej. mensaje explícito "el análisis no pudo incluir todos los archivos"); refinar la visualización de score null del report.
- Documentación: quick-start del README (incluida la configuración server-side de `GITHUB_TOKEN`/`GH_TOKEN`, que la Phase 23 demostró que es necesaria para análisis reales), notas de despliegue.
- Opcional: configurar E2E de navegador (Playwright) para el flujo central como infraestructura de regresión futura.
- No se recomienda ningún cambio de analyzer/scoring/límites de ingestion a partir de la evidencia de esta fase.

---

*Estado de la Phase 23: **PASS WITH LIMITATIONS**. E2E real ejecutado contra el producto en repositorios públicos reales de GitHub; un defecto de integración corregido con tests de regresión; todos los quality gates en verde.*
