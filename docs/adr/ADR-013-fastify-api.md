# ADR-013 — Fastify como framework de API

- **Status:** Accepted for Foundation
- **Date:** 2026-08-26

## Contexto

La Foundation necesita una API TypeScript pequeña con un endpoint de health, logging mínimo, CORS explícito, error handling y tests de integración. El framework no debe introducir una arquitectura más grande que el dominio que existe actualmente.

## Decisión

Usar Fastify 5 para `apps/api`. La aplicación se construye mediante una función `buildApp`, separada del proceso de escucha, y se prueba con `fastify.inject()`. Se utilizará el plugin oficial de CORS con origins de desarrollo explícitos.

## Consecuencias

- Menor ceremony que NestJS para la Foundation.
- Mejor estructura de plugins, logging y HTTP injection que una configuración Express equivalente.
- La API debe mantener módulos internos explícitos a medida que crezca; Fastify no sustituye los boundaries de dominio.
- CORS está limitado a origins locales conocidos en esta fase.
- La dependencia de Fastify queda encapsulada en la capa API y no llega al dominio.

## Alternativas consideradas

- **Express:** muy simple y ampliamente conocido, pero requiere decidir más piezas para logging, composición y validación a medida que crezca la API.
- **NestJS:** ofrece una estructura completa y buena integración TypeScript, pero añade decorators, módulos y ceremony innecesarios para un único endpoint y un MVP modular pequeño.
- **Node HTTP nativo:** mínimo, pero trasladaría routing, errores, plugins y testing a código propio sin aportar valor al producto.
