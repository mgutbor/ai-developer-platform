# ADR-005 — Salida estructurada de IA

- **Status:** Deferred to Phase 8
- **Date:** 2026-08-26

## Contexto

El texto libre dificulta validar claims, vincular evidencias, deduplicar findings y calcular scores de forma segura. Una respuesta inválida o inventada no debe llegar al reporte.

## Decisión

Solicitar structured output compatible con un schema versionado. Aplicar primero validación sintáctica/schema y después validación de dominio: enums, referencias a evidence existentes, ubicaciones presentes en el snapshot, límites de confidence, severidad permitida y recomendaciones no vacías. Ante fallo se hará un retry acotado para errores recuperables; si persiste, se descarta la contribución AI y se publica el resultado determinista con limitación.

## Consecuencias

- La salida es consumible y comprobable por código.
- Los schemas forman parte del contrato y requieren versionado.
- No todos los providers ofrecen idénticas garantías, por lo que el adaptador debe normalizar y verificar.
- Las respuestas se pueden rechazar aunque sean lingüísticamente plausibles.

## Alternativas consideradas

- **Texto libre parseado con regex:** rechazado por fragilidad y facilidad de bypass.
- **Aceptar JSON sin validar:** rechazado por no proteger el dominio frente a datos incorrectos.
- **Permitir que el LLM calcule el score final:** rechazado porque hace arbitraria una decisión de producto.
