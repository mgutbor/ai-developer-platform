# Capa de aplicación y persistencia de la Fase 5

La Fase 5 compone los paquetes puros existentes de ingestión y analyzer en un corte vertical pequeño y persistente.

```text
POST /analyses
      |
      v
AnalysisJob (queued)
      |
      v
runner en proceso (concurrencia 1)
      |
      +--> Ingestión GitHub REST
      +--> analyzer determinista
      +--> puntuación dimensional determinista
      +--> persistencia SQLite
      |
      v
GET /analyses/:id/report
```

## Responsabilidades

- `packages/domain`: ciclo de vida de `AnalysisJob` e invariantes del reporte.
- `packages/github`: validación de repositorios públicos de GitHub, ingestión acotada y creación del snapshot.
- `packages/analyzer`: facts, metrics, evidencia, findings y recomendaciones puros.
- `packages/scoring`: puntuación dimensional pura; nunca calcula una puntuación global.
- `packages/persistence`: adapter SQLite que usa `node:sqlite` de Node 24; ningún tipo de SQLite escapa de este paquete.
- `apps/api/src/application.ts`: orquestación, idempotencia, timeout y clasificación de errores.
- `apps/api/src/mapper.ts`: serialización explícita de dominio a contrato.
- `apps/api/src/app.ts`: handlers de transporte Fastify delgados.

## Ciclo de vida del job

El runner acepta un job a la vez por defecto. Un job se persiste antes de encolarlo y tras cada transición del ciclo de vida. Las transiciones válidas son:

```text
queued  -> running -> completed
                  -> completed_with_limitations
                  -> failed
                  -> cancelled
queued  -> failed
queued  -> cancelled
```

El timeout de análisis por defecto es de 75 segundos. Un pipeline con timeout o fallido pasa a `failed`; la respuesta pública contiene un código de error estable y ningún stack trace ni cuerpo del proveedor.

## Idempotencia

`POST /analyses` normaliza la URL del repositorio y usa:

```text
canonicalRepositoryUrl | requestedRef | analyzerVersion | ruleSetVersion
```

como clave de idempotencia persistida. Repetir la misma request devuelve el job existente con HTTP `200`; una request nueva devuelve `202`. La clave se basa deliberadamente en la ref solicitada porque el commit lo resuelve el runner. El snapshot resultante sigue anclado al commit SHA resuelto.

## Persistencia

SQLite almacena los metadatos del job y un payload de `AnalysisResult` serializado y validado. El payload del resultado contiene facts, metrics, findings, evidencia minimizada, recomendaciones, puntuaciones por dimensión, limitaciones, metadatos del snapshot y versiones. Los contenidos de archivos del repositorio nunca se almacenan. El adapter soporta `:memory:` para tests y una ruta de archivo para el servidor de la API.

`deleteOlderThan(cutoffIso)` elimina resultados y jobs caducados. La limpieza es una operación explícita idempotente; su programación queda diferida.

## Puntuación

El scorer aplica penalizaciones de severidad documentadas a una puntuación base de 10 por dimensión y la limita a `[0, 10]`. Una dimensión es nullable cuando el resultado no tiene ninguna señal determinista observada para ella. No existe puntuación global. La puntuación no muta findings ni recomendaciones del analyzer.

## API

- `GET /health`
- `POST /analyses` — devuelve `202 { id, status }`, o `200` para un duplicado idempotente.
- `GET /analyses/:id` — metadatos del job y ciclo de vida.
- `GET /analyses/:id/report` — reporte completo mapeado.
- `GET /analyses/:id/findings`
- `GET /analyses/:id/recommendations`
- `GET /analyses/:id/facts`

Los endpoints de reporte devuelven `404 RESULT_NOT_AVAILABLE` hasta que un job tiene un resultado.

## Limitaciones deliberadas

- El runner en proceso no es escalable horizontalmente.
- SQLite es local y usa la API `node:sqlite` experimental de Node; Node 24 es requerido por el rango de engine del proyecto.
- Aún no existe rate limiting de la API; esto sigue siendo endurecimiento de la Phase 7.
- El archivo SQLite por defecto del servidor es `analysis.db`, excluido por `.gitignore`.
- En esta fase no se implementan puntuación global, evaluación con AI, worker, cola, PostgreSQL ni UI de reporte en el frontend.
