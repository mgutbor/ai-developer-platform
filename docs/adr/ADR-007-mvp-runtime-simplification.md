# ADR-007 — Runtime mínimo del MVP

- **Status:** Accepted for MVP
- **Date:** 2026-08-26
- **Supersedes:** parte de ADR-001 y ADR-006 para el alcance inicial

## Contexto

La Fase 0 propuso `web`, `api` y `worker`, junto con un modelo asíncrono y persistencia aún abierta. No existe evidencia de volumen o duración de análisis que justifique desplegar un worker independiente desde el primer commit. El primer objetivo es validar si un reporte determinista tiene valor.

## Decisión

El MVP tendrá una aplicación web Angular y una API modular. La API mantendrá el concepto de `AnalysisJob`, pero ejecutará inicialmente el job mediante un runner en el mismo proceso y un lifecycle persistido en SQLite. El runner debe tener una interfaz que permita extraerlo posteriormente a un worker sin cambiar el dominio ni los contratos.

La primera versión no usará Redis, RabbitMQ, Kafka, PostgreSQL, Kubernetes ni un sistema de realtime. La API puede devolver el estado del job y el frontend puede refrescarlo con polling simple si el análisis no termina en la request inicial.

## Consecuencias

- Menor complejidad de desarrollo, despliegue y debugging.
- El MVP sigue teniendo lifecycle, persistencia e idempotencia verificables.
- La API tiene un límite de concurrencia y no es adecuada para análisis largos a gran escala.
- SQLite debe utilizarse con límites claros de concurrencia y retención.
- Extraer el worker será una tarea posterior cuando la duración, la cola o la disponibilidad lo justifiquen.

## Alternativas consideradas

- **Worker independiente desde el inicio:** rechazado por coste operativo prematuro.
- **Procesamiento completamente síncrono sin `AnalysisJob`:** rechazado porque elimina un contrato útil para jobs largos y dificulta la evolución.
- **PostgreSQL + cola distribuida:** pospuesto hasta disponer de usuarios concurrentes, despliegue multiinstancia o requisitos de disponibilidad.
