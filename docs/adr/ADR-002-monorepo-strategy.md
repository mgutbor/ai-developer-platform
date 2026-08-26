# ADR-002 — Estrategia de monorepo

- **Status:** Accepted for MVP
- **Date:** 2026-08-26

## Context

Web y API compartirán contracts, tipos, reglas de dominio y utilidades limitadas. El runner de jobs inicial vive dentro de la API; un worker independiente es una evolución condicional. Mantener copias separadas introduciría drift y haría más difícil verificar cambios coordinados.

## Decision

Usar un monorepo TypeScript con workspace y lockfile único. Las aplicaciones iniciales vivirán en `apps/web` y `apps/api`; los módulos reutilizables vivirán en `packages/` solo cuando tengan una responsabilidad real. Cada package tendrá un API público pequeño y una dirección de dependencias verificable. La elección del package manager se hará en M01, atendiendo a disponibilidad del equipo y soporte estable de workspaces.

## Consequences

- Contratos compartidos y cambios atómicos entre aplicaciones.
- CI debe ejecutar checks afectados y también un check global de tipos/build.
- El tooling del workspace pasa a ser una dependencia importante del proyecto.
- No se deben compartir componentes de UI o acceso a infraestructura con packages de dominio solo por conveniencia.

## Alternatives considered

- **Repositories separados:** más aislamiento, pero mayor fricción para contracts y cambios coordinados en una fase temprana.
- **Un único package sin workspaces:** simple al principio, pero mezcla aplicaciones y límites de módulos.
- **Polyrepo con package registry interno:** innecesario mientras los módulos evolucionan juntos.
