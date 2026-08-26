# Calidad, CI/CD y observabilidad

## Foundation implementada

La calidad cubre ahora el vertical slice de Phase 5 además de la Foundation:

- API: test de integración de `GET /health` con `fastify.inject()`.
- Angular: tests de creación de la aplicación y estados online/unavailable del cliente health.
- Contracts: compilación TypeScript de DTOs de frontera.
- Domain: tests unitarios de factories, invariantes, trazabilidad, incertidumbre, inmutabilidad y lifecycle de `AnalysisJob`.

- GitHub: tests sin red de referencias, REST response validation, límites, selección, decodificación, errores y reproducibilidad.
- Scoring: determinismo, penalizaciones, cobertura insuficiente y ausencia de score global.
- Persistence: round-trip de jobs/results, restart file-backed, cleanup e idempotencia.
- API/application: pipeline con fake ingestion, mapping, idempotencia, errores y status lifecycle.

- Repository: lint, format check, typecheck, tests y build.

## Testing strategy

### MUST en Foundation

- API health response y status code.
- Angular application creation.
- Angular HTTP success/error states.
- TypeScript strict compilation.
- Domain invariants and relationship integrity.
- `pnpm check:architecture` cubre `domain`, `github`, `analyzer` y `scoring`; `persistence` se mantiene aislado por dependencia declarada y revisión del adapter.
- Workspace build de contracts, domain, github, analyzer, API y web.
- ESLint y Prettier.

### MUST en Phase 5

- pipeline API → runner → ingestion fake → analyzer → scorer → SQLite;
- job transitions, idempotency, timeout/error classification y cleanup;
- persistence restart y report mapping;

### SHOULD en fases siguientes

- API mapping tests entre domain y contracts.
- Job lifecycle.
- Revisión adicional de reglas y thresholds del analyzer sobre repositories reales.
- AST/module resolution más completo solo si aporta valor probado.
- Evidence paths, ranges y snapshot SHA.
- GitHub live integration controlado, endpoint mapping y redacción basada en contenido antes de habilitar una API pública.
- SQLite states, cleanup, idempotency y reinicio.
- API endpoint contracts del report.
- E2E y accessibility checks del flujo completo.

### LATER

- AI provider contracts y response validation.
- Prompt-injection tests.
- Load tests para worker, PostgreSQL y colas si se extraen.
- Realtime e histórico.

SQLite emits an experimental Node warning under the current local Node 25 validation runtime; the project engine and CI target Node 24.


## CI/CD

`.github/workflows/ci.yml` utiliza Node 24 desde `.nvmrc` y pnpm 10.34.5. Ejecuta:

```text
install --frozen-lockfile
check:architecture
lint
format:check
typecheck
test
build
audit --audit-level=high
```

No se introducen E2E, Playwright, Docker o despliegue en esta fase.

## Observability mínima

Fastify registra el arranque y las requests mediante su logger integrado. No se registran secrets, credenciales ni headers sensibles. Tracing, métricas y dashboards quedan para fases posteriores.

Para Foundation, Phase 4 y Phase 5:

- código alineado con los límites de arquitectura;
- contracts y tipos actualizados;
- tests básicos pasando;
- lint, format, typecheck y build pasando;
- CI ejecutando los mismos comandos;
- accesibilidad básica de la pantalla Foundation;
- CORS y error handling mínimos definidos;
- documentación y ADR del framework actualizados;
- no se añade infraestructura o abstracción sin necesidad explícita.
