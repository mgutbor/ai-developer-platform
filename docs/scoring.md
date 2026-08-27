# Puntuación determinista

La Fase 5 añade `packages/scoring` como una función pura sobre un `AnalysisResult` validado.

## Fórmula

Para cada dimensión soportada:

```text
score = clamp(10 - Σ severityPenalty(finding), 0, 10)
```

Las penalizaciones están versionadas y son intencionadamente simples:

| Severity | Penalty |
| --- | ---: |
| info | 0.25 |
| low | 0.5 |
| medium | 1 |
| high | 2 |
| critical | 3 |

El scorer solo utiliza findings deterministas ya respaldados por evidencia. No crea findings, no cambia recomendaciones ni reinterpreta valores desconocidos.

## Cobertura

El scorer produce puntuaciones por dimensión para Architecture, Maintainability, Testing, Documentation, Dependencies y Code Quality cuando se observa al menos una señal determinista relevante. Las dimensiones sin señales suficientes tienen `score: null` y `coverage: insufficient`. Un resultado parcial del analyzer produce cobertura de dimensión parcial.

La cobertura es parte del contrato de puntuación, no decoración: cuando la cobertura del snapshot no es `complete`, cada dimensión puntuada lleva una limitación explícita que indica que la puntuación no representa una evaluación completa del repositorio. Una puntuación alta sobre un snapshot parcial nunca implica calidad del repositorio completo, y el frontend presenta la puntuación junto con la limitación de cobertura.

Accessibility y Security siguen representadas por facts/findings del analyzer pero no se fuerzan dentro de una puntuación hasta que su cobertura de señal determinista sea suficientemente sólida.

## Sin puntuación global

El MVP deliberadamente no calcula una puntuación global. Esto evita una falsa precisión mientras las dimensiones y reglas siguen validándose.
