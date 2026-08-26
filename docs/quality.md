# Calidad, CI/CD y observabilidad

## Foundation implementada

La Foundation verifica infraestructura básica, no funcionalidades de producto:

- API: test de integración de `GET /health` con `fastify.inject()`.
- Angular: tests de creación de la aplicación y estados online/unavailable del cliente health.
- Contracts: compilación TypeScript de DTOs de frontera.
- Domain: tests unitarios de factories, invariantes, trazabilidad, incertidumbre e inmutabilidad.
- GitHub: tests sin red de referencias, REST response validation, límites, selección, decodificación, errores y reproducibilidad.
- Analyzer: tests de clasificación, manifests/config, frameworks, tooling, CI, métricas, reglas, evidence, recomendaciones, input malformado, seguridad, determinismo y baseline de performance.
- Repository: lint, format check, typecheck, tests y build.

## Testing strategy

### MUST en Foundation

- API health response y status code.
- Angular application creation.
- Angular HTTP success/error states.
- TypeScript strict compilation.
- Domain invariants and relationship integrity.
- Domain/GitHub/analyzer dependency boundary check.
- Workspace build de contracts, domain, github, analyzer, API y web.
- ESLint y Prettier.

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

No se usa un provider de IA real ni la red de GitHub en CI. `pnpm audit --audit-level=high` se ejecuta en CI junto con los demás gates.

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

## Global Definition of Done

Para Foundation y Phase 4:

- código alineado con los límites de arquitectura;
- contracts y tipos actualizados;
- tests básicos pasando;
- lint, format, typecheck y build pasando;
- CI ejecutando los mismos comandos;
- accesibilidad básica de la pantalla Foundation;
- CORS y error handling mínimos definidos;
- documentación y ADR del framework actualizados;
- no se añade infraestructura o abstracción sin necesidad explícita.
