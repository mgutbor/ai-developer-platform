# Phase 17 — Evaluación independiente de desarrolladores y usabilidad del producto

## Resumen ejecutivo

La Phase 17 evaluó el MVP v1.0.0 actual sin cambiar reglas del analyzer, scoring, arquitectura ni comportamiento de AI. El repositorio está limpio al inicio de la evaluación, el report existente presenta el análisis determinista por separado de la interpretación opcional de AI, y las plantillas de Angular usan interpolación en lugar de `innerHTML` para el contenido derivado del repositorio o generado por AI.

La pregunta central de utilidad humana no puede responderse en este entorno porque no hay ningún revisor de desarrolladores independiente disponible. Por tanto:

```text
HUMAN EVALUATION = NOT VALIDATED
```

El producto permanece en:

```text
READY WITH LIMITATIONS
```

Esto no es una mejora a un claim de preparación más fuerte. El contrato técnico del report y el comportamiento local están validados, mientras que la comprensión real del desarrollador, la finalización de tareas y la utilidad percibida siguen sin medir.

## Metodología de evaluación

La evaluación usó:

- el benchmark de cinco repositorios y las observaciones documentadas en `docs/phase-16-real-world-evaluation.md`;
- los tests existentes de analyzer determinista, scoring, API, persistence e integración de AI;
- la revisión directa de las plantillas de Angular de home, progress y report;
- una rúbrica estructurada de revisor definida abajo;
- comprobaciones de entorno sobre disponibilidad de revisores y credenciales de AI.

No se ejecutó ningún código del repositorio, no se instalaron dependencias de los repositorios del benchmark y no se simuló ningún feedback humano.

## Dataset y escenarios controlados

Los escenarios de revisión se basan en fixtures existentes y en las salidas del benchmark de la Phase 16:

1. repositorio sin tests;
2. tooling de tests o lint ausente en un snapshot acotado;
3. import relativo sin resolver;
4. finding relacionado con seguridad y evidencia redactada;
5. snapshot parcial;
6. cobertura insuficiente;
7. score dimensional numérico acompañado de limitaciones;
8. dimensión sin findings.

El benchmark de repositorios reales sigue siendo los cinco repositorios de la Phase 16: `octocat/Hello-World`, `sindresorhus/type-fest`, `expressjs/express`, `angular/angular` y `facebook/react`. Sus detalles medidos permanecen en el informe de la Phase 16; esta fase no amplía ni re-ejecuta silenciosamente ese benchmark.

## Evaluación humana independiente

### Disponibilidad

No había ningún revisor de desarrolladores independiente disponible a través del entorno de ejecución.

```text
HUMAN EVALUATION = NOT VALIDATED
```

No se reporta ninguna tasa de finalización de tareas, tasa de malentendidos, confianza del revisor, puntuación de satisfacción, cita ni tasa de utilidad humana.

### Tareas propuestas para el revisor

Estas tareas están listas para una futura revisión independiente y deben darse sin coaching:

- **Tarea A:** Identificar los tres problemas más importantes del repositorio.
- **Tarea B:** Para el finding de mayor prioridad, indicar qué está mal, dónde está, por qué importa y la siguiente acción.
- **Tarea C:** Explicar si un score de 9/10 significa que todo el repositorio es saludable.
- **Tarea D:** Identificar qué partes del repositorio no se analizaron suficientemente.
- **Tarea E:** Decidir si el report es lo bastante confiable para crear una tarea de desarrollo.

### Rúbrica de revisión

| Área | Condición PASS |
| --- | --- |
| Comprensión del finding | El revisor explica qué se detectó y por qué importa. |
| Comprensión de la ubicación | El revisor puede localizar el path y el rango relevantes. |
| Utilidad de la evidencia | El revisor puede explicar por qué la evidencia respalda el finding. |
| Accionabilidad de la recomendación | El revisor puede indicar una siguiente acción concreta. |
| Severidad/confianza | El revisor distingue impacto de incertidumbre. |
| Comprensión del score | El revisor no equipara un score de snapshot parcial con la salud completa del repositorio. |
| Comprensión de la limitación | El revisor identifica qué no se observó. |
| Comprensión del report | El revisor puede responder qué, dónde, por qué, siguiente paso, confianza y límites. |

Los resultados de la rúbrica no son resultados. Requieren un revisor independiente real.

## Calidad de los findings

**PARTIALLY VALIDATED.** Los tests existentes y la evidencia del benchmark de la Phase 16 validan la estructura determinista de los findings, los identificadores de regla, los campos de severidad/confianza, la evidencia vinculada al snapshot y las relaciones de recomendación. El benchmark también estableció que los findings de ausencia sobre snapshots parciales deben interpretarse como observaciones sobre el snapshot seleccionado, no como prueba sobre el repositorio completo.

Las siguientes observaciones siguen siendo relevantes:

- la calibración y redacción de seguridad se validaron con fixtures controlados;
- los findings de import sin resolver son heurísticos y exponen confianza media;
- los findings de ausencia de tests, lint, documentación y dependencias pueden estar limitados por el snapshot;
- no existe una clasificación humana independiente completa de todos los findings del benchmark.

No se estableció ningún defecto nuevo del analyzer en esta fase. Los cambios del analyzer se difieren deliberadamente hasta que haya evidencia reproducible y revisión independiente.

## Calidad de la evidencia

**PARTIALLY VALIDATED.** El report expone paths relativos al repositorio, rangos de línea cuando están disponibles, contexto de snapshot/commit, kinds de evidencia y evidencia de seguridad de solo hash. Esto es suficiente para validar la integridad del contrato y el provenance mediante tests automatizados.

Fricción de producto observada:

- la evidencia de solo hash protege datos sensibles pero es menos accionable de inmediato que un excerpt contextual seguro;
- los snapshots parciales pueden hacer difícil interpretar la evidencia de ausencia sin leer las limitaciones;
- la calidad de la evidencia para un desarrollador no ha sido valorada de forma independiente.

## Calidad de las recomendaciones

**PARTIALLY VALIDATED.** Las recomendaciones son deterministas, están enlazadas a los findings y generalmente describen acciones concretas como añadir tests, configurar linting, revisar imports o añadir un lockfile. Un revisor independiente no ha confirmado que estas acciones sean suficientemente específicas en todos los casos.

```text
ACTIONABLE RECOMMENDATION RATE = NOT VALIDATED
```

No se introdujeron recomendaciones generadas por AI.

## Comprensión del score

**NOT VALIDATED con revisor humano.** El report etiqueta visiblemente la evaluación determinista, la dimensión, el score numérico, la confianza, la cobertura y el conteo de evidencia. Una dimensión `null` se renderiza como `Score unavailable` en lugar de un valor numérico engañoso. Las limitaciones se renderizan en una sección dedicada.

El riesgo restante es la comprensión: un score dimensional alto sobre cobertura `partial` podría seguir leyéndose como salud de todo el repositorio. Este es un riesgo de producto observado del diseño de snapshot acotado, no evidencia de que la propia fórmula de scoring sea incorrecta. La fórmula de scoring no se cambió.

## Revisión de fricción de UX

Esta es una revisión a nivel de código/manual, no un estudio de tareas humanas.

| Área | Clasificación | Base observable |
| --- | --- | --- |
| Envío del análisis | aceptable | inputs etiquetados de URL/ref, validación, estado de submit deshabilitado, alerta de error |
| Progreso/polling | aceptable | mensaje de estado, live region, estado de reintento, enlace al report completado |
| Navegación del report | aceptable | enlaces de report y back, encabezados de sección, tarjetas de findings estables |
| Findings | fricción mayor | los findings de ausencia en snapshot parcial requieren leer con cuidado las limitaciones |
| Evidencia | fricción mayor | la evidencia de seguridad de solo hash es segura pero no inspeccionable de inmediato |
| Recomendaciones | aceptable con incertidumbre | acciones deterministas enlazadas; sin validación independiente de accionabilidad |
| Scoring | fricción mayor | los scores altos parciales pueden sobreinterpretarse sin testing de comprensión del revisor |
| Limitaciones | aceptable | sección visible dedicada, pero la efectividad no está validada humanamente |
| Sección de AI | aceptable | opcional, explícitamente no autoritativa, el fallo preserva el report determinista |

Estas clasificaciones son observaciones de ingeniería, no resultados de satisfacción humana.

## Accesibilidad

**PARTIALLY VALIDATED a nivel de source; validación automatizada/navegador = NOT VALIDATED.**

Observado en las plantillas:

- `main`, `header`, `section`, `article`, encabezados, listas, formularios, labels y botones semánticos;
- labels de formulario visibles y asociación de ayuda/error con `aria-describedby`;
- `aria-live="polite"` para estados de carga/progreso;
- `role="alert"` para errores del report/formulario;
- enlaces, botones y controles de formulario nativos de teclado;
- renderizado de texto interpolado sin uso de `innerHTML`.

No validado:

- recorrido de teclado del navegador en un despliegue en ejecución;
- comportamiento del lector de pantalla;
- mediciones de contraste;
- layout responsive en navegadores reales;
- auditoría axe;
- cumplimiento de WCAG 2.2 AA.

## Evaluación de AI

No había credenciales server-side de AI presentes y no se intentó ninguna solicitud en vivo.

```text
AI LIVE VALIDATION = NOT VALIDATED
AI SEMANTIC USEFULNESS = NOT VALIDATED
```

Los tests existentes de FakeAIProvider/API validan solo propiedades de integración: contexto acotado, validación de salida estructurada, comprobaciones de referencias, aislamiento de fallos y preservación del report determinista. No son evidencia de utilidad semántica ni de calidad del modelo.

## Seguridad

**VALIDATED para los controles testeados existentes; la exhaustividad en el mundo real sigue siendo NOT VALIDATED.** La Phase 17 no introdujo ninguna relajación de seguridad y no ejecutó ningún código externo del repositorio.

Los controles existentes revisados o cubiertos por tests previos incluyen:

- HTTPS y allowlisting de hosts de GitHub;
- redirects canónicos seguros;
- protección de path traversal, symlink y submódulo;
- límites acotados de archivo, byte, request y timeout;
- redacción de secretos/evidencia de solo hash;
- validación de contexto y referencias de AI;
- errores saneados;
- separación determinista/AI.

Esta fase no añadió secretos, tokens, archivos `.env`, bases de datos, logs ni contenidos de repositorios.

## Reproducibilidad

**VALIDATED para el pipeline determinista mediante los tests de regresión e integración existentes.** Entradas idénticas de snapshot/versión preservan facts, findings, evidencia, recomendaciones, orden y scores deterministas dentro del modelo testado. La salida de AI sigue siendo no determinista y consultiva por diseño.

## Rendimiento

Los tiempos del benchmark dependiente de la red de la Phase 16 siguen siendo el único baseline medido disponible: aproximadamente 1.08–3.79 segundos en total para los cinco repositorios, con el trabajo de analyzer y scoring en el rango de milisegundos. No fue necesaria ninguna medición de rendimiento nueva de la Phase 17, y ninguna evidencia justifica workers, colas, caché, Redis, PostgreSQL ni observabilidad distribuida.

La carga de producción, la concurrencia, el comportamiento multi-instancia y los SLO están en:

```text
NOT VALIDATED
```

## Decisión de arquitectura

**KEEP CURRENT ARCHITECTURE.** La Phase 17 no proporciona evidencia para introducir workers, colas, Redis, PostgreSQL, rate limiting distribuido, caché, Playwright, axe-core, RAG, embeddings ni AI multi-proveedor. El pipeline determinista in-process actual sigue siendo la arquitectura más simple consistente con el scope medido.

## Preparación del producto

```text
READY WITH LIMITATIONS
```

### VALIDATED

- el report determinista sigue siendo autoritativo;
- el report separa la evaluación determinista de la interpretación opcional de AI;
- las semánticas de UX a nivel de source, labels, mensajes de estado/error e interpolación segura están presentes;
- los contratos técnicos existentes y las suites de regresión siguen disponibles;
- no se fabricaron claims humanos ni de AI.

### PARTIALLY VALIDATED

- comprensión y accionabilidad de los findings;
- utilidad de la evidencia;
- utilidad de las recomendaciones;
- comunicación de score y limitaciones;
- accesibilidad a nivel de source;
- utilidad sobre snapshots acotados de repositorios reales.

### NOT VALIDATED

- finalización de tareas por desarrolladores independientes;
- utilidad o satisfacción humana;
- tasa de malentendidos del score;
- tasa de adecuación de la evidencia por revisores;
- tasa de recomendaciones accionables por revisores;
- auditoría de accesibilidad de navegador/axe;
- calidad semántica, coste y latencia de AI en vivo;
- carga de producción y operación multi-instancia.

## Limitaciones conocidas

- `maxFileCount = 10` hace que los findings de ausencia estén acotados al snapshot;
- la cobertura parcial puede hacer que los scores dimensionales altos parezcan más fuertes de lo que justifican los datos observados;
- la evidencia de seguridad de solo hash es deliberadamente menos descriptiva;
- no había ningún revisor humano independiente disponible;
- no se ejecutó ningún E2E de navegador ni auditoría automatizada de accesibilidad;
- la validación live del provider de AI sigue sin estar disponible;
- no existe evidencia de despliegue de producción, carga, backup/recovery ni alta disponibilidad;
- las advertencias locales de Node 25 pueden diferir del objetivo Node 24 del proyecto/CI;
- `node:sqlite` sigue siendo experimental en el runtime local.

## Phase 18 recomendada

Realizar un pequeño estudio de desarrolladores genuinamente independiente usando la rúbrica y las cinco tareas anteriores. Reclutar revisores que no implementaran el analyzer, registrar los resultados de las tareas sin coaching y usar los resultados para decidir si el siguiente cambio debe ser de wording de presentación, presentación de evidencia, calibración del analyzer o ningún cambio. Por separado, cuando las credenciales estén configuradas de forma segura, ejecutar una evaluación acotada de AI con provider real. No añadir infraestructura hasta que la evidencia operativa lo requiera.

## Conventional Commit propuesto

```text
test: evaluate developer usability of mvp
```
