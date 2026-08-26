# Calidad, CI/CD y observabilidad

## Testing strategy review

La prioridad se basa en lo que puede romper realmente el producto, no en cantidad de suites.

### MUST

- Unit tests de invariantes y lifecycle de `AnalysisJob`.
- Unit tests de scoring determinista, `null`, `insufficient_data`, deduplicación y límites.
- Analyzer fixtures para TypeScript/JavaScript con y sin tests, docs, linting, dependencies y CI.
- Tests de evidence: paths normalizados, ranges válidos y snapshot SHA correcto.
- GitHub ingestion tests para URL validation, rate limits, pagination, file limits, symlinks, paths, redaction y host restrictions.
- SQLite persistence tests para estados, cleanup, idempotency y reinicio.
- API contract tests para create/status/report y errores públicos.
- Frontend tests del flujo input → progress → report, incluyendo error y partial states.
- Accessibility checks y revisión manual de teclado del flujo principal.

### SHOULD

- Integration test de un snapshot completo sintético.
- Regression tests por cada finding corregido.
- Fuzz/property tests de paths, filenames y límites.
- E2E sobre API y web en entorno aislado.
- Security checks de dependencias y secrets.

### LATER

- Provider contract tests y AI response validation cuando llegue Phase 8.
- Load tests para worker, PostgreSQL y colas solo si se extraen.
- Comparación histórica y pruebas de realtime si se incorporan.

No se usará un provider de IA real en CI.

## CI/CD propuesta

GitHub Actions ejecutará progresivamente:

1. instalación reproducible con lockfile;
2. lint y format check;
3. typecheck;
4. unit tests;
5. integration y contract tests;
6. build de web y API;
7. E2E y accessibility checks;
8. dependency audit y secret scanning.

Los gates MUST del MVP son lint, typecheck, unit, integration/contract, build y security checks básicos. E2E y accessibility serán gates de release una vez exista la aplicación web.

No se necesita Kubernetes, Terraform ni despliegue multi-servicio para el MVP.

## Observability mínima

Registrar eventos sin contenido sensible:

- `analysis_started`;
- `analysis_completed`;
- `analysis_completed_with_limitations`;
- `analysis_failed`;
- `github_api_failure`;
- `retention_cleanup_completed`.

Métricas iniciales:

- completion rate por estado;
- duración del analysis;
- número y tamaño de archivos incluidos/excluidos;
- evidence coverage;
- errores y rate limits de GitHub;
- concurrencia del runner;
- resultados de cleanup.

Las métricas de IA se añadirán solo en Phase 8. No se registran tokens, API keys, prompts completos, responses completas, código ni excerpts sin redacción.

## Global Definition of Done

Un milestone se considera terminado cuando, según aplique:

- los límites de arquitectura están respetados;
- contracts y tipos están actualizados;
- tests MUST pasan y cubren errores y límites;
- lint, typecheck y build pasan;
- documentación y ADRs afectados están actualizados;
- accesibilidad del flujo afectado está validada;
- se revisan secretos, SSRF, rate limits, path traversal y retención;
- CI ejecuta los gates definidos;
- observabilidad y limitaciones están documentadas;
- existe una verificación reproducible;
- no se añade infraestructura o abstracción sin una necesidad explícita.
