# Roadmap refinado

El roadmap se reorganiza alrededor de un vertical slice determinista. La IA y la infraestructura distribuida quedan condicionadas a evidencia de valor y carga.

## Phase 1 — Fundamentos

**Objetivo:** crear una base TypeScript mínima y reproducible.

**Alcance:** monorepo con `apps/web`, `apps/api` y solo los packages que tengan ownership real; Angular, configuración, lint, format, tests y configuración tipada.

**Dependencias:** ninguna.

**Criterios de aceptación:** instalación limpia, checks locales documentados, build de web/API y un contrato mínimo compartido; no hay packages vacíos ni infraestructura innecesaria.

**Definition of Done:** tipos, lint, unit tests, build, README y ADR-008/ADR-007 visibles donde corresponda.

## Phase 2 — Contratos de dominio y report

**Objetivo:** definir el lenguaje mínimo del report.

**Alcance:** paquete `domain` puro con `RepositorySnapshot`, `Fact`, `Metric`, `Evidence`, `Finding`, `Recommendation`, `DimensionScore` y `AnalysisResult`; contratos API serializables y factories validadas. `AnalysisJob` queda fuera hasta que exista su lifecycle real.

**Dependencias:** Phase 1.

**Criterios de aceptación:** invariantes y estados inválidos se rechazan; evidence referencia snapshot/path; contracts distinguen observación, problema y acción; los tests cubren referencias huérfanas, snapshots cruzados, rutas inseguras, incertidumbre y scores nulos.

**Definition of Done:** unit tests de dominio, compilación de contracts, documentación de modelo y ADR-014 aceptado.

## Phase 3 — Ingestion REST de GitHub

**Objetivo:** obtener snapshots públicos, acotados y reproducibles.

**Alcance:** package `github` framework-independent, URL/ref validation, repository metadata, branch-to-SHA resolution, tree, blobs textuales, limits, safe path/encoding handling y GitHub errors. No endpoint HTTP todavía.

**Dependencias:** Phase 2.

**Criterios de aceptación:** mismo commit produce el mismo snapshot lógico; no se siguen symlinks peligrosos; no se descargan archives ni se ejecuta contenido; repositories fuera de límites terminan con limitación explícita.

**Definition of Done:** tests deterministas unitarios/security, fixture client sin red, documentación de límites, ADR-015 aceptado y quality gates verdes.

## Phase 4 — Analyzer determinista TypeScript/JavaScript

**Estado:** completada.

**Objetivo:** producir facts, metrics y findings útiles sin IA.

**Alcance:** imports y estructura, tests, docs, dependencies, lint/format/typecheck, CI/CD, detección de Angular/React/Node.js y reglas de maintainability simples.

**Dependencias:** Phase 3.

**Criterios de aceptación:** fixtures Tier 1 generan resultados estables y evidence verificable; otros lenguajes se marcan como limitados; no se ejecutan scripts del repository.

**Definition of Done:** `packages/analyzer` puro, tests unitarios/regression, performance sanity, boundary check, reglas documentadas y ADR-011 alineado. PASS.

## Phase 5 — Report determinista y ciclo de vida del job en SQLite

**Estado:** completada.

**Objetivo:** convertir el analyzer en un flujo consultable completo.

**Alcance:** runner dentro de API, states, idempotency, SQLite adapter, deterministic scoring, recommendations, retention y API de lectura.

**Dependencias:** Phase 2, 3 y 4.

**Criterios de aceptación:** se puede crear un analysis, consultar estado y leer report; reinicio y duplicación tienen comportamiento definido; no se almacenan blobs completos; `insufficient_data` es visible.

**Definition of Done:** integration/contract tests, límites de concurrencia, cleanup test, persistencia restart, documentación y ADR-016 alineado. PASS.


## Phase 6 — Experiencia de report en Angular

**Estado:** completada con baseline de accesibilidad y tests de componentes; axe automatizado y browser E2E quedan explícitamente diferidos.

**Objetivo:** demostrar valor al usuario mediante un flujo accesible.

**Alcance:** repository input, progress, report summary, dimensions, findings, evidence y recommendations.

**Dependencias:** Phase 5.

**Criterios de aceptación:** el flujo principal funciona únicamente contra la API; loading/error/partial/empty states existen; teclado, focus, labels y lector de pantalla son utilizables; no hay dashboard ornamental.

**Definition of Done:** component/integration/E2E/accessibility tests, build y revisión de UX.

## Phase 7 — Validación y endurecimiento del MVP

**Estado:** completada como validación controlada del MVP; la ampliación de observabilidad pública y el runbook operativo quedan para hardening posterior.

**Objetivo:** medir si el producto aporta valor y cerrar riesgos del primer release.

**Alcance:** muestra pequeña de repositories, false-positive review, rate limiting, observabilidad mínima, redaction, dependency audit, secret scanning y retención.

**Dependencias:** Phase 6.

**Criterios de aceptación:** reproducibility medida, completion rate medida, evidence coverage medida, límites comunicados, fallo de GitHub controlado y datos expirados eliminados.

**Definition of Done:** CI completa, security/accessibility gates, runbook breve, métricas de éxito y riesgos publicados.

## Phase 8 — Evaluación de AI

**Estado:** implementación inicial completada con fake provider, provider OpenAI preparado, contexto limitado y validación estructurada. Live provider validation queda diferida sin credenciales configuradas.

**Objetivo:** comprobar si la IA añade valor semántico sobre resultados deterministas.

**Alcance:** un único provider, `AIProvider` mínimo, selección de contexto, prompt versionado, structured output, validation y `aiAssessment` separada.

**Dependencias:** Phase 7 y evidencia de que el report determinista tiene valor.

**Criterios de aceptación:** la IA referencia evidence existente, no modifica el score determinista, falla con fallback limpio y sus resultados se evalúan mediante muestra manual.

**Definition of Done:** unit/integration/contract/security tests, prompt-injection tests, coste/latencia medidos y nuevo ADR si se combinan scores.

## Phase 9 — Evaluación y endurecimiento de AI

**Estado:** completada con fake-provider evaluation, regresión determinista, validación de fallos, límites del provider, rate limiting local y decisión `KEEP WITH LIMITATIONS`. Live quality/cost validation queda pendiente sin credenciales.

**Objetivo:** medir utilidad, coste, latencia y seguridad antes de extender la capa AI.

**Alcance:** dataset reproducible, criterios de factualidad/traceability, failure modes, prompt injection, rate limiting y documentación measured/estimated/not validated.

**Dependencias:** Phase 8.

**Criterios de aceptación:** el report determinista permanece idéntico; referencias inválidas se rechazan; provider failure no rompe el report; costes/latencias no se inventan; decisión de producto documentada.

## Phase 10 — Revisión final del MVP y preparación del release

**Estado:** completada. El MVP queda preparado para una release global `v1.0.0` con limitaciones explícitas.

**Objetivo:** revisar producto, arquitectura, seguridad, documentación y criterios de release sin añadir funcionalidades.

**Resultado:** recomendación `READY WITH LIMITATIONS`; arquitectura congelada para el MVP y E2E/browser audit, AI live validation y operación distribuida permanecen no validados.

## Phase 12 — Ejecución del release v1.0.0

**Estado:** completada. Tag `v1.0.0` publicado en `origin`; verificación post-release realizada.

## Phase 13 — Validación de producto y evaluación en el mundo real

**Estado:** completada con un benchmark sobre repositories públicos reales (`Hello-World`, `type-fest`, `express`, `angular`, `react`).

**Resultado:** el pipeline funciona end-to-end, pero la validación detectó falsos positivos en `AN-SEC-003` (expresiones `${{ secrets.* }}` y fixtures demo), starving de metadata raíz en la selección de archivos, imposibilidad de ingerir `facebook/react` por redirect canónico de GitHub, y scores que pueden malinterpretarse en snapshots truncados. Detalles en `docs/phase-13-product-validation.md`.

**Recomendación para Phase 14:** recalibrar `AN-SEC-003`, priorizar metadata raíz en la selección, manejar redirects canónicos de GitHub y repetir el benchmark. No se justifica infraestructura nueva.

## Phase 14 — Exactitud del analyzer y fiabilidad de la ingestion

**Estado:** completada.

**Objetivo:** corregir los tres defectos de mayor impacto medidos en Phase 13 y demostrar regresión.

**Implementado:**

- `AN-SEC-003` recalibrada por tiers (`committed` high, `possible` medium, `placeholder` low, `demo` low); las expresiones de GitHub Actions (`${{ secrets.* }}`, `${{ github.token }}`, `${{ env.* }}`, `${{ vars.* }}`) ya no generan findings.
- Selección de archivos priorizada y determinista (metadata raíz → CI/tooling → fuente → tests → resto) con los mismos límites de ingestion.
- Redirects canónicos de GitHub seguidos de forma segura (HTTPS + allowlist + límite de hops + revalidación); `facebook/react` ya se puede analizar bajo su identidad canónica `react/react`.
- Scores dimensionales declaran explícitamente cuando el snapshot es parcial.
- Regresiones específicas para secretos, selección, redirects, coverage y detección Angular.

**Evidencia:** benchmark antes/después en `docs/phase-14-validation.md`. No se introdujo infraestructura nueva.

## Phase 15 — Escalado operativo (condicional)

**Objetivo:** extraer componentes solo ante señales medibles.

**Alcance:** worker independiente, PostgreSQL, cola, multiinstancia o realtime únicamente si completion rate, duración, concurrencia o disponibilidad lo requieren.

**Estado:** sin extraer; Phase 13 no aportó evidencia que lo justifique.

**Dependencias:** métricas de MVP y decisión explícita.

**Criterios de aceptación:** la extracción mantiene contracts y dominio, tiene rollback y mejora una métrica operativa concreta.

**Definition of Done:** load tests, migration plan, observabilidad, security review y ADR de la extracción.

## Phase 16 — Evaluación en el mundo real (ampliada)

**Estado:** completada. `docs/phase-16-real-world-evaluation.md`.

## Phase 17 — Evaluación de desarrolladores

**Estado:** completada. `docs/phase-17-developer-evaluation.md`.

## Phase 18 — Validación final del producto

**Estado:** completada. `docs/phase-18-final-product-validation.md`.

## Phase 19 — Preparación del benchmark autenticado

**Estado:** completada. `docs/phase-19-authenticated-benchmark.md`.

## Phase 20 — Ejecución del benchmark autenticado

**Estado:** completada con limitaciones. Benchmark autenticado 15×3; `docs/phase-20-authenticated-benchmark.md` y `docs/phase-20.1-benchmark-failure-analysis.md`. Se confirmó que repositorios con árboles muy grandes superan `maxJsonResponseBytes=4 MiB`.

## Phase 21 — Ingestión de repositorios grandes

**Estado:** completada con limitación documentada. Traversal segmentado de árboles GitHub por SHA de tree con terminación temprana que preserva la semántica de selección; `docs/phase-21-large-repository-ingestion.md`. Se corrigió además un artefacto `dist` desactualizado.

## Phase 22 — Validación ground-truth

**Estado:** cerrada con `KEEP WITH LIMITATIONS`. Dataset congelado de 8 repositorios, 25 findings clasificados (7 TP / 0 FP / 2 uncertain / 16 not-evaluable); muestra insuficiente para precisión/recall defendibles. `docs/phase-22-final-results.md`.

## Phase 23 — Validación E2E + de producto

**Estado:** cerrada con `PASS WITH LIMITATIONS`. Validación E2E real contra repositorios públicos; se corrigió el wiring de `GITHUB_TOKEN`/`GH_TOKEN` en el servidor de producción con tests de regresión. `docs/phase-23-e2e-product-validation.md`.

## Phase 24 — Pulido de UX + documentación + portfolio

**Estado:** cerrada con `PASS`. Mensajería clara de estados/limitaciones/cobertura, README, docs de arquitectura y portfolio. `docs/phase-24-ux-documentation-portfolio.md`.

## Phase 25 — Release v1.0 (MVP final)

**Estado:** completada. Release v1.0.0 con tag `v1.0.0` apuntando al commit final del MVP; `docs/release-readiness.md` y `docs/release-notes-v1.0.0.md`. Fin del MVP.
