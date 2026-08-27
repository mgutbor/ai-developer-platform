# Phase 16 — Benchmark en el mundo real, evaluación humana y validación live de AI

## Resumen ejecutivo

La Phase 16 ejecutó el benchmark reproducible contra los cinco repositories públicos definidos en las fases anteriores, usando exclusivamente la ingestion existente. No se clonaron repositories, no se instalaron dependencias y no se ejecutó código, tests, builds ni scripts externos.

El benchmark completó los cinco análisis. La evidencia confirma que la pipeline determinista es operativa y reproducible en esta muestra, pero la utilidad general del producto sigue **READY WITH LIMITATIONS**: el snapshot del benchmark está deliberadamente limitado a 10 archivos por repository, no hubo revisión humana independiente y no existían credenciales de AI para una validación semántica live.

No se modificaron reglas del analyzer, fórmula de scoring, arquitectura ni comportamiento AI durante esta fase.

## Metodología del benchmark

Runner: `apps/api/src/validate-real-repos.ts`.

Límites utilizados:

- `maxFileCount: 10`;
- `maxTotalBytes: 1 MiB`;
- `maxApiRequests: 14` por repository;
- las protecciones existentes de host de GitHub, redirect, timeout y path no cambian.

El runner registra el SHA del commit, los archivos seleccionados, la cobertura, las limitaciones, los facts, los findings, los scores dimensionales y los tiempos por fase. Los resultados se escribieron en `/tmp/phase13-results.json`; los contenidos del repositorio no se persistieron.

El entorno local reportó Node `25.3.0`, mientras que el engine del proyecto sigue siendo Node 24 (`>=24.15.0 <25`). Esto produjo advertencias pero no falló los gates.

## Dataset y resultados del benchmark

| Repositorio | SHA del commit | Estado | Cobertura | Archivos | Findings | Rango de score | Duración |
| --- | --- | --- | --- | ---: | ---: | --- | ---: |
| `octocat/Hello-World` | `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` | completed | insufficient | 1 | 3 | 8.5–10 | 1.08 s |
| `sindresorhus/type-fest` | `3fe02d33596f8afa167bc465d9d9ac9ab81b497e` | completed | partial | 10 | 6 | 9–10 | 3.27 s |
| `expressjs/express` | `023767fe9872e029271df1418f73401bff20ff40` | completed | partial | 10 | 4 | 9–10 | 3.39 s |
| `angular/angular` | `133cafda42028fbd8efd7840d6ff3fea25223166` | completed | partial | 10 | 2 | 9–10 | 3.46 s |
| `facebook/react` | `29d9d3184484b03cb0369e0494617207df777b7a` | completed | partial | 10 | 3 | 9–10 | 3.79 s |

Los cinco repositories se ingirieron correctamente en esta ejecución. `facebook/react` se manejó correctamente a través del redirect canónico seguro de GitHub implementado en la Phase 14.

Los scores anteriores son scores dimensionales, no un score global de calidad del repositorio. Los valores numéricos sobre snapshots parciales deben interpretarse junto con `coverage` y `limitations`.

## Findings por regla

Findings observados en esta ejecución:

- `AN-TEST-001`: 4 ocurrencias; no se observaron archivos de tests en los snapshots acotados. En los repositories donde se observó tooling de tests, el finding se rebajó a severidad low.
- `AN-TEST-002`: 1 ocurrencia; no se observó tooling de tests en el repository diminuto.
- `AN-TOOL-001`: 1 ocurrencia; no se observó configuración de lint en el repository diminuto.
- `AN-DEP-001`: 2 ocurrencias; no se detectó lockfile en el snapshot seleccionado para type-fest y express. Esto sigue siendo una señal de snapshot acotado, no una prueba de que el repository completo no tiene lockfile.
- `AN-MAINT-001`: 1 ocurrencia; un archivo fuente seleccionado superó la heurística de tamaño configurada.
- `AN-CQ-002`: 2 ocurrencias; la strictness de TypeScript no se verificó en los datos observados.
- `AN-ARCH-002`: 3 ocurrencias; los imports relativos sin resolver son explícitamente heurísticos y de confianza media.

Ningún finding de `AN-SEC-003` fue producido por este benchmark. Los fixtures controlados de seguridad de la Phase 14 siguen siendo la evidencia de los casos positivos y negativos calibrados; esta ejecución no establece el recall completo del escáner de secretos.

## Ground truth y calidad de los findings

El ground truth es parcial y se limita manualmente a findings cuyos metadatos del repositorio pudieron comprobarse desde la salida del benchmark y la estructura conocida del repositorio. No es suficiente para calcular precision o recall de todo el analyzer.

| Caso | Clasificación | Evidencia | Confianza |
| --- | --- | --- | --- |
| Redirect canónico de `facebook/react` | éxito operativo confirmado | commit final e ingestion completada | high |
| Detección del framework Angular | observado confirmado | `framework_detected: angular`, metadatos raíz seleccionados | high |
| Tooling de tests de Express sin archivos de tests seleccionados | plausible / limitado por snapshot | `test_tooling: mocha`, `test_file_count: 0`, cobertura parcial | high |
| Lockfile de React/Angular no disponible por superar el límite de tamaño de archivo | no es prueba de lockfile ausente | limitación explícita `file_too_large` | high |
| Imports de `AN-ARCH-002` | plausibles / requieren revisión manual | resolución heurística y confianza media | medium |
| findings de ausencia en snapshots parciales | evidencia insuficiente para ausencia en todo el repository | file cap y `file_count_limit_reached` | high |

### Evaluación de seguridad

La calibración de seguridad sigue validada por los fixtures controlados existentes, no por un recall amplio en repositories en vivo:

- las expresiones gestionadas de GitHub no se tratan como secretos commiteados;
- los valores fuente realistas con aspecto de secreto producen findings de severidad alta;
- los placeholders y los valores de demo/example se reducen en severidad/confianza;
- los valores completos de secretos no se almacenan en la evidencia.

No se demostró ningún falso positivo de seguridad en este benchmark. Esto no debe interpretarse como prueba de que `AN-SEC-003` tiene recall completo o cero falsos positivos en todos los repositories.

## Evaluación de utilidad del producto

No había ningún revisor humano independiente disponible. La utilidad humana está, por tanto, **NOT VALIDATED**. No se crearon valoraciones de desarrolladores ni feedback simulado.

El contrato del report es técnicamente útil de las siguientes formas validadas:

- los findings contienen regla, categoría, severidad y confianza;
- la evidencia se refiere a paths normalizados relativos al repositorio y al mismo snapshot;
- las recomendaciones están enlazadas a los findings;
- se conservan el SHA del commit y las limitaciones;
- la evidencia de seguridad de solo hash evita exponer valores sensibles;
- la cobertura parcial e insuficiente se representa explícitamente.

La utilidad para el desarrollador sigue **PARTIALLY VALIDATED** porque un snapshot acotado puede hacer menos accionables los findings de ausencia y la evidencia de solo hash puede requerir inspección adicional del repositorio. Una rúbrica estructurada de revisión humana para futuras sesiones es:

| Criterio | Condición PASS |
| --- | --- |
| Comprensibilidad | el revisor puede explicar el finding sin conocimiento de implementación |
| Suficiencia de la evidencia | el revisor puede identificar por qué se disparó el finding |
| Utilidad de la ubicación | el path/range identifica dónde inspeccionar |
| Accionabilidad de la recomendación | el revisor puede nombrar una siguiente acción concreta |
| Severidad/confianza | el revisor coincide en que la incertidumbre se comunica |
| Comprensión de la limitación | el revisor no interpreta el score parcial como calidad total del repositorio |

Esta rúbrica está definida, pero los resultados humanos son **NOT VALIDATED**.

## Evidencia y recomendaciones

**Evidencia: PARTIALLY VALIDATED.** La integridad del contrato y el provenance del snapshot pasan los tests locales. Los paths y rangos están disponibles donde el analyzer tiene una ubicación de source. La evidencia de seguridad sigue siendo redactada/por hash. El benchmark no puede probar que cada ítem de evidencia sea suficiente para que un desarrollador independiente actúe sin abrir el repositorio.

**Recomendaciones: PARTIALLY VALIDATED.** Las recomendaciones existentes son deterministas, están enlazadas a los findings y generalmente orientadas a la acción (tests, lockfiles, linting, revisión de imports). Una tasa independiente de recomendaciones accionables es **NOT VALIDATED** porque no se realizó ninguna revisión humana.

## Cobertura y scoring

Comportamiento de cobertura observado:

- `Hello-World`: `insufficient` porque las señales deterministas utilizables son escasas;
- cuatro repositories más grandes: `partial` porque el snapshot acotado alcanzó los límites;
- ningún repository en esta ejecución fue `complete`.

El modelo de scoring actual no cambia y es determinista. Devuelve correctamente dimensiones anulables cuando las señales son insuficientes y adjunta limitaciones de cobertura parcial a los scores numéricos. El principal riesgo residual de producto es la comprensión: los usuarios pueden seguir leyendo un score dimensional de 9–10 como salud del repositorio a pesar de la cobertura parcial. Esta es una cuestión de comprensión de UX, no evidencia para cambiar la fórmula en esta fase.

Evaluación del scoring: **PARTIALLY VALIDATED**. Ningún rediseño estructural se justifica con esta muestra.

## Reproducibilidad y rendimiento

El benchmark registra salidas deterministas del analyzer y del scoring. Los tests de regresión existentes también verifican el comportamiento determinista para snapshots y versiones del analyzer idénticos. La salida de AI no se considera determinista.

Tiempos por fase observados:

- ingestion: aproximadamente 1.07–3.79 s;
- analyzer: aproximadamente 3.76–13.90 ms;
- scoring: aproximadamente 0.23–0.45 ms;
- total: aproximadamente 1.08–3.79 s.

Estas mediciones son un benchmark pequeño dependiente de la red y **NOT VALIDATED** como baseline de rendimiento de producción. Ninguna evidencia justifica workers, colas, cachés, Redis, PostgreSQL ni un stack de observabilidad distribuido.

## Validación live de AI

No estaban presentes `AI_PROVIDER`, `AI_API_KEY` ni credenciales equivalentes. No se intentó ninguna solicitud en vivo y no se solicitaron ni crearon credenciales.

- solicitud live al provider de AI: **NOT VALIDATED**;
- utilidad semántica: **NOT VALIDATED**;
- latencia/coste reales: **NOT VALIDATED**;
- resistencia a prompt injection contra un modelo real: **NOT VALIDATED**.

El comportamiento del fake provider y de la integración local sigue validado por los tests existentes de AI/API: contexto acotado, validación de referencias, delimitadores de prompt/datos, aislamiento de fallos y report determinista sin cambios.

## Regresión de seguridad

La evaluación no usó ejecución de código externo, instalación de paquetes, clonado, build ni ejecución de tests de los repositories del benchmark. Las protecciones existentes siguen cubiertas por código y tests:

- HTTPS y allowlist de hosts de GitHub;
- redirects canónicos seguros;
- rechazo de path traversal, symlinks y submódulos;
- archivos, bytes, requests y timeouts acotados;
- redacción de secretos/evidencia de solo hash;
- validación de contexto y referencias de AI;
- errores de API saneados.

Estado de seguridad: **VALIDATED para los controles testeados existentes; NOT VALIDATED para el recall exhaustivo en el mundo real.**

## Matriz de evaluación

| Área | Resultado | Confianza | Notas |
| --- | --- | --- | --- |
| Findings de seguridad | PARTIAL | media | la calibración controlada pasa; el recall amplio no se mide |
| Findings de tests | PARTIAL | alta | la limitación de snapshot acotado es visible pero reduce la certeza de ausencia |
| Findings de dependencias | PARTIAL | alta | las semánticas de tamaño/exclusión de lockfile son explícitas |
| Findings de arquitectura | PARTIAL | media | la resolución de imports es heurística |
| Findings de documentación | PARTIAL | media | los metadatos dependen del snapshot seleccionado |
| Calidad de la evidencia | PARTIAL | alta | contrato/provenance pasan; el contexto de solo hash puede reducir la accionabilidad |
| Recomendaciones | PARTIAL | media | enlazadas y deterministas; sin valoración humana independiente |
| Scoring | PARTIAL | alta | determinista y anulable; comprensión del score parcial sin testear |
| Cobertura | PASS para semánticas | alta | el comportamiento complete/partial/insufficient es explícito |
| UX | PARTIAL | baja | solo evidencia automatizada/local; sin navegador ni revisión humana |
| AI | NOT VALIDATED live | alta | sin credenciales; solo integración fake |

## Métricas

Las siguientes métricas **no se calculan** deliberadamente:

- tasa de falsos positivos: **NOT VALIDATED**;
- conteo/recall de falsos negativos: **NOT VALIDATED**;
- tasa de findings útiles: **NOT VALIDATED**;
- tasa de recomendaciones accionables: **NOT VALIDATED**;
- tasa de adecuación de la evidencia: **NOT VALIDATED**;
- calidad semántica, coste y latencia real de AI: **NOT VALIDATED**.

La muestra del benchmark es suficiente para reportar ejecuciones y activaciones de reglas observadas, pero no para reclamar precision, recall o utilidad humana estadísticamente significativos.

## Evaluación de arquitectura

| Componente | Decisión | Razón |
| --- | --- | --- |
| Angular | KEEP | sin evidencia que requiera sustitución |
| Fastify | KEEP | los tests de API/pipeline y la integración del benchmark pasan |
| Capa de aplicación | KEEP | la frontera determinista sigue clara |
| Runner in-process | KEEP | sin evidencia medida de carga o fiabilidad que requiera extracción |
| GitHub REST | KEEP | la ingestion segura y el redirect canónico ya funcionan |
| Analyzer determinista | KEEP | reproducible y útil como generador de señales acotadas |
| Scoring | KEEP WITH LIMITATIONS | determinista, dimensional y anulable; la comprensión sigue sin testear |
| SQLite | KEEP | sin evidencia para migración |
| AI opcional | KEEP WITH LIMITATIONS | la integración técnica pasa; la semántica live no está disponible |

Ninguna infraestructura nueva se justifica con esta fase.

## Preparación del producto

`READY WITH LIMITATIONS` sigue siendo la clasificación apropiada. El MVP es operativo en la muestra del benchmark, pero la evidencia no respalda claims de production-ready, enterprise-ready ni de exactitud amplia.

### VALIDATED

- los cinco repositories públicos requeridos se completaron en el benchmark;
- manejo seguro del redirect canónico para React;
- análisis y scoring acotados deterministas;
- cobertura parcial/insuficiente explícita;
- fronteras de seguridad existentes y sin ejecución de código del repositorio;
- integración local de AI con FakeAIProvider.

### PARTIALLY VALIDATED

- calidad de findings en repositories reales;
- utilidad de evidencia y recomendaciones;
- interpretación del scoring;
- utilidad de UX;
- rendimiento fuera de esta pequeña muestra dependiente de la red.

### NOT VALIDATED

- utilidad humana independiente;
- precision/recall estadísticamente significativos;
- calidad semántica de AI con OpenAIProvider;
- coste de AI y latencia live;
- carga de producción, operación multi-instancia y auditoría de accesibilidad del navegador.

## Phase 17 recomendada

1. Realizar una pequeña revisión independiente de desarrolladores usando la rúbrica anterior.
2. Repetir el benchmark con una muestra controlada mayor y cuota autenticada de GitHub, sin registrar credenciales.
3. Ejecutar una evaluación limitada de AI con provider real solo cuando las credenciales server-side estén configuradas de forma segura.
4. Testear la comprensión del score parcial en el frontend antes de cambiar el scoring.
5. Mantener los cambios de analyzer e infraestructura guiados por evidencia.

## Archivos cambiados

No se cambió ningún archivo de producción en la Phase 16. Este informe es el único artefacto de la Phase 16.

## Conventional Commit propuesto

```text
test: evaluate mvp with real world benchmark
```
