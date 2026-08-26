# AI Developer Platform

Plataforma para analizar repositorios de GitHub y generar un Developer Health Report respaldado por evidencias deterministas, análisis estático y una capa opcional de IA.

> Estado: Fase 0.1 completada. El repositorio contiene únicamente documentación de producto, arquitectura y revisión crítica; todavía no existe una aplicación implementada.

## Objetivo

Responder de forma estructurada a estas preguntas sobre un repository:

- Qué problemas técnicos presenta.
- Qué evidencia sustenta cada problema.
- Qué impacto puede tener.
- Qué debería mejorarse primero.

La IA complementa los hechos y métricas obtenidos por analizadores deterministas. No se considera una fuente de verdad independiente.

## Documentación

- [Definición del producto](docs/product.md)
- [Arquitectura](docs/architecture.md)
- [Revisión de arquitectura y refinamiento del MVP](docs/architecture-review.md)
- [Modelo de análisis](docs/analysis-model.md)
- [Guía de desarrollo](docs/development.md)
- [Modelo de calidad, CI/CD y observabilidad](docs/quality.md)
- [Arquitectura de IA](docs/ai.md)
- [Seguridad y privacidad](docs/security.md)
- [Roadmap](docs/roadmap.md)
- [ADRs](docs/adr/)

La arquitectura refinada usa Angular, GitHub REST, un runner de jobs dentro de la API y SQLite para el MVP. La IA queda condicionada a una fase posterior.

## Estado actual

La Fase 0 define el producto, sus límites, el modelo de análisis, la arquitectura propuesta, los riesgos y el plan de ejecución. No se han creado componentes, endpoints funcionales, servicios, integraciones ni dependencias de runtime.

## Principios

1. Evidence over opinion.
2. Deterministic first.
3. AI as an analysis layer.
4. Provider agnostic.
5. Maintainability over cleverness.
6. Open source mindset.

## Alcance inicial propuesto

El MVP analizará repositories públicos de GitHub, fijados a un commit concreto, mediante GitHub REST y lectura de metadata, árbol de archivos y contenido textual permitido. Producirá facts, métricas, findings, recomendaciones y score determinista para TypeScript/JavaScript en un job consultable desde una interfaz Angular.

Los repositories privados, la ejecución de código no confiable, los cambios automáticos y los comentarios en pull requests quedan fuera del MVP.

## Contribución

La guía de desarrollo se incorporará antes de comenzar la implementación y deberá mantenerse sincronizada con las decisiones registradas en los ADRs. Cada cambio relevante debe incluir tests, documentación y una evaluación de seguridad proporcional a su impacto.
