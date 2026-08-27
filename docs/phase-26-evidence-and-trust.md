# Phase 26 — Evidence & Trust

## 1. Problema

La auditoría de producto v1.0.0 (`docs/product-audit-v1.0.0.md`) identificó tres problemas de confianza:

1. **Evidence no verificable** — la `evidence` de cada finding contenía únicamente `excerptHash` (hash interno de `snapshotId|path|ruleId|line`). `redactedExcerpt` nunca se generaba. Un developer no podía entender *por qué* existía un finding: WHAT → referencia interna, no WHAT → WHY → WHERE → HOW.
2. **Absence-based ambiguo** — "Test files were not detected" podía leerse como "no existen tests en el repositorio" cuando en realidad significaba "no se detectaron en la porción inspeccionada del snapshot".
3. **Falsa precisión** — `confidence: high` con `coverage: partial/insufficient` sugería más certeza de la que la evidencia permitía.

## 2. Estado anterior

| Aspecto | Antes de Phase 26 |
|---|---|
| `Finding.evidenceStatus` | No existía. Solo `confidence` (high/medium/low) y texto. |
| `Evidence` | `excerptHash` + `location` opcional. `redactedExcerpt` nunca se rellena. |
| Scope de inspección | `IngestionResult.metadata` (`selectedFileCount`, `treeEntriesSeen`, `totalBytes`) existía pero **se perdía**: el analyzer no lo recibía ni lo exponía. |
| Frontend | Mostraba el hash como "evidence reference" y no distinguía absence de not-inspected. |

## 3. Diseño

Contrato de evidence orientado al developer, con **cuatro** estados semánticos:

| Estado | Significado | Ejemplo |
|---|---|---|
| `verified` | Existe evidencia concreta observada (presencia, con path). | "TypeScript strict mode is disabled" en `tsconfig.json` |
| `absence_based` | Ausencia detectada **dentro del scope inspeccionado**; no prueba ausencia en todo el repositorio. | "Test files were not detected" |
| `not_inspected` | Los archivos relevantes no estaban en el snapshot; **no se puede afirmar ausencia**. | "TypeScript strictness was not verified" |
| `not_verified` | Heurística que no pudo verificarse con los datos disponibles. | "A relative import could not be resolved statically" |

Regla principal: **el producto nunca sugiere más evidencia de la que posee.** Cuando no se sabe algo, se dice "no lo sé" en lugar de convertir la falta de evidencia en una afirmación.

Además, se añade `inspectedScope` al resultado: `{ fileCount, treeEntriesSeen, totalBytes }`, fluyendo ingestion → analyzer → scoring → persistence → API → frontend.

## 4. Implementación

### Dominio (`packages/domain`)
- `FindingEvidenceStatus = 'verified' | 'absence_based' | 'not_inspected' | 'not_verified'`.
- `InspectedScope = { fileCount, treeEntriesSeen, totalBytes }`.
- `Finding.evidenceStatus?` y `AnalysisResult.inspectedScope?` — **opcionales** para backward compatibility (resultados viejos siguen funcionando).
- `createFinding` valida el enum; `createAnalysisResult` valida `inspectedScope` (enteros no negativos).

### Analyzer (`packages/analyzer`)
- `AnalyzerInput.inspectedScope?` — el adapter de la API lo construye desde `IngestionResult.metadata`.
- Cada regla declara su `evidenceStatus` explícito:
  - `AN-TEST-001/002`, `AN-TOOL-001`, `AN-DOC-001`, `AN-DEP-001` (lockfile ausente) → `absence_based`.
  - `AN-CQ-002` (tsconfig no verificado por ausencia de tsconfig en snapshot) → `not_inspected`.
  - `AN-ARCH-002` (resolución estática fallida) → `not_verified`.
  - `AN-CQ-004`, `AN-CQ-005` (presencia observada con path) → `verified`.
- Default en `createFindingBundle`: con `sourcePath` → `verified`; sin path → `absence_based`.
- `analyze()` propaga `inspectedScope` al resultado.

### Scoring y persistence
- `scoreAnalysis` reconstruye el resultado — ahora **preserva** `inspectedScope` (se perdía).
- `SqlitePersistence.findResultById` reconstruye el resultado — ahora **preserva** `inspectedScope` (se perdía).

### API (`apps/api`, `packages/contracts`)
- `ApiFindingEvidenceStatus` y `ApiInspectedScope` en el contrato.
- `ApiFinding.evidenceStatus?` y `AnalysisResultResponse.inspectedScope?` — opcionales.
- `app.ts` adapter: `IngestionResult.metadata` → `inspectedScope` del input del analyzer.
- `mapper.ts` mapea ambos campos.

### Frontend (`apps/web`)
- Badge por finding: `Verified evidence` / `Based on inspected scope` / `Not enough information` / `Not verified`, cada uno con su explicación en lenguaje llano.
- El hash deja de ser la evidencia principal: sin location se muestra "reference-only evidence".
- Línea de scope en el reporte: "Inspected N file(s) out of M tree entries. This is a partial snapshot, not a complete repository analysis." (cuando `coverage !== complete`).

## 5. Decisiones

- **No se exponen excerpts.** El analyzer nunca genera `redactedExcerpt`; la evidencia sigue siendo hash + location. STEP 7 (seguridad) se cumple por diseño: no se añadió ninguna exposición nueva de contenido. Es preferible evidencia limitada y honesta que evidencia potencialmente peligrosa.
- **Backward compatibility:** ambos campos son opcionales; consumidores antiguos no se rompen.
- **Confidence no se cambió** en el algoritmo (no se toca scoring salvo preservación de `inspectedScope`); la corrección de interpretación se hace en presentación: el badge de evidencia y la línea de scope contextualizan `high` cuando la cobertura es parcial.
- **Límites:** no se tocó `maxApiRequests`, `maxFileCount`, `maxTotalBytes`, timeouts ni ninguna regla de análisis.

## 6. Tests

Nuevos y actualizados (suite completa verde):

| Paquete | Resultado |
|---|---|
| domain | 15 (incl. validación de `evidenceStatus`) |
| analyzer | 19 (incl. clasificación verified/absence_based/not_inspected/not_verified por regla + propagación de `inspectedScope`) |
| scoring | 4 (incl. preservación de `inspectedScope` a través de scoring) |
| persistence | 3 (incl. round-trip de `inspectedScope` en SQLite) |
| api | 9 (incl. test E: `evidenceStatus` + `inspectedScope` fluyen del pipeline al report) |
| web | 22 (incl. 5 nuevos del helper `evidenceStatusLabel`) |
| github | 25 (sin cambios) |
| ai | 4 (sin cambios) |

Cobertura de los casos requeridos:

- **Caso A (evidence verificable):** `AN-CQ-005` → `verified`, con path.
- **Caso B (absence + partial):** reglas absence-based → `absence_based`; el texto del frontend dice "does not prove the element is absent from the whole repository".
- **Caso C (not inspected):** `AN-CQ-002` sin tsconfig → `not_inspected` (falta de información ≠ ausencia).
- **Caso D (secret redaction):** no se añade ningún excerpt; el test existente `does not persist sensitive source content in evidence` sigue pasando.
- **Caso E (API ↔ UI):** pipeline test verifica `evidenceStatus` e `inspectedScope` en el report endpoint; los tests web consumen exactamente ese contrato.
- **Caso F (backward compat):** ambos campos opcionales; tests existentes de todos los paquetes pasan sin cambios de comportamiento.

## 7. E2E de producto

Ejecución real contra `octocat/Hello-World` **sin token** (flujo HTTP completo con el producto real, release v1.0.0 + cambios de Phase 26):

- La cuota anónima de GitHub estaba agotada (0/60) al inicio de la fase, resultado del experimento de validación anónima previo.
- El intento E2E produjo el **comportamiento controlado esperado**: job `failed` con `errorCode: GITHUB_RATE_LIMITED`, `resultAvailable: false`, report `RESULT_NOT_AVAILABLE` — sin hang, sin fuga de credenciales, estado persistido.
- Según STEP 10, **no se espera deliberadamente a resets de GitHub**. El E2E exitoso completo (GitHub → report con badges de evidencia) se reintentará si la cuota se restablece antes del cierre de la fase; en caso contrario, la cadena evidencia/finding/API/frontend queda validada por el test E (pipeline API) + tests web deterministas, que ejercitan exactamente el mismo código que el flujo real salvo la llamada de red a GitHub.

**Gap observado:** en esta ejecución no pudo demostrarse el reporte final completo con badges en el frontend contra GitHub real por la cuota agotada. Es una limitación operativa del entorno (IP anónima compartida), no del producto.

## 8. Resultados

- `evidenceStatus` presente y semánticamente correcto en los 4 estados por regla.
- `inspectedScope` fluye correctamente de principio a fin (verificado por tests de scoring, persistence y pipeline API — se encontraron y corrigieron dos puntos de pérdida: `scoreAnalysis` y `findResultById`).
- Frontend distingue visualmente verified / absence-based / not-inspected / not-verified y muestra el scope de inspección.
- Backward compatibility verificada: toda la suite existente pasa.

## 9. Developer Trust Test (antes/después, 1–5)

| Dimensión | Antes (auditoría v1.0.0) | Después (Phase 26) | Cambio |
|---|---|---|---|
| Claridad del finding | 2 | 4 | Badge + explicación por finding |
| Verificabilidad | 1 | 3 | Se declara explícitamente qué se verificó y qué no |
| Comprensión de coverage | 2 | 4 | Línea de scope explícita ("partial snapshot, not a complete repository analysis") |
| Comprensión de absence-based | 1 | 4 | "Based on inspected scope — does not prove the element is absent" |
| Confianza en el resultado | 2 | 3 | `not_inspected`/`not_verified` ya no se presentan como afirmaciones |
| Accionabilidad | 3 | 3 | Sin cambios (no era el foco) |

La verificabilidad sigue limitada (3/5) porque el producto **no expone contenido** (por seguridad): sigue siendo hash + location, pero ahora la semántica de cada estado es explícita y no puede confundirse con evidencia de presencia.

## 10. Limitaciones

- La evidencia sigue sin exponer excerpt de contenido: un developer no puede inspeccionar el código exacto que motivó el finding sin acceder al repositorio. Es una decisión deliberada de seguridad.
- El E2E exitoso contra GitHub real no pudo ejecutarse por la cuota anónima agotada (no se esperó deliberadamente).
- `confidence` no cambió de algoritmo; la corrección de interpretación es de presentación.
- Resultados de análisis anteriores (persistidos) no tienen `evidenceStatus`/`inspectedScope`; el frontend los muestra como "Evidence unknown" / sin línea de scope.

## 11. Estado final

- **Veredicto: PASS WITH LIMITATIONS.** La mejora es sustancial y verificada por tests: el developer puede distinguir qué se sabe, qué evidencia lo respalda, qué se inspeccionó y qué NO puede concluirse. Quedan limitaciones conocidas (sin excerpts por seguridad; E2E real pendiente de cuota).
- No se añadieron reglas, AI, global score, ni features ajenas a evidence/trust.
- No se modificaron límites ni ingestion.
