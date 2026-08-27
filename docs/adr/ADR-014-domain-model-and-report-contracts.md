# ADR-014 — Modelo de dominio y contratos de reporte

- **Estado:** Aceptado para la Fase 2
- **Fecha:** 2026-08-26

## Contexto

La base inicial del proyecto solo contenía un contrato de respuesta de health. El trabajo futuro de ingestión, análisis, persistencia, API y frontend necesita un vocabulario compartido, pero exponer modelos de framework o de almacenamiento acoplaría el producto a detalles de implementación. La evidencia también debe seguir siendo verificable contra la revisión exacta del repositorio, y las observaciones incompletas no deben interpretarse como resultados negativos.

## Decisión

Crear `packages/domain` como un paquete TypeScript plano que contiene registros inmutables, conjuntos de valores controlados y factories explícitas para `RepositorySnapshot`, `Fact`, `Metric`, `Evidence`, `Finding`, `Recommendation`, `DimensionScore` y `AnalysisResult`.

Mantener `packages/contracts` orientado a fronteras. Contiene formas de API serializables y no importa entidades de dominio. Los adapters de API futuros mapearán los registros de dominio a esos DTO de forma explícita.

Hacer que la evidencia sea de primera clase y esté acotada al snapshot. Los findings requieren referencias de evidencia; los findings y las recomendaciones deben resolver sus relaciones recíprocas en un `AnalysisResult`. Representar `unknown`, `not_detected` e `insufficient_data` de forma explícita, con valores y puntuaciones nullable donde los datos sean inadecuados. Preservar `analyzerVersion` y `ruleSetVersion` de forma independiente para la reproducibilidad.

No añadir `AnalysisJob`, persistencia, lógica del analyzer, adapters de GitHub ni implementación de AI hasta que exista un consumidor real en una fase posterior.

## Consecuencias

- La semántica central se puede testear sin infraestructura ni servicios externos.
- Los paths, rangos, valores controlados, referencias entre snapshots, evidencia huérfana y relaciones sin resolver inválidos se rechazan en las fronteras de creación.
- Los contratos de API pueden evolucionar de forma independiente de los internos del dominio.
- Los IDs de entidad siguen siendo cadenas opacas simples, mientras que la identidad del snapshot es determinista a partir de la revisión analizada.
- Los adapters futuros deben realizar el mapeo explícito y preservar los invariantes impuestos aquí.
- El modelo es intencionadamente pequeño; el ciclo de vida del job y la semántica de ejecución siguen siendo una decisión posterior.

## Alternativas consideradas

- **Exponer las entidades de dominio directamente desde la API:** rechazado porque la serialización de transporte pasaría a formar parte del contrato de dominio.
- **Usar un esquema JSON genérico o framework de validación:** rechazado porque añadiría abstracción sin un consumidor de frontera actual.
- **Representar los findings como texto libre con evidencia incrustada:** rechazado porque se perderían la trazabilidad y la validación de relaciones.
- **Modelar ahora todos los conceptos planeados, incluido `AnalysisJob`:** rechazado porque las abstracciones vacías aumentarían el acoplamiento antes de que su ciclo de vida esté implementado.
