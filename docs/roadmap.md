# Roadmap refinado

El roadmap se reorganiza alrededor de un vertical slice determinista. La IA y la infraestructura distribuida quedan condicionadas a evidencia de valor y carga.

## Phase 1 — Foundation

**Objective:** crear una base TypeScript mínima y reproducible.

**Scope:** monorepo con `apps/web`, `apps/api` y solo los packages que tengan ownership real; Angular, configuración, lint, format, tests y configuración tipada.

**Dependencies:** ninguna.

**Acceptance criteria:** instalación limpia, checks locales documentados, build de web/API y un contrato mínimo compartido; no hay packages vacíos ni infraestructura innecesaria.

**Definition of Done:** tipos, lint, unit tests, build, README y ADR-008/ADR-007 visibles donde corresponda.

## Phase 2 — Domain and report contracts

**Objective:** definir el lenguaje mínimo del report.

**Scope:** paquete `domain` puro con `RepositorySnapshot`, `Fact`, `Metric`, `Evidence`, `Finding`, `Recommendation`, `DimensionScore` y `AnalysisResult`; contratos API serializables y factories validadas. `AnalysisJob` queda fuera hasta que exista su lifecycle real.

**Dependencies:** Phase 1.

**Acceptance criteria:** invariantes y estados inválidos se rechazan; evidence referencia snapshot/path; contracts distinguen observación, problema y acción; los tests cubren referencias huérfanas, snapshots cruzados, rutas inseguras, incertidumbre y scores nulos.

**Definition of Done:** unit tests de dominio, compilación de contracts, documentación de modelo y ADR-014 aceptado.

## Phase 3 — GitHub REST ingestion

**Objective:** obtener snapshots públicos, acotados y reproducibles.

**Scope:** package `github` framework-independent, URL/ref validation, repository metadata, branch-to-SHA resolution, tree, blobs textuales, limits, safe path/encoding handling y GitHub errors. No endpoint HTTP todavía.

**Dependencies:** Phase 2.

**Acceptance criteria:** mismo commit produce el mismo snapshot lógico; no se siguen symlinks peligrosos; no se descargan archives ni se ejecuta contenido; repositories fuera de límites terminan con limitación explícita.

**Definition of Done:** tests deterministas unitarios/security, fixture client sin red, documentación de límites, ADR-015 aceptado y quality gates verdes.

## Phase 4 — TypeScript/JavaScript deterministic analyzer

**Status:** completada.

**Objective:** producir facts, metrics y findings útiles sin IA.

**Scope:** imports y estructura, tests, docs, dependencies, lint/format/typecheck, CI/CD, detección de Angular/React/Node.js y reglas de maintainability simples.

**Dependencies:** Phase 3.

**Acceptance criteria:** fixtures Tier 1 generan resultados estables y evidence verificable; otros lenguajes se marcan como limitados; no se ejecutan scripts del repository.

**Definition of Done:** `packages/analyzer` puro, tests unitarios/regression, performance sanity, boundary check, reglas documentadas y ADR-011 alineado. PASS.

## Phase 5 — Deterministic report and SQLite job lifecycle

**Status:** completada.

**Objective:** convertir el analyzer en un flujo consultable completo.

**Scope:** runner dentro de API, states, idempotency, SQLite adapter, deterministic scoring, recommendations, retention y API de lectura.

**Dependencies:** Phase 2, 3 y 4.

**Acceptance criteria:** se puede crear un analysis, consultar estado y leer report; reinicio y duplicación tienen comportamiento definido; no se almacenan blobs completos; `insufficient_data` es visible.

**Definition of Done:** integration/contract tests, límites de concurrencia, cleanup test, persistencia restart, documentación y ADR-016 alineado. PASS.


## Phase 6 — Angular report experience

**Objective:** demostrar valor al usuario mediante un flujo accesible.

**Scope:** repository input, progress, report summary, dimensions, findings, evidence y recommendations.

**Dependencies:** Phase 5.

**Acceptance criteria:** el flujo principal funciona únicamente contra la API; loading/error/partial/empty states existen; teclado, focus, labels y lector de pantalla son utilizables; no hay dashboard ornamental.

**Definition of Done:** component/integration/E2E/accessibility tests, build y revisión de UX.

## Phase 7 — MVP validation and hardening

**Objective:** medir si el producto aporta valor y cerrar riesgos del primer release.

**Scope:** muestra pequeña de repositories, false-positive review, rate limiting, observabilidad mínima, redaction, dependency audit, secret scanning y retención.

**Dependencies:** Phase 6.

**Acceptance criteria:** reproducibility medida, completion rate medida, evidence coverage medida, límites comunicados, fallo de GitHub controlado y datos expirados eliminados.

**Definition of Done:** CI completa, security/accessibility gates, runbook breve, métricas de éxito y riesgos publicados.

## Phase 8 — AI assessment (conditional)

**Objective:** comprobar si la IA añade valor semántico sobre resultados deterministas.

**Scope:** un único provider, `AIProvider` mínimo, selección de contexto, prompt versionado, structured output, validation y `aiAssessment` separada.

**Dependencies:** Phase 7 y evidencia de que el report determinista tiene valor.

**Acceptance criteria:** la IA referencia evidence existente, no modifica el score determinista, falla con fallback limpio y sus resultados se evalúan mediante muestra manual.

**Definition of Done:** unit/integration/contract/security tests, prompt-injection tests, coste/latencia medidos y nuevo ADR si se combinan scores.

## Phase 9 — Operational scaling (conditional)

**Objective:** extraer componentes solo ante señales medibles.

**Scope:** worker independiente, PostgreSQL, cola, multiinstancia o realtime únicamente si completion rate, duración, concurrencia o disponibilidad lo requieren.

**Dependencies:** métricas de MVP y decisión explícita.

**Acceptance criteria:** la extracción mantiene contracts y dominio, tiene rollback y mejora una métrica operativa concreta.

**Definition of Done:** load tests, migration plan, observabilidad, security review y ADR de la extracción.
