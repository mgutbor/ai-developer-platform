# Portfolio — Engineering highlights

El propósito de este documento es comunicar el valor de ingeniería del MVP de forma factual. No es material de marketing: describe decisiones, restricciones y evidencia reales. El MVP actual es **determinista**; no se hace ninguna afirmación de "inteligencia artificial" sobre el análisis base.

## Qué demuestra el proyecto

### 1. Análisis determinista en lugar de AI opaca

- El analyzer es un paquete puro (`packages/analyzer`) que produce facts, metrics, evidence, findings y recommendations de forma determinista a partir de un snapshot.
- Mismo commit + mismas reglas → mismo resultado (reproducibilidad verificada en las fases 13–22).
- La AI es opcional, aislada (`packages/ai`) y nunca modifica el análisis determinista.

### 2. Ingestión de recursos acotada

- `maxFileCount`, `maxApiRequests`, `maxTotalBytes`, `maxFileBytes`, `maxJsonResponseBytes` y timeouts explícitos definen el presupuesto.
- Selección determinista y priorizada de archivos (metadata → CI → source → tests → docs) con caps por tier.
- Traversal segmentado de árboles GitHub por SHA de tree (Phase 21) que evita descargar árboles monolíticos de 17–18 MB.
- Terminación temprana que preserva exactamente la semántica de selección existente, con tests de equivalencia.
- Los límites se comunican en el producto: cobertura `partial`/`insufficient` y `SNAPSHOT_LIMIT_EXCEEDED` para repositorios muy grandes.

### 3. Findings basados en evidencia

- Cada finding enlaza evidencia trazable: path, rango y referencia de evidencia.
- Los absence-based findings distinguen "no detectado en el snapshot" de "ausente".
- Evidencia sin contenido completo: se persisten hashes y referencias, no blobs del repositorio.

### 4. Reproducibilidad y anclaje a commit

- El snapshot se fija a un commit SHA inmutable antes de analizar.
- Dataset de ground-truth congelado con SHAs exactos (`docs/phase-22-ground-truth-dataset.md`) y runner determinista (`apps/api/src/validate-ground-truth.ts`).
- Resultados reproducibles del benchmark (Phases 20–21) con requests/bytes/latencia medidos.

### 5. Separación clara de responsabilidades

- `contracts` → `domain` → `github` → `analyzer` → `scoring` → `persistence` → `api` → `web`.
- Fronteras verificadas automáticamente (`pnpm check:architecture`): el dominio no conoce infraestructura; el analyzer no conoce GitHub; `web` solo consume contratos.

### 6. Fronteras de seguridad

- Solo repositorios públicos; sin ejecución de código del repositorio analizado.
- Protección SSRF, redirects seguros, traversal/symlink/submodule, límites de red y sanitización de errores.
- Credenciales GitHub server-side únicamente; nunca en frontend, respuestas, SQLite o logs (regresión cubierta en Phase 23).

### 7. Validación con evidencia real

- Phase 22: 25 findings clasificados manualmente (7 TP, 0 FP, 2 uncertain, 16 not-evaluable) con conclusión honesta: muestra insuficiente para precisión/recall defendibles.
- Phase 23: validación E2E del producto real contra repositorios públicos (éxito, URL inválida, 404, límite de ingestion, cobertura parcial, consistencia API↔UI, seguridad) → `PASS WITH LIMITATIONS`.
- Las limitaciones se documentan, no se ocultan.

## Trade-offs arquitectónicos documentados

- **Runner in-process (concurrency 1)** en lugar de workers/colas: simple y suficiente para el MVP; limita el rendimiento y se documenta como futuro.
- **Snapshot acotado** en lugar de clonar/repositorio completo: seguro y determinista; cubre los repositorios más relevantes pero excluye árboles muy grandes.
- **Score dimensional sin score global**: evita una métrica agregada engañosa; las dimensiones con datos insuficientes permanecen `null`.
- **Evidencia por hash/referencia** en lugar de almacenar contenido: minimiza la superficie de datos; limita la inspección humana de findings de seguridad.
- **Sin E2E de navegador** en el MVP: la validación del frontend usa tests unitarios + contrato API verificado contra el servidor real.

## Métricas del proyecto

- 9 packages (contracts, domain, github, analyzer, scoring, persistence, ai, api, web), 8 workspaces con tests.
- 79 tests automatizados (domain, github, analyzer, scoring, persistence, ai, api, web), 0 fallos en los quality gates.
- 16 ADRs (`docs/adr/`).
- 25 findings del ground-truth congelado revisados y clasificados.
- 15 repositorios en el benchmark de la fase 20; 8 en el dataset de ground-truth congelado.
- 45 escenarios (15×3) en el benchmark Phase 20; 2 repositorios muy grandes resueltos con traversal segmentado (Phase 21).

## Limitaciones honestas

- Solo repositorios públicos; sin autenticación de usuarios.
- Cobertura `partial`/`insufficient` para la mayoría de los repositorios; `SNAPSHOT_LIMIT_EXCEEDED` para `react/react` y `vitejs/vite`.
- Sin ground-truth humano suficiente para declarar precisión/recall del analyzer (Phase 22).
- La interpretación AI no se validó en vivo (sin credenciales de provider).
- Sin E2E de navegador (Playwright) configurado.
