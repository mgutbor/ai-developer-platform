# ADR-009 — Scoring determinista en el MVP

- **Status:** Accepted for MVP
- **Date:** 2026-08-26
- **Supersedes:** la política híbrida 70/30 de `docs/analysis-model.md`

## Contexto

La Fase 0 proponía mezclar un 70% determinista con un 30% de IA y permitir un ajuste de `±1.5`. No existe todavía un dataset de calibración ni evidencia de que un score combinado sea más útil. Mezclar calidad observable con juicio semántico puede crear una cifra difícil de explicar y falsa sensación de precisión.

## Decisión

El MVP publicará un `deterministicScore` por dimensión solo cuando existan señales mínimas y reglas documentadas. Cada score tendrá lista de señales, penalizaciones, versión de reglas, evidence count, coverage y `confidenceBand`. Se usará `insufficient_data` y score nulo cuando no haya base suficiente.

La IA, cuando se incorpore, producirá una `aiAssessment` separada con claims, evidence references, rationale, confidence y limitaciones. No podrá modificar automáticamente el score determinista. Una eventual combinación será una decisión futura basada en evaluación comparativa y deberá registrarse en un nuevo ADR.

No se publicará score global en el primer vertical slice. Se podrá añadir después de comprobar que las dimensiones son comparables y que el agregado ayuda a decidir.

## Consecuencias

- Mayor explicabilidad y reproducibilidad.
- El MVP puede demostrar valor sin coste ni dependencia de un LLM.
- La evaluación semántica futura no desaparece, pero se mide por separado.
- El resultado inicial puede parecer menos sofisticado, aunque es más honesto.
- Será necesario diseñar reglas deterministas con fixtures y evitar que la cobertura se confunda con calidad.

## Alternativas consideradas

- **70% determinista + 30% IA:** rechazado por falta de calibración y por mezclar señales heterogéneas.
- **Score calculado por el LLM:** rechazado por variabilidad y falta de auditabilidad.
- **Eliminar scores y mostrar solo findings:** no se elige para el MVP porque un score determinista limitado puede facilitar el resumen, siempre que sea explicable y nullable.
