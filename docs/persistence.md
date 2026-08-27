# Persistencia SQLite

La Fase 5 utiliza un pequeño adapter en `packages/persistence` alrededor de la API `DatabaseSync` de `node:sqlite`, integrada en Node 24.

## Decisión

Se prefiere el adapter a un ORM en este MVP porque el esquema es pequeño, los patrones de acceso son conocidos y evitar una dependencia de runtime mantiene reducida la superficie de despliegue. La API es síncrona internamente pero queda aislada tras interfaces de repositorio, por lo que una implementación futura puede migrar a PostgreSQL sin cambiar la semántica del dominio.

## Datos almacenados

- `analysis_jobs`: request normalizado, timestamps del ciclo de vida, commit resuelto, versiones, código de error y referencia al resultado.
- `analysis_results`: metadatos del snapshot, versiones, timestamps y el reporte serializado y validado.

El payload del resultado incluye facts, metrics, evidencia minimizada, findings, recomendaciones, puntuaciones por dimensión y limitaciones. No incluye blobs del repositorio ni archivos fuente completos.

## Retención

`deleteOlderThan(cutoffIso)` es determinista y seguro de invocar repetidamente. Se expone deliberadamente como una operación en lugar de ser programada por un worker externo.

## Runtime

`node:sqlite` es experimental en la superficie actual de tipos/runtime de Node 24. El rango de engine del proyecto sigue siendo Node 24, y el adapter es el único paquete que lo importa. Los tests usan `:memory:` y una base de datos temporal respaldada por archivo para verificar el comportamiento tras un reinicio.
