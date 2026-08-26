# Calidad, CI/CD y observabilidad

## Foundation implementada

La Foundation verifica infraestructura básica, no funcionalidades de producto:

- API: test de integración de `GET /health` con `fastify.inject()`.
- Angular: tests de creación de la aplicación y estados online/unavailable del cliente health.
- Contracts: compilación TypeScript.
- Repository: lint, format check, typecheck, tests y build.

## Testing strategy

### MUST en Foundation

- API health response y status code.
- Angular application creation.
- Angular HTTP success/error states.
- TypeScript strict compilation.
- Workspace build de contracts, API y web.
- ESLint y Prettier.

### SHOULD en fases siguientes

- Domain invariants y job lifecycle.
- Analyzer fixtures TypeScript/JavaScript.
- Evidence paths, ranges y snapshot SHA.
- GitHub URL validation, limits, redaction, symlinks y path traversal.
- SQLite states, cleanup, idempotency y reinicio.
- API contracts del report.
- E2E y accessibility checks del flujo completo.

### LATER

- AI provider contracts y response validation.
- Prompt-injection tests.
- Load tests para worker, PostgreSQL y colas si se extraen.
- Realtime e histórico.

No se usa un provider de IA real en CI.

## CI/CD

`.github/workflows/ci.yml` utiliza Node 24 desde `.nvmrc` y pnpm 10.34.5. Ejecuta:

```text
install --frozen-lockfile
lint
format:check
typecheck
test
build
```

No se introducen E2E, Playwright, Docker o despliegue en esta fase.

## Observability mínima

Fastify registra el arranque y las requests mediante su logger integrado. No se registran secrets, credenciales ni headers sensibles. Tracing, métricas y dashboards quedan para fases posteriores.

## Global Definition of Done

Para Foundation:

- código alineado con los límites de arquitectura;
- contracts y tipos actualizados;
- tests básicos pasando;
- lint, format, typecheck y build pasando;
- CI ejecutando los mismos comandos;
- accesibilidad básica de la pantalla Foundation;
- CORS y error handling mínimos definidos;
- documentación y ADR del framework actualizados;
- no se añade infraestructura o abstracción sin necesidad explícita.
