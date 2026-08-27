# Modelo de dominio

La Fase 2 establece el vocabulario de negocio canónico para el análisis de repositorios. El modelo se implementa en `@ai-developer-platform/domain` y es independiente de HTTP, Angular, Fastify, GitHub, SQLite, el filesystem y los proveedores de AI.

## Cadena de trazabilidad

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

- `RepositorySnapshot` identifica la revisión exacta del repositorio público de GitHub. `commitSha`, y no una rama mutable, es la identidad autoritativa del origen.
- `Fact` es una observación directa. Tiene un estado explícito: `observed`, `not_detected`, `unknown` o `insufficient_data`.
- `Metric` es una medición derivada. Registra los IDs de los facts de origen, la unidad, la procedencia y la versión de la regla.
- `Evidence` es soporte minimizado acotado a un snapshot. Usa un path relativo normalizado y un hash de excerpt o un excerpt redactado, nunca un archivo fuente completo.
- `Finding` es un problema o riesgo interpretado. Requiere al menos una referencia de evidencia y severidad, categoría, confianza, origen y procedencia de regla controlados.
- `Recommendation` es una mejora accionable vinculada a uno o más findings.
- `AnalysisResult` es el agregado de reporte validado. Comprueba referencias, consistencia del snapshot, vínculos recíprocos finding/recommendation, propiedad de la evidencia, IDs únicos, versiones y puntuaciones de dimensión nullable.

## Dominio frente a contratos de API

`packages/domain` representa el significado de negocio y valida invariantes. `packages/contracts` representa las formas serializadas de frontera, como `AnalysisResultResponse`; no importa entidades de dominio. Un adapter de API mapeará los registros de dominio a los DTO de frontera cuando existan endpoints de reporte.

Esto evita que cambiar Fastify, Angular, GitHub o SQLite cambie la semántica del modelo de dominio.

## IDs y versiones

Los IDs de snapshot son siempre deterministas a partir del owner normalizado, el nombre del repositorio y el commit SHA completo:

```text
snapshot:owner/name@commitSha
```

El resto de IDs de entidad son cadenas opacas suministradas por la frontera de creación. Esto evita una dependencia de UUID y mantiene simple la persistencia/el debugging; un adapter futuro es responsable de generar IDs seguros ante colisiones según su política de almacenamiento. `analyzerVersion` y `ruleSetVersion` se almacenan por separado porque los cambios de implementación y los cambios de reglas pueden afectar a la reproducibilidad de forma independiente.

## Incertidumbre

`unknown`, `not_detected` e `insufficient_data` son estados distintos. Los facts y metrics no observados llevan valores `null`. Una puntuación de dimensión también puede ser `null` solo con cobertura `insufficient`. Los datos desconocidos nunca se convierten en `false`, y los datos insuficientes nunca se convierten en cero.

## Ciclo de vida de la Fase 5

`AnalysisJob` pertenece ahora al dominio porque tiene un consumidor de ciclo de vida real. Las transiciones válidas son `queued → running → completed`, `completed_with_limitations`, `failed` o `cancelled`; los jobs en cola también pueden fallar o cancelarse antes de iniciarse. La persistencia y HTTP siguen siendo adapters alrededor de esta semántica de dominio.
