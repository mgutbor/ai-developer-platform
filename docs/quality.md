# Calidad, CI/CD y observabilidad

## Foundation implementada

La calidad cubre el vertical slice completo del MVP, desde ingestion hasta la experiencia Angular y la interpretación AI opcional:

- API: test de integración de `GET /health` con `fastify.inject()`.
- Angular: tests de creación de la aplicación y estados online/unavailable del cliente health.
- Contracts: compilación TypeScript de DTOs de frontera.
- Domain: tests unitarios de factories, invariantes, trazabilidad, incertidumbre, inmutabilidad y lifecycle de `AnalysisJob`.

- GitHub: tests sin red de referencias, REST response validation, límites, selección, decodificación, errores y reproducibilidad.
- Scoring: determinismo, penalizaciones, cobertura insuficiente y ausencia de score global.
- Persistence: round-trip de jobs/results, restart file-backed, cleanup e idempotencia.
- API/application: pipeline con fake ingestion, mapping, idempotencia, errores, status lifecycle y timeout.
- Phase 7: dataset controlado, revisión de findings, validación live contra repositories públicos pequeños y auditoría de dependencias.
- Phase 13: benchmark real contra repositories públicos (`Hello-World`, `type-fest`, `express`, `angular`, `react`) con el runner reproducible `apps/api/src/validate-real-repos.ts`; revisión de falsos positivos por regla, scoring, cobertura y rendimiento. Resultados en `docs/phase-13-product-validation.md`.
- Phase 14: regresiones específicas para `AN-SEC-003` (expresiones GitHub Actions, tiers committed/possible/placeholder/demo), selección priorizada de metadata raíz con límites, redirects canónicos/seguros y transparencia de coverage en scoring. Benchmark antes/después en `docs/phase-14-validation.md`.

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

### Revisión del MVP

- API mapping tests entre domain y contracts.
- Revisión adicional de reglas y thresholds del analyzer sobre repositories reales.
- Validación live del provider AI, coste y calidad semántica.
- E2E browser y auditoría automatizada axe si el flujo público lo justifica.
- Load tests únicamente antes de extraer worker, PostgreSQL o colas.

### Deferred

- Worker independiente, PostgreSQL, colas, Redis y realtime condicionados a métricas operativas.
- AI provider adicional, RAG, embeddings, agentes y streaming fuera del MVP.
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

Para el MVP validado:

- código alineado con los límites de arquitectura;
- contracts y tipos actualizados;
- tests básicos pasando;
- lint, format, typecheck y build pasando;
- CI ejecutando los mismos comandos;
- accesibilidad básica del flujo Angular;
- CORS y error handling mínimos definidos;
- documentación y ADRs de las decisiones actuales actualizados;
- no se añade infraestructura o abstracción sin necesidad explícita.
