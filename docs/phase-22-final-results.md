# Phase 22 — Resultados finales: Validación de producto / Revisión ground-truth

## Objetivo

Cerrar la Phase 22 limpiamente usando la evidencia ya recopilada, registrar las clasificaciones humanas de Manuel, calcular solo métricas descriptivas defendibles y establecer las conclusiones reales que mueven el proyecto a la siguiente etapa de producto.

Este es el **paso final de la Phase 22**. No crea la Phase 22.4, no añade funcionalidades del analyzer y no cambia ingestion, scoring, UX, E2E ni AI. El dataset se congeló y ejecutó en las Phases 22.1–22.2; las clasificaciones de abajo se aplican a partir de las instrucciones de revisión humana proporcionadas para este cierre. No se modificó ninguna regla del analyzer ni del scoring.

## Dataset

El dataset congelado de 8 repositorios (congelado el **2026-08-27**) definido en `docs/phase-22-ground-truth-dataset.md`:

| # | Repositorio | SHA de commit congelado | Snapshot | Findings |
| --- | --- | --- | --- | ---: |
| 1 | `octocat/Hello-World` | `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` | ok (insufficient) | 3 |
| 2 | `sindresorhus/type-fest` | `3fe02d33596f8afa167bc465d9d9ac9ab81b497e` | ok (partial) | 7 |
| 3 | `expressjs/express` | `023767fe9872e029271df1418f73401bff20ff40` | ok (partial) | 4 |
| 4 | `angular/angular` | `133cafda42028fbd8efd7840d6ff3fea25223166` | ok (partial) | 4 |
| 5 | `react/react` | `29d9d3184484b03cb0369e0494617207df777b7a` | sin snapshot (`ingestion_limit_reached`) | 0 |
| 6 | `vuejs/core` | `d63616ca17de965ed32dcb449a4c5cd9982f15d2` | ok (partial) | 5 |
| 7 | `nestjs/nest` | `a333a9dae6169537da3954c5b1ac35202b057fcb` | ok (partial) | 2 |
| 8 | `vitejs/vite` | `ee644014aab61e546742b862a7d7b0d6c7d67a7b` | sin snapshot (`ingestion_limit_reached`) | 0 |

Total de findings: **25** en 6 repositorios. `react/react` y `vitejs/vite` no produjeron findings porque la ingestion alcanzó `maxApiRequests=125` antes de un snapshot completo de `maxFileCount=50` (limitación documentada de recursos acotados; no se cambiaron límites en esta fase).

## Resumen de ejecución

- Runner: `apps/api/src/validate-ground-truth.ts`; pipeline: ingestion → analyzer → scoring (sin cambios).
- Marca de tiempo de ejecución (UTC): **2026-08-27 16:02**.
- Fuente de verdad: `/tmp/phase22-ground-truth-results.jsonl` y el paquete de revisión `/tmp/phase22-human-review/` (documentado en `docs/phase-22-human-review-package.md`).
- Los 8 SHAs congelados se resolvieron y coincidieron con sus anclas; sin `commit_mismatch`.

## Metodología de clasificación humana

Las clasificaciones se aplican a partir de las instrucciones de revisión humana para este cierre, usando solo las cuatro etiquetas **TP / FP / UNCERTAIN / NOT_EVALUABLE**, basándose en la evidencia de snapshot acotado capturada en las Phases 22.2–22.3.

Reglas de notas de revisor aplicadas de forma consistente:

- **TP**: `Evidence sufficient: YES`, `Actionable: YES`, `Reviewer confidence: HIGH`.
- **UNCERTAIN**: `Evidence sufficient: NO`, `Actionable: YES`, `Reviewer confidence: LOW`.
- **NOT_EVALUABLE**: `Evidence sufficient: NO`, `Actionable: NO`, `Reviewer confidence: HIGH`.

- **AN-ARCH-002** se clasificó como **NOT_EVALUABLE**, nunca FP: la resolución estática acotada falló, pero esto solo demuestra que el import era irresoluble bajo la política acotada — no que el import sea inválido. La limitación de resolver/snapshot es posible.
- Los TP de **AN-MAINT-001** se explican por la condición objetiva de conteo de líneas que respalda directamente el finding.
- NOT_EVALUABLE es una limitación de evidencia, no una afirmación de que la regla sea correcta o incorrecta.

Estas clasificaciones se escribieron en `/tmp/phase22-human-review/*.md` (una entrada por finding).

## Tabla de clasificación completa (25 findings)

Agrupados por repositorio, en el orden exacto de archivo (`F1` = FINDING 1).

| Repo | # | Regla | Severidad | Path / archivo | Rango de evidencia | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| octocat/Hello-World | F1 | AN-TEST-001 | medium | `(none)` | — | **TP** |
| octocat/Hello-World | F2 | AN-TEST-002 | low | `(none)` | — | **TP** |
| octocat/Hello-World | F3 | AN-TOOL-001 | low | `(none)` | — | **TP** |
| sindresorhus/type-fest | F1 | AN-TEST-001 | medium | `(none)` | — | NOT_EVALUABLE |
| sindresorhus/type-fest | F2 | AN-TEST-002 | low | `(none)` | — | NOT_EVALUABLE |
| sindresorhus/type-fest | F3 | AN-TOOL-001 | low | `(none)` | — | NOT_EVALUABLE |
| sindresorhus/type-fest | F4 | AN-DEP-001 | medium | `package.json` | — | NOT_EVALUABLE |
| sindresorhus/type-fest | F5 | AN-CQ-002 | low | `tsconfig.json` | — | NOT_EVALUABLE |
| sindresorhus/type-fest | F6 | AN-MAINT-001 | medium | `lint-rules/validate-jsdoc-codeblocks.js` | L425 | **TP** |
| sindresorhus/type-fest | F7 | AN-ARCH-002 | medium | `index.d.ts` | L2 | NOT_EVALUABLE |
| expressjs/express | F1 | AN-DEP-001 | medium | `package.json` | — | NOT_EVALUABLE |
| expressjs/express | F2 | AN-MAINT-001 | medium | `lib/response.js` | L1048 | **TP** |
| expressjs/express | F3 | AN-ARCH-002 | medium | `examples/auth/index.js` | L7 | NOT_EVALUABLE |
| expressjs/express | F4 | AN-SEC-003 | low | `examples/auth/index.js` | — | UNCERTAIN |
| angular/angular | F1 | AN-TEST-001 | low | `(none)` | — | NOT_EVALUABLE |
| angular/angular | F2 | AN-CQ-002 | low | `(none)` | — | NOT_EVALUABLE |
| angular/angular | F3 | AN-MAINT-001 | medium | `adev/shared-docs/components/viewers/docs-viewer/docs-viewer.component.ts` | L449 | **TP** |
| angular/angular | F4 | AN-ARCH-002 | medium | `.ng-dev/release.mjs` | L44 | NOT_EVALUABLE |
| vuejs/core | F1 | AN-TEST-001 | low | `(none)` | — | NOT_EVALUABLE |
| vuejs/core | F2 | AN-CQ-002 | low | `tsconfig.build.json` | — | NOT_EVALUABLE |
| vuejs/core | F3 | AN-MAINT-001 | medium | `packages-private/dts-test/defineComponent.test-d.tsx` | L2261 | **TP** |
| vuejs/core | F4 | AN-ARCH-002 | medium | `packages-private/sfc-playground/src/download/download.ts` | L3 | NOT_EVALUABLE |
| vuejs/core | F5 | AN-SEC-003 | medium | `packages-private/template-explorer/src/theme.ts` | — | UNCERTAIN |
| nestjs/nest | F1 | AN-CQ-002 | low | `tsconfig.json` | — | NOT_EVALUABLE |
| nestjs/nest | F2 | AN-ARCH-002 | medium | `gulpfile.mjs` | L13 | NOT_EVALUABLE |

## Totales de clasificación

| Clasificación | Conteo |
| --- | ---: |
| TP | 7 |
| FP | 0 |
| UNCERTAIN | 2 |
| NOT_EVALUABLE | 16 |
| **Total** | **25** |

> Nota sobre los totales: el texto instructor de la fase incluía una línea "esperada" de TP=8 / NOT_EVALUABLE=15, pero las clasificaciones explícitas por finding se distribuyen como **TP=7 / NOT_EVALUABLE=16** (no existe un octavo true positive entre las asignaciones por finding). Este documento usa el conteo derivado de las clasificaciones por finding (confirmado por el usuario).

## Métricas descriptivas defendibles

Las métricas de abajo son solo contadores descriptivos y **no** son una estimación validada de exactitud del analyzer.

- **Total de findings**: 25
- **Conteo TP**: 7
- **Conteo FP**: 0
- **Conteo UNCERTAIN**: 2
- **Conteo NOT_EVALUABLE**: 16
- **Findings evaluables** (TP + FP): 7
- **Tasa evaluable**: 7 / 25 = **28.0 %**
- **Tasa TP entre findings evaluables**: 7 / 7 = **100 %**

**Advertencia importante — este 100 % NO es precision estadísticamente válida.** El dataset no contiene negativos etiquetados sistemáticamente (FP = 0 por construcción), solo 7 de los 25 findings fueron evaluables, y 16 fueron NOT_EVALUABLE por la ingestion acotada. TP/(TP+FP) aquí es una cifra descriptiva de una muestra pequeña y sesgada y no debe presentarse como precision del analyzer. **El recall y la tasa de falsos negativos NO se calculan deliberadamente** (no se recopilaron negativos de ground truth; no fabricar falsos negativos). La exactitud del analyzer NO se reivindica.

## Qué demuestra la muestra

- El pipeline determinista (ingestion → analyzer → scoring) se ejecuta de forma reproducible contra el dataset congelado, con uso acotado de recursos y provenance estricto.
- La ingestion acotada funciona dentro de sus límites; donde un snapshot se completa, los findings se producen de forma determinista y trazable.
- La condición de conteo de líneas de AN-MAINT-001 produce verdaderos positivos objetivamente verificables (los cuatro findings de archivo grande donde el snapshot se completó).
- Las reglas basadas en ausencia se disparan de forma significativa en un repositorio mínimo (Hello-World: sin tests / sin tooling de tests / sin config de lint) — confirmado como TP.

## Qué NO demuestra la muestra

- **No** valida la exactitud, precision ni recall del analyzer.
- **No** establece que las reglas basadas en ausencia sean correctas: la mayoría de sus findings fueron NOT_EVALUABLE porque el snapshot acotado puede no contener todos los archivos relevantes.
- **No** determina si los findings de import sin resolver de AN-ARCH-002 son defectos reales, limitaciones del resolver o limitaciones del snapshot.
- **No** proporciona un conjunto de negativos etiquetados, por lo que ninguna métrica FP/FN es defendible.
- **No** cubre `react/react` ni `vitejs/vite` (sin snapshot dentro de `maxApiRequests=125`).

## Limitaciones de ingestion

- La cobertura es `partial` o `insufficient` en la mayoría de los repositorios (`tree_segmented_acquisition`, `tree_segmented_early_termination`, `tree_truncated`, `file_count_limit_reached`, `file_too_large:*`).
- `react/react` y `vitejs/vite` no pueden completar el snapshot previsto de 50 archivos dentro de `maxApiRequests=125` (81+41+3 y 79+43+3 requests respectivamente); el snapshot está ausente (cobertura null), nunca se presenta como completo.
- Los límites **no** se cambiaron en esta fase. Esta es una limitación de validación conocida para una decisión futura de ingestión, fuera del alcance del ground truth.

## Observaciones a nivel de regla

- **Reglas basadas en ausencia** (`AN-TEST-001`, `AN-TEST-002`, `AN-TOOL-001`, `AN-CQ-002`, `AN-DEP-001`) pueden reportar "not detected" incluso cuando el snapshot acotado puede no contener todos los archivos relevantes. Esta es una limitación de semántica de validación/evidencia, documentada aquí en lugar de afirmada como defecto de regla.
- **AN-MAINT-001** produjo los findings directamente verificables más claros de esta muestra (conteo objetivo de líneas > 400). 4/4 instancias de snapshot completado clasificadas como TP.
- **AN-SEC-003** (2 findings) clasificado como UNCERTAIN: solo se persiste un hash; el contenido subyacente no estaba disponible para inspección humana.

## Observación sobre AN-ARCH-002

Los findings de AN-ARCH-002 reflejan un fallo de **resolución estática acotada**, no evidencia de que el import sea inválido. Se clasificaron como NOT_EVALUABLE (no FP). La validación futura debería distinguir:
- import genuinamente sin resolver/inválido;
- import válido no soportado por el resolver estático;
- limitación del resolver;
- limitación del snapshot.

## Limitaciones de los findings de seguridad

Los findings de seguridad donde solo se persiste un hash de excerpt (sin contenido raw retenido para inspección humana) no pueden confirmarse ni refutarse desde el paquete. Se clasificaron como UNCERTAIN. No aparecen credenciales ni tokens en ningún artefacto ni en este documento.

## Decisión

**KEEP WITH LIMITATIONS**

- El analyzer/scoring determinista permanece intacto; ningún cambio de regla de producción se justifica con esta muestra.
- Las limitaciones de ingestion son conocidas (`maxApiRequests=125` vs `maxFileCount=50` para repositorios muy grandes; cobertura parcial en la mayoría de los repositorios).
- La semántica de evidencia basada en ausencia necesita mejora futura (semántica de evidencia más fuerte para que "not detected" no pueda leerse como "ausente", y para que AN-ARCH-002 desambigüe entre limitación del resolver y defecto real).
- La muestra actual es insuficiente para una evaluación defendible de precision/recall.
- El trabajo adicional debería moverse a la **validación a nivel de producto** en lugar de extender indefinidamente el ejercicio de ground truth.

## Cierre de la Phase 22

**La Phase 22 está CERRADA.**

- No se crea la Phase 22.4.
- No se inicia automáticamente ninguna fase adicional de ground truth/validación del analyzer.
- Las clasificaciones están registradas en `/tmp/phase22-human-review/*.md` y resumidas aquí.

## Siguiente etapa recomendada del proyecto

- **Validación y endurecimiento a nivel de producto** (fuera del alcance del ground truth/analyzer): centrarse en la experiencia de producto end-to-end, el mensaje de UX para estados de error/parciales (la cobertura es actualmente `partial`/`insufficient` en la mayoría de los repos), las decisiones de ingestión para repositorios grandes (cobertura cercana dentro del presupuesto), y una semántica de evidencia de ausencia más fuerte impulsada por evidencia futura de producto en lugar de extender esta revisión.

Fuentes: `docs/phase-22-ground-truth-dataset.md`, `docs/phase-22-human-review-package.md`, `docs/phase-22-human-review.md`, `/tmp/phase22-human-review/*.md`, `/tmp/phase22-ground-truth-results.jsonl`.
