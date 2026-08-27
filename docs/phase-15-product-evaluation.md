# Phase 15 — Evaluación de utilidad del producto y calidad de los findings

## Resumen ejecutivo

La Phase 15 evaluó la utilidad del report mediante fixtures controlados, regresiones existentes y un intento de benchmark real con los cinco repositories públicos definidos en la Phase 14. La validación local confirma que el pipeline determinista produce findings trazables, evidencia sin secretos, recomendaciones enlazadas y scores dimensionales reproducibles. La evaluación semántica con un provider AI real y el benchmark remoto no pudieron validarse en esta ejecución: GitHub devolvió `rate_limited` para los cinco repositories por el límite no autenticado.

**Conclusión:** el producto es técnicamente defendible como MVP de señales deterministas acotadas, pero la utilidad frente a repositories reales sigue **PARTIALLY VALIDATED**. No se modificaron reglas, fórmula de scoring ni arquitectura.

## Metodología de evaluación

- Se reutilizó `apps/api/src/validate-real-repos.ts` sin ejecutar, instalar, compilar ni clonar código externo.
- Se mantuvieron los límites del runner: `maxFileCount: 10`, `maxTotalBytes: 1 MiB`, `maxApiRequests: 14` por repository.
- Se ejecutaron fixtures existentes del analyzer, scoring, AI y API.
- Se revisaron paths, rangos, hashes, snapshot IDs, provenance, relaciones finding/evidence/recommendation y mensajes de coverage.
- No se consideró la ausencia de un archivo fuera del snapshot como ground truth del repository completo.

## Dataset

### Fixtures controlados — VALIDATED

| Caso | Propósito | Resultado |
| --- | --- | --- |
| TypeScript limpio | baseline saludable | PASS |
| TypeScript deficiente | señales de maintainability, testing y code quality | PASS |
| JavaScript/React | señales de lenguaje/framework | PASS |
| Angular | detección de metadatos de Angular | PASS |
| calibración de seguridad | expresiones reales, placeholders, demo y de GitHub | PASS |
| malformado/parcial | archivos inválidos y datos insuficientes | PASS |

### Repositorios públicos — NOT VALIDATED en esta ejecución

| Repositorio | Cobertura prevista | Resultado de ejecución |
| --- | --- | --- |
| `octocat/Hello-World` | diminuto/sin tests | `rate_limited` |
| `sindresorhus/type-fest` | TypeScript limpio | `rate_limited` |
| `expressjs/express` | JavaScript/Node.js | `rate_limited` |
| `angular/angular` | Angular/TypeScript grande | `rate_limited` |
| `facebook/react` | React/JavaScript grande | `rate_limited` |

El informe anterior de la Phase 14 sigue siendo evidencia histórica; esta ejecución de la Phase 15 no lo reutiliza silenciosamente como benchmark medido de nuevo.

## Ground truth

Se estableció ground truth controlado para los casos de seguridad de mayor impacto y de snapshot acotado:

| Regla/caso | Esperado | Real | Clasificación | Confianza |
| --- | --- | --- | --- | --- |
| `AN-SEC-003`, `${{ secrets.GITHUB_TOKEN }}` | sin secreto commiteado | sin finding | correct | high |
| `AN-SEC-003`, `${{ github.token }}` / `${{ env.X }}` / `${{ vars.X }}` | sin secreto commiteado | sin finding | correct | high |
| `AN-SEC-003`, `ghp_...` en source | finding tipo secreto, high | finding high, confianza alta | correct para fixture | high |
| `AN-SEC-003`, valor placeholder | señal informativa low | finding low, confianza baja | correct para fixture | high |
| `AN-SEC-003`, path de demo | no severidad alta | finding low, confianza baja | correct para fixture | high |
| `AN-TEST-001`, tooling presente pero tests ausentes del snapshot acotado | limitación, no afirmación fuerte de ausencia | finding low con wording de snapshot acotado | correct | high |
| `AN-DEP-001`, lockfile excluido por límite de tamaño | no afirmar lockfile ausente | sin finding | correct | high |
| Metadatos raíz de Angular presentes | Angular detectado | Angular detectado | correct | high |

El ground truth de falsos negativos en repositories públicos completos fue **NOT VALIDATED** durante esta ejecución porque el rate limiting de GitHub impidió la ingestion nueva.

## Calidad de los findings

### Findings de seguridad — PASS para casos controlados

`AN-SEC-003` distingue expresiones gestionadas de GitHub, tokens con aspecto de commiteados, placeholders y paths de demo/example. La evidencia usa hashes y no incluye el secreto completo. Esto valida la frontera de implementación, no el recall de un escáner de secretos completo.

### Findings de tests, dependencias, documentación y tooling — PARTIAL

Los mensajes ahora están apropiadamente acotados cuando un snapshot acotado contiene tooling pero no archivos de tests, o cuando un lockfile queda excluido por tamaño. Sin embargo, un finding de ausencia sigue siendo una afirmación sobre los datos observados, no una prueba de que el repository carece de la capacidad. Esta es una limitación de producto, no una regla recién cambiada.

### Findings de arquitectura/imports — PARTIAL

`AN-ARCH-002` es explícitamente heurístico y su confianza es media. Un módulo importado ausente en un snapshot parcial no puede establecer un import sin resolver real. El finding solo es útil como señal de revisión cuando la limitación es visible.

## Evaluación de la evidencia

**Resultado: PASS para integridad del contrato; PARTIAL para suficiencia del desarrollador.**

Propiedades validadas:

- la evidencia apunta a paths normalizados relativos al repositorio;
- los rangos de source son positivos y ordenados cuando están presentes;
- la evidencia referencia el mismo snapshot que el finding;
- los findings referencian evidencia existente;
- la evidencia contiene un hash de excerpt o un valor redactado seguro;
- la evidencia de seguridad no persiste valores completos de secretos;
- el provenance conserva la fuente determinista, el ID/versión de regla y el snapshot ID;
- el SHA del commit está disponible en el snapshot.

Limitación restante: la evidencia de solo hash puede probar que un excerpt de source existió sin mostrar al desarrollador el contexto seguro relevante. Esto preserva la privacidad pero puede reducir la accionabilidad inmediata de algunos findings.

## Evaluación de las recomendaciones

**Resultado: PARTIAL.**

Las recomendaciones están enlazadas a los findings y generalmente proporcionan una acción concreta, como añadir tests, commitear un lockfile, configurar linting o revisar un import. No son generadas por AI y no modifican los resultados deterministas.

La evaluación no estableció una tasa independiente de recomendaciones accionables valorada por humanos. Esa métrica es **NOT ENOUGH DATA** porque la muestra de repositories reales no estaba disponible y no se realizó ninguna evaluación con múltiples revisores.

## Evaluación del scoring

La fórmula existente no se cambió. Los scores siguen siendo dimensionales y anulables; no existe global score.

Validado:

- el scoring repetido determinista produce salida idéntica;
- las señales deterministas insuficientes producen `score: null` y `coverage: insufficient`;
- los snapshots parciales conservan scores numéricos dimensionales solo con una limitación explícita de cobertura parcial;
- ningún score se presenta como score global de calidad del repositorio.

Evaluación: **PARTIAL**. El modelo es mecánicamente coherente, pero un score numérico sobre un snapshot parcial aún puede ser sobreinterpretado por los usuarios. El texto de limitación actual es necesario, pero su comprensión por los usuarios no se probó con desarrolladores reales. Ningún rediseño del scoring se justifica con esta ejecución.

## Evaluación de la cobertura

| Situación | Semántica esperada | Validación |
| --- | --- | --- |
| fixture completo con señales suficientes | `complete` | PASS |
| snapshot acotado o truncado con señales utilizables | `partial` | PASS |
| sin source/señales utilizables | `insufficient` | PASS |
| señal de dependencia no disponible | score dimensional anulable | PASS |
| score dimensional numérico parcial | limitación explícita | PASS |

La cobertura describe correctamente la disponibilidad de datos observados, no la calidad del repositorio. La completitud de metadatos y la completitud de source no están representadas de forma independiente en el modelo actual; esto sigue siendo una limitación para la evaluación futura del producto.

## Evaluación de UX

**Resultado: PARTIALLY VALIDATED.**

El contrato del frontend existente y la página del report exponen coverage, limitaciones, scores anulables, findings, evidencia y recomendaciones. El report distingue el análisis determinista de la interpretación asistida por AI. Los tests existentes cubren el comportamiento de score no disponible y los estados del report.

No validado en esta fase:

- sesiones de usabilidad moderadas con desarrolladores;
- recorrido de teclado/lector de pantalla basado en navegador;
- comprensión del wording de score parcial;
- accionabilidad de las recomendaciones para el usuario final.

Ningún rediseño del frontend se justificó con la evidencia disponible.

## Evaluación de AI

**Provider real: NOT VALIDATED.** No había credenciales de AI configuradas y no se hizo ninguna solicitud en vivo.

**Fake provider: VALIDATED técnicamente.** Los tests existentes confirman:

- construcción de contexto acotada;
- sin blobs de source en el contexto de AI;
- delimitadores deterministas de prompt/datos;
- referencias inválidas de finding/evidence/recommendation rechazadas;
- referencias válidas aceptadas;
- report determinista sin cambios antes y después de AI;
- comportamiento de la API cuando AI está disponible o no;
- limitación de requests sin afectar al report determinista.

La utilidad semántica, la factualidad en la salida en lenguaje natural, la latencia y el coste con un modelo real siguen **NOT VALIDATED**. La AI debe seguir siendo opcional y experimental.

## Métricas

| Métrica | Resultado | Estado |
| --- | --- | --- |
| tasa de falsos positivos en benchmark público | no calculada; las cinco ejecuciones rate-limited | NOT ENOUGH DATA |
| conteo de falsos negativos en benchmark público | no calculado | NOT ENOUGH DATA |
| tasa de findings útiles | no calculada; sin revisión humana independiente | NOT ENOUGH DATA |
| tasa de recomendaciones accionables | no calculada | NOT ENOUGH DATA |
| tasa de adecuación de la evidencia | solo pass de fixture a nivel de contrato; sin muestra humana de adecuación | NOT ENOUGH DATA |
| casos controlados de calibración de seguridad | todos los casos esperados pasaron | VALIDATED, solo scope de fixture |

Ninguna métrica se extrapola de la ejecución remota fallida.

## Resultados del benchmark

El benchmark del mundo real intentado no produjo ningún resultado de análisis porque el rate limit de la API anónima de GitHub estaba agotado. Esta es una limitación operativa del entorno de evaluación, no evidencia de que los repositories fallaran el análisis. Una ejecución futura debe usar un token de GitHub autorizado por el usuario manejado fuera de los logs, o esperar al reset, preservando los mismos caps de ingestión y la misma metodología.

## Defectos descubiertos

1. **Evaluación bloqueada por rate limit externo.** El runner actual no puede producir un benchmark fresco representativo cuando la cuota anónima de GitHub está agotada.
2. **La utilidad humana no está medida.** La trazabilidad técnica no prueba que un desarrollador entienda o actúe sobre un finding.
3. **La comprensión del score parcial no está medida.** El texto de limitación explícito puede seguir siendo comunicación de UX insuficiente.
4. **La evidencia de solo hash puede ser menos accionable de inmediato.** Protege datos sensibles pero no muestra el contexto seguro.

Ningún defecto nuevo del analyzer se demostró con esta ejecución de la Phase 15. No se introdujo ninguna regla nueva ni se hizo ningún cambio de scoring.

## Cambios implementados

- Se creó este informe de evaluación.
- No cambió ningún comportamiento de producción, regla del analyzer, fórmula de score ni arquitectura.

## Evaluación de seguridad

Los siguientes siguen validados por los tests existentes y la revisión de código:

- SSRF y allowlist de hosts de GitHub;
- redirects canónicos seguros;
- protecciones de path traversal, symlink y submódulo;
- límites acotados de archivo/byte/request y timeouts;
- sin ejecución de código externo del repositorio;
- sin persistencia de secretos completos en la evidencia;
- validación y aislamiento de contexto/referencias de AI;
- errores de API saneados.

El recall de findings de seguridad en repositories reales no se midió en esta fase.

## Evaluación de arquitectura

| Componente | Decisión | Evidencia |
| --- | --- | --- |
| Angular | KEEP | tests existentes de report/estados; sin defecto de UX demostrado que requiera sustitución |
| Fastify | KEEP | los tests de integración de la API pasan |
| Capa de aplicación | KEEP | la frontera determinista/AI sigue aislada |
| Runner in-process | KEEP | sin evidencia de carga medida que requiera extracción |
| GitHub REST | KEEP | ingestion segura existente; el rate limit es una restricción del entorno de evaluación |
| Analyzer determinista | KEEP, calibrar después si aparece evidencia | los casos controlados pasan; el recall público no se midió de nuevo |
| Scoring | KEEP | determinista y transparente; la comprensión del usuario sigue por medir |
| SQLite | KEEP | los tests de persistence existentes pasan; sin evidencia operativa para migración |
| AI opcional | KEEP WITH LIMITATIONS | la frontera técnica pasa; la calidad semántica real no está disponible |

No se añadieron workers, colas, cachés, bases de datos, providers ni infraestructura.

## Cambios recomendados para la Phase 16

1. Ejecutar el mismo benchmark con credenciales autorizadas de GitHub no registradas en logs o tras el reset del rate limit.
2. Realizar una pequeña revisión humana con desarrolladores sobre utilidad de findings, suficiencia de evidencia y accionabilidad de recomendaciones.
3. Validar el wording de score parcial mediante un test de UX enfocado antes de cambiar el modelo de scoring.
4. Evaluar la semántica de AI con provider real solo después de configurar credenciales explícitas.
5. Mantener las métricas etiquetadas como medidas, estimadas o no validadas.

## Cambios diferidos

- rediseño de la fórmula de scoring;
- nuevas reglas del analyzer;
- escaneo de secretos más rico;
- rediseño de evidencia hash/contexto;
- workers, colas, Redis, PostgreSQL y sistemas distribuidos;
- funcionalidades en tiempo real y nuevas capacidades de AI.

## Evaluación del v1.0.0

`READY WITH LIMITATIONS` sigue siendo apropiado. La Phase 15 no reveló un defecto bloqueante del release, pero tampoco proporcionó suficiente evidencia fresca del mundo real para subir la confianza ni para reclamar production readiness.

## Recomendación para la Phase 16

La Phase 16 debería ser una fase enfocada de **usabilidad humana + validación de benchmark autorizado**, no una fase de infraestructura. Debería obtener juicios independientes de desarrolladores sobre findings/evidencia/recomendaciones y repetir el benchmark público bajo un presupuesto controlado de la API de GitHub.

## Resumen de estado

- **VALIDATED:** contratos locales, comportamiento determinista, fixtures de calibración de seguridad, relaciones de evidencia, semántica de scoring anulable/parcial, frontera técnica de FakeAI.
- **PARTIALLY VALIDATED:** utilidad del producto, accionabilidad de la evidencia, utilidad de las recomendaciones, comprensión de UX, comportamiento en repositories reales.
- **NOT VALIDATED:** semántica de AI con provider real, métricas frescas de calidad del benchmark público, métricas de utilidad humana, rendimiento de producción.

## Conventional Commit propuesto

```text
test: evaluate product usefulness and finding quality
```
