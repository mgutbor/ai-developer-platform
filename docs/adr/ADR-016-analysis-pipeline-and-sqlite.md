# ADR-016 — Pipeline de análisis y adapter SQLite de la Fase 5

- **Estado:** Aceptado para el MVP
- **Fecha:** 2026-08-26

## Contexto

Las fases 2–4 establecieron paquetes puros de dominio, ingestión y analyzer determinista, pero no existía un camino ejecutable desde una request HTTP hasta un reporte persistido. El MVP necesita un corte vertical pequeño conservando la opción de extraer un worker o cambiar el almacenamiento más adelante.

## Decisión

Componer el pipeline en `apps/api` mediante un servicio de aplicación y un runner en proceso. El runner persiste el estado de `AnalysisJob`, llama a la ingestión de GitHub, pasa el resultado acotado al analyzer, aplica la puntuación determinista por dimensiones, persiste el reporte validado y expone endpoints de reporte de solo lectura.

Usar SQLite a través de `packages/persistence`, encapsulado tras `AnalysisJobRepository` y `AnalysisResultRepository`. Usar la API `node:sqlite` de Node 24 en lugar de añadir un ORM o una dependencia de cliente de base de datos. Almacenar los payloads de reporte solo tras la validación de dominio; nunca almacenar blobs del repositorio.

Usar una clave normalizada de repositorio/ref/versión para la creación idempotente. Mantener ausente la puntuación global, preservar las dimensiones nullable y mapear los objetos de dominio a los contratos de API de forma explícita.

## Consecuencias

- El primer flujo de producto completo es ejecutable y testeable sin infraestructura distribuida.
- Los jobs sobreviven a reinicios del proceso cuando se configura una ruta de SQLite respaldada por archivo.
- El runner en proceso y la base de datos SQLite local no son escalables horizontalmente.
- Node 24 y su API SQLite experimental son requisitos de runtime de este adapter.
- Timeout, limpieza, rate limiting y la extracción de un worker externo siguen siendo decisiones explícitas de endurecimiento futuro.

## Alternativas consideradas

- **Procesamiento síncrono de la request:** rechazado porque no proporciona un ciclo de vida estable para una ingestión acotada pero potencialmente lenta.
- **Cola externa y worker:** diferido hasta que la duración, la concurrencia o la disponibilidad medidas lo exijan.
- **ORM o dependencia de cliente SQLite:** rechazado por el pequeño esquema del MVP y la superficie de runtime innecesaria.
- **Puntuación agregada global:** diferida porque la comparabilidad de dimensiones y la calibración aún no están establecidas.
