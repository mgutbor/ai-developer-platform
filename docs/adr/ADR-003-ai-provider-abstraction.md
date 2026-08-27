# ADR-003 — Abstracción de proveedores de IA

- **Status:** Accepted as future boundary; implementation deferred to Phase 8
- **Date:** 2026-08-26

## Contexto

El producto debe poder cambiar de proveedor por disponibilidad, privacidad, coste, latencia o ejecución local. Los SDKs y formatos de cada proveedor no deben contaminar el dominio de análisis.

## Decisión

Reservar un puerto `AIProvider` pequeño como boundary futuro, sin crear todavía un package ni implementar providers. Cuando exista una tarea AI validada, un único adapter traducirá requests y responses del proveedor a un contrato interno estructurado. La selección de provider/model se hará entonces por requisitos de privacidad, coste y disponibilidad. El dominio solo recibirá resultados validados y metadata no sensible.

## Consecuencias

- Se puede probar el pipeline sin red ni coste usando un provider de test.
- Cambiar de proveedor exige mantener adaptadores y verificar diferencias de calidad.
- La abstracción debe ser pequeña; no se incluirán capacidades que ningún caso de uso necesite.
- Coste, latencia, límites y política de datos deben formar parte de la evaluación de cada adaptador.

## Alternativas consideradas

- **SDK de un único proveedor en el dominio:** rechazado por acoplamiento y riesgo de migración.
- **Capa genérica de agentes:** rechazada por complejidad y falta de necesidad en el MVP.
- **Solo modelos locales:** no garantiza disponibilidad o calidad homogénea; puede añadirse como adaptador.
