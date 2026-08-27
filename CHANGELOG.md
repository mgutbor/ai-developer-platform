# Changelog

Todos los cambios notables de este proyecto quedan documentados aquí.

## [1.0.0] — 2026-08-27

### Añadido

- Validación de URL de repositorios públicos de GitHub e ingestión REST acotada.
- Adquisición segmentada del Git-tree para repositorios grandes con terminación temprana que preserva la semántica (Phase 21).
- Snapshots de repositorio reproducibles anclados a un commit SHA inmutable.
- Análisis determinista de TypeScript y JavaScript (18 reglas).
- Findings y recomendaciones respaldados por evidencia.
- Puntuación dimensional determinista sin puntuación global.
- Ciclo de vida de `AnalysisJob` en proceso con persistencia SQLite y limpieza por retención.
- API de reporte Fastify y experiencia de reporte en Angular.
- Estados claros orientados al usuario: loading, completed, completed-with-limitations, failed con motivo específico, snapshot-limit-exceeded, cobertura insuficiente, findings vacíos (Phase 24).
- Interpretación asistida por AI opcional con contexto acotado, salida estructurada y referencias validadas.
- Fronteras de seguridad para SSRF, path traversal, contenido no confiable del repositorio e inyección de prompts.
- Cableado de credenciales GitHub server-side (`GITHUB_TOKEN`/`GH_TOKEN`) para la API de producción (fix de la Phase 23) con tests de regresión.
- Checks de calidad automatizados, fixtures deterministas y documentación de validación.

### Validado

- Phase 22 — validación ground-truth: dataset congelado de 8 repositorios, 25 findings clasificados por humanos (7 TP, 0 FP, 2 uncertain, 16 not-evaluable); muestra insuficiente para una precisión/recall defendible; decisión `KEEP WITH LIMITATIONS`.
- Phase 23 — validación E2E real del producto contra repositorios públicos (éxito, URL inválida, no encontrado, límite de ingestión, cobertura parcial, consistencia API↔UI, línea base de seguridad); decisión `PASS WITH LIMITATIONS`.
- Phase 24 — pulido de UX/documentación/portfolio; decisión `PASS`.
- Suite completa de quality gates en verde (install, architecture, format, lint, typecheck, 92 tests, build, audit).

### Limitaciones

- Solo se soportan repositorios públicos de GitHub.
- La ingestión es acotada y puede completarse con limitaciones explícitas; la cobertura es `partial`/`insufficient` para la mayoría de los repositorios.
- Los repositorios muy grandes (`react/react`, `vitejs/vite`) superan el presupuesto de requests y reportan `SNAPSHOT_LIMIT_EXCEEDED`.
- El analyzer usa heurísticas estáticas conservadoras y no ejecuta el código del repositorio.
- Las reglas basadas en ausencia pueden reportar "not detected" cuando el snapshot acotado puede no contener todos los archivos relevantes.
- Las puntuaciones son señales dimensionales, no una calificación absoluta de calidad.
- La interpretación de AI es opcional y no es autoritativa; la calidad de los proveedores reales no está validada.
- No se reivindica ni se automatiza la conformidad completa con WCAG 2.2 AA ni el E2E de navegador (Playwright/Lighthouse).
- El runtime sigue siendo un MVP de un solo proceso que usa SQLite local.
