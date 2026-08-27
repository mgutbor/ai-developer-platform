# ADR-001 — Arquitectura de monolito modular

- **Status:** Modified by ADR-007 for MVP runtime
- **Date:** 2026-08-26

## Contexto

La plataforma necesita una web, una API, procesamiento asíncrono, integración con GitHub, análisis determinista y una capa de IA. El repository no contiene implementación y no hay evidencia de volumen, equipos o requisitos operativos que justifiquen servicios independientes.

## Decisión

Construir inicialmente un monolito modular TypeScript dentro de un monorepo, con `web` y `api` como aplicaciones y packages internos solo cuando tengan una responsabilidad real. El runtime del MVP no incluye un worker independiente; ADR-007 define que el runner vive inicialmente dentro de la API. Los módulos se comunican mediante interfaces y contratos explícitos.

## Consecuencias

- Menor coste de operación y depuración en el MVP.
- Límites de ownership claros y posibilidad de tests aislados.
- El runner puede extraerse a un worker independiente si aparece una necesidad real.
- Hay que vigilar que los packages compartidos no se conviertan en un cajón de sastre.
- Una extracción futura requerirá definir contratos de red para los puertos que hoy son interfaces internas.

## Alternativas consideradas

- **Microservicios desde el inicio:** rechazado por añadir despliegues, observabilidad y coordinación sin una señal de necesidad.
- **Aplicación única sin módulos:** rechazado porque mezclaría dominio, adaptadores y transporte y dificultaría sustituir GitHub o IA.
- **Serverless por función:** pospuesto hasta conocer el patrón de jobs, límites de tiempo y necesidades de persistencia.
