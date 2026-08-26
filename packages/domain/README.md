# Domain

`@ai-developer-platform/domain` contiene el modelo de negocio independiente de infraestructura para el análisis de repositories.

No depende de Angular, Fastify, GitHub, SQLite, filesystem, APIs de browser ni providers de IA. Las entidades se crean mediante factories explícitas que validan invariantes y devuelven objetos congelados.

## Modelo

```text
RepositorySnapshot
        |
       Facts
        |
      Metrics
        |
     Evidence
        |
     Findings
        |
 Recommendations
        |
  AnalysisResult
```

- `Fact` es una observación directa de un snapshot.
- `Metric` es una medida derivada y conserva los IDs de facts y la versión de la regla utilizada.
- `Evidence` es soporte minimizado, localizado en un snapshot concreto.
- `Finding` es un problema o riesgo interpretado y requiere referencias a evidence.
- `Recommendation` es una acción vinculada a uno o más findings.
- `AnalysisResult` valida las referencias, la consistencia del snapshot, las relaciones, las versiones y los estados de score.

`unknown`, `not_detected` e `insufficient_data` son estados explícitos. Nunca se convierten silenciosamente en `false` o `0`.
