# ADR-004 — Análisis determinista antes de IA

- **Status:** Accepted and strengthened by ADR-009
- **Date:** 2026-08-26

## Contexto

Lenguajes, estructura, dependencias declaradas, presencia de tests y configuración son hechos que pueden obtenerse mediante reglas. Delegarlos al LLM aumenta coste, variabilidad y riesgo de afirmaciones no verificadas.

## Decisión

El pipeline siempre ejecutará primero la ingesta y el análisis determinista. En el primer vertical slice la IA no se ejecutará. Estos resultados serán la base del reporte y, solo en una fase posterior, el contexto mínimo para tareas semánticas. La IA no sustituirá facts ni métricas verificables.

## Consecuencias

- El producto sigue siendo útil cuando la IA está deshabilitada o falla.
- Los resultados son más reproducibles y auditables.
- El analyzer necesita mantener reglas, provenance y fixtures.
- Algunas dimensiones tendrán confidence baja o `insufficient_data` cuando las señales sean limitadas.

## Alternativas consideradas

- **LLM como analizador principal:** rechazado por no ser reproducible ni adecuado para hechos simples.
- **Solo análisis estático:** insuficiente para relaciones semánticas y recomendaciones contextuales.
- **Paralelizar desde el inicio:** podría reducir latencia, pero complica el contexto y pierde la relación de precedencia; se deja como optimización posterior.
