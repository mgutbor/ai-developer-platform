# ADR-012 — SQLite como persistencia del MVP

- **Status:** Accepted for MVP
- **Date:** 2026-08-26

## Context

El MVP necesita conservar jobs y resultados para que el frontend pueda consultar el progreso y el report. No necesita almacenar el repository completo, compartir estado entre muchas instancias ni ofrecer consultas analíticas complejas.

## Decision

Usar SQLite para el primer runtime persistente. Guardar `analysis request`, snapshot metadata, analyzer version, facts, metrics, findings, evidence references, recommendations y score determinista. No guardar blobs completos ni contexto AI por defecto. Aplicar retención corta y limpieza explícita.

La capa de persistencia será un adapter detrás de un puerto, para poder migrar a PostgreSQL si aparecen multiinstancia, concurrencia, disponibilidad o volumen que lo justifiquen.

## Consequences

- Desarrollo y tests sencillos, baratos y reproducibles.
- El MVP queda limitado en concurrencia y escalado horizontal.
- El fichero SQLite debe protegerse, excluirse del repository y respaldarse solo si la política de datos lo permite.
- La migración futura exige probar schemas y lifecycle, pero no cambiar el dominio.

## Alternatives considered

- **In-memory:** demasiado frágil para polling, reinicios y resultados consultables.
- **Filesystem JSON:** sencillo, pero inferior para concurrencia, integridad y consultas paginadas.
- **PostgreSQL:** adecuado para producción multiusuario, pero prematuro para validar el vertical slice.
