# Phase 20 — Benchmark autenticado, cobertura del snapshot y evaluación ground-truth

## 1. Resumen ejecutivo

La Phase 20.2 intentó ejecutar el dataset corregido completo de 15 repositorios públicos con `maxFileCount` 10, 50 y 100. El runner usó autenticación mediante `process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN`, pasó el token explícitamente a `GitHubRestClient` y nunca imprimió ni persistió su valor.

Se inició la ejecución completa de 45 escenarios, pero superó la ventana de ejecución de 600 segundos antes de producir un artefacto completo. El artefacto fue sobrescrito por una re-ejecución diagnóstica dirigida de los tres repositorios implicados en la Phase 20.1, por lo que aquí no se reivindica ningún resultado completo de 45 escenarios. Los escenarios corregidos de `nestjs/nest` se completaron; `microsoft/TypeScript` y `nodejs/node` siguieron bloqueados por el límite documentado de respuesta de árbol recursivo de 4 MiB.

```text
PHASE 20 = NOT COMPLETED
PRECISION = NOT VALIDATED
RECALL = NOT VALIDATED
DECISION = FOLLOW-UP INGESTION DESIGN
```

La evidencia muestra que dos de los 15 repositorios (13,3 %) quedan sistemáticamente excluidos antes de la selección de archivos porque sus respuestas válidas de árbol recursivo superan los 4 MiB. Eso es suficientemente significativo como para requerir una fase futura de diseño de ingestión, pero esta fase no la implementa.

## 2. Estado de la autenticación

- `GITHUB_TOKEN_PRESENT=true`;
- `GH_TOKEN_PRESENT=false`;
- el acceso autenticado a la GitHub API funcionó;
- la resolución del token fue exactamente `process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN`;
- el token se pasó explícitamente como `new GitHubRestClient({ token })`;
- ningún valor de token fue impreso, persistido, commiteado o incluido en artefactos.

## 3. Dataset final

El dataset corregido contiene 15 repositorios:

1. `octocat/Hello-World`
2. `sindresorhus/type-fest`
3. `expressjs/express`
4. `angular/angular`
5. `facebook/react`
6. `microsoft/TypeScript`
7. `nodejs/node`
8. `vitejs/vite`
9. `nestjs/nest`
10. `vuejs/core`
11. `preactjs/preact`
12. `juliangarnier/anime`
13. `lodash/lodash`
14. `remix-run/react-router`
15. `pnpm/pnpm`

Ningún repositorio fue sustituido después de la corrección. `nestjs/nest` es el repositorio canónico verificado que sustituye a la entrada obsoleta `nestjs/nestjs`.

## 4. Metodología

Cada repositorio debía ejecutarse con los tres límites: 10, 50 y 100 archivos. Se utilizó el mismo pipeline existente de ingestion, analyzer y scoring. El runner resolvió el primer commit exitoso y reutilizó ese SHA para escenarios posteriores cuando fue posible.

El benchmark no clona repositorios ni ejecuta código del repositorio. Usa los endpoints REST de GitHub de repositorio, commit, árbol recursivo y blob, y luego ejecuta solo el analyzer y el scorer deterministas locales sobre el snapshot descargado.

La ruta del artefacto temporal legible por máquina es `/tmp/phase20-benchmark.json`. No está commiteado. Contiene errores saneados y resúmenes de findings, no credenciales ni valores de secretos.

## 5. Estado de la ejecución completa

```bash
pnpm --filter @ai-developer-platform/api exec tsx src/validate-real-repos.ts
```

Agotó el tiempo tras 600 segundos. El artefacto temporal fue posteriormente sobrescrito por la re-ejecución dirigida de `microsoft/TypeScript`, `nodejs/node` y `nestjs/nest`; por tanto, el artefacto completo de 45 escenarios no está disponible y sus resultados no se reivindican.

Esta es la razón por la que la Phase 20 sigue en `NOT COMPLETED`, a pesar de que todos los escenarios dirigidos técnicamente ejecutables se completaron.

## 6. Matriz de resultados 15 × 3

La siguiente matriz distingue los resultados observados directamente de la re-ejecución dirigida de los escenarios no reivindicables tras el timeout de la ejecución completa. `NOT RECOVERED` no es un éxito ni un fallo fabricado.

| Repositorio | 10 | 50 | 100 |
|---|---|---|---|
| `octocat/Hello-World` | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí |
| `sindresorhus/type-fest` | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí |
| `expressjs/express` | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí |
| `angular/angular` | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí |
| `facebook/react` | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí |
| `microsoft/TypeScript` | `INGESTION_LIMITATION` | `INGESTION_LIMITATION` | `INGESTION_LIMITATION` |
| `nodejs/node` | `INGESTION_LIMITATION` | `INGESTION_LIMITATION` | `INGESTION_LIMITATION` |
| `vitejs/vite` | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí |
| `nestjs/nest` | completado, 10 archivos, 3 findings | completado, 50 archivos, 3 findings | completado, 100 archivos, 4 findings |
| `vuejs/core` | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí |
| `preactjs/preact` | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí |
| `juliangarnier/anime` | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí |
| `lodash/lodash` | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí |
| `remix-run/react-router` | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí |
| `pnpm/pnpm` | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí | resultado previo de Phase 20; no recontado aquí |

Las mediciones históricas de la Phase 20 no se reetiquetan explícitamente como mediciones nuevas de la Phase 20.2. Los únicos resultados frescos de la re-ejecución dirigida son las tres entradas corregidas anteriores.

## 7. Métricas frescas de la re-ejecución dirigida

La re-ejecución dirigida produjo nueve escenarios: tres escenarios exitosos de `nestjs/nest` y seis fallos por árbol grande.

| maxFileCount | Completados | Fallidos | Archivos procesados | Bytes procesados | Findings | Requests | Latencia total |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 1 | 2 | 10 | 23,924 | 3 | 13 | 4,778.55 ms |
| 50 | 1 | 2 | 50 | 43,370 | 3 | 53 | 18,873.65 ms |
| 100 | 1 | 2 | 100 | 59,550 | 4 | 103 | 35,545.74 ms |

Los seis fallos reportaron cada uno el error saneado `invalid_response`, con tres requests consumidos por escenario fallido. Se clasifican como `INGESTION_LIMITATION` basándose en las respuestas JSON 200 verificadas de forma independiente que superan el límite de respuesta de 4 MiB del cliente.

## 8. Análisis de maxJsonResponseBytes

Comprobaciones autenticadas directas establecieron:

- `microsoft/TypeScript`: árbol recursivo HTTP 200, JSON, aproximadamente 18,010,247 bytes, 51,434 entradas, `truncated=true`;
- `nodejs/node`: árbol recursivo HTTP 200, JSON, aproximadamente 17,399,260 bytes, 56,033 entradas, `truncated=false`;
- los endpoints de repositorio y commit se resuelven correctamente;
- la recuperación directa de blobs funciona para ambos repositorios;
- el `maxJsonResponseBytes=4 MiB` configurado del cliente local rechaza el árbol antes de la selección de archivos.

Por tanto, 2 de los 15 repositorios del dataset (13,3 %) se ven afectados, y los tres escenarios de snapshot de cada uno se ven afectados. Esto no es un defecto del analyzer y no se cambió ningún límite en esta fase.

## 9. Impacto en cobertura y findings

La re-ejecución dirigida fresca confirma que aumentar `maxFileCount` puede añadir findings para `nestjs/nest` (3 → 3 → 4), pero no proporciona una comparación agregada fresca para los 15 repositorios porque el artefacto completo no pudo recuperarse tras el timeout.

El artefacto anterior de la Phase 20 mostraba findings adicionales y bytes/latencia materialmente mayores a 50 y 100, pero esos números históricos no se presentan aquí como mediciones frescas de la Phase 20.2. No se reivindica ninguna conclusión sobre deltas globales de findings a partir de la re-ejecución incompleta.

## 10. Ground truth

En esta fase no se intentó ningún ground truth humano. Por tanto:

```text
PRECISION = NOT VALIDATED
RECALL = NOT VALIDATED
FALSE POSITIVES = NOT VALIDATED
FALSE NEGATIVES = NOT VALIDATED
```

No se afirman falsos negativos a partir de findings ausentes en un límite de archivos menor. Los findings de ausencia siguen acotados al snapshot y no se tratan como ausencia en todo el repositorio.

## 11. Decisión

```text
FOLLOW-UP INGESTION DESIGN
```

Evidencia que respalda esta decisión:

- 2/15 repositorios quedan sistemáticamente excluidos por el límite actual de respuesta de árbol recursivo;
- los repositorios afectados son grandes y relevantes para la diversidad de ecosistema prevista;
- el fallo ocurre antes de la selección de archivos, por lo que aumentar `maxFileCount` no puede recuperar sus señales;
- la respuesta es JSON válido de GitHub, por lo que se trata de una limitación de diseño de ingestion acotada, no de datos externos malformados;
- la limitación afecta a los tres escenarios de cada repositorio afectado.

Aquí no se implementa ningún rediseño. Una fase futura debería investigar la adquisición/paginación acotada de árboles o un diseño equivalente preservando los invariantes de SSRF, requests, bytes, timeout y seguridad.

## 12. Limitaciones restantes

- el artefacto fresco completo de 45 escenarios no se recuperó tras el timeout de 600 segundos;
- no se pueden reivindicar deltas agregados frescos de los 15 repositorios en esta fase;
- dos repositorios siguen afectados por el límite de respuesta de árbol de 4 MiB;
- sin revisión humana ni validación de AI en vivo;
- métricas de precision, recall, falsos positivos y falsos negativos no disponibles;
- los tiempos dependientes de la red no son SLO de producción;
- el Node local `25.3.0` está fuera del rango declarado de Node 24;
- los bytes de cable no están disponibles; los bytes registrados son bytes de archivos procesados;
- no se cambiaron límites de ingestion de producción.

## 13. Conclusión

```text
PHASE 20 = NOT COMPLETED
```

La Phase 20 no puede declararse completada porque la ejecución completa corregida de 45 escenarios no terminó y el artefacto resultante no pudo recuperarse. La evidencia es suficiente para clasificar los fallos restantes de repositorios grandes como casos legítimos de `INGESTION_LIMITATION` y para justificar una fase futura dedicada al diseño de ingestión.

## Calidad y estado del repositorio

Quality gates para el árbol de trabajo actual:

- `pnpm install --frozen-lockfile`: PASS
- `pnpm check:architecture`: PASS
- `pnpm format:check`: PASS
- `pnpm lint`: PASS
- `pnpm typecheck`: PASS
- `pnpm test`: PASS, 75 tests
- `pnpm build`: PASS
- `pnpm audit --audit-level=high`: PASS
- `git diff --check`: PASS

Archivos:

- modificado: `apps/api/src/validate-real-repos.ts`;
- modificado: `docs/phase-20-authenticated-benchmark.md`;
- creado antes y preservado: `docs/phase-20.1-benchmark-failure-analysis.md`;
- artefacto temporal: `/tmp/phase20-benchmark.json`, no commiteado.

No se envió ningún commit, tag, push ni notificación. `~/.knowledge.md` no se usó para notificaciones porque la ejecución completa no terminó y no procede ninguna notificación de éxito.
