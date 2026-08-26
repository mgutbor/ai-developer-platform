# ADR-008 — Angular como frontend del MVP

- **Status:** Accepted for MVP
- **Date:** 2026-08-26

## Context

La Fase 0 propuso React + TypeScript sin comparar explícitamente Angular. El producto es una aplicación operativa con routing, formularios, estados de carga, reportes, filtros, tablas y requisitos de accesibilidad. El perfil del proyecto busca demostrar arquitectura frontend, TypeScript, testing, design system y criterio técnico; el contexto del equipo tiene experiencia relevante con Angular.

## Decision

Usar Angular + TypeScript para la aplicación web del MVP. Se utilizarán las capacidades integradas del framework para estructura de aplicación, dependency injection, routing, forms y testing, evitando añadir un state manager global salvo necesidad demostrada. La web consumirá exclusivamente la API.

## Consequences

- Convenciones y límites más uniformes desde el primer commit.
- Buen encaje para una aplicación de workflow con formularios y estados previsibles.
- El framework aporta más estructura inicial que React y puede requerir más ceremonia para una pantalla muy pequeña.
- El design system debe permanecer independiente del dominio y usar componentes accesibles.
- La decisión maximiza coherencia con el perfil y portfolio del proyecto, no se basa en cuota de mercado.

## Alternatives considered

- **React + TypeScript:** técnicamente válido y con ecosystem amplio, pero requiere elegir más piezas de arquitectura y aporta menos diferenciación respecto al perfil objetivo en este proyecto.
- **Angular standalone sin arquitectura por features:** descartado; se mantendrán límites por feature y una capa de API clara.
- **Vue:** no se prioriza porque no aporta una ventaja decisiva frente a Angular para este contexto y requeriría otra línea de expertise.
