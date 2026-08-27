# ADR-006 — Modelo asíncrono de análisis

- **Status:** Modified by ADR-007 for MVP execution
- **Date:** 2026-08-26

## Contexto

La ingesta de un repository, el análisis de muchos archivos y las llamadas opcionales a IA pueden superar el timeout de una request HTTP. GitHub y los providers también tienen rate limits y fallos transitorios.

## Decisión

`POST /analyses` crea un `AnalysisJob` y puede responder `202 Accepted`. En el MVP, un runner dentro del proceso de API procesa el job por etapas y persiste su estado en SQLite. El frontend consulta el estado mediante polling simple si es necesario. Las transiciones serán explícitas y la ejecución idempotente por analysis/revision. La extracción a un worker requiere evidencia operativa y una decisión posterior.

## Consecuencias

- La API conserva un contrato de job y el runner inicial reduce el coste operativo.
- El usuario necesita estados de progreso, errores recuperables y resultados parciales/limitaciones.
- Se necesita persistencia, timeout de ejecución y limpieza de jobs expirados.
- Polling añade requests, pero es más simple y auditable que introducir realtime desde el principio.
- El runner en proceso limita concurrencia y no debe considerarse una solución de escalado horizontal.

## Alternativas consideradas

- **Procesamiento síncrono:** rechazado por timeouts y mala experiencia ante repositories grandes.
- **WebSockets/SSE desde el inicio:** pospuesto; no aporta valor suficiente para el primer flujo.
- **Sistema de colas distribuido dedicado:** pospuesto hasta conocer volumen y necesidad de reintentos a escala.
