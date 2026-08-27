# Phase 18 — Validación final del producto

## 1. Resumen ejecutivo

La Phase 18 realizó la revisión final de evidencia sin cambiar reglas del analyzer, scoring, arquitectura ni comportamiento de AI.

Un benchmark nuevo de al menos 15 repositorios no pudo ejecutarse en este entorno: la API anónima de GitHub solo tenía 2 requests restantes (`60` totales, `58` usados) al inicio de la fase. El benchmark anterior de cinco repositorios se registra como evidencia histórica en `docs/phase-16-real-world-evaluation.md`; no se presenta como una medición nueva de la Phase 18.

La decisión final es:

```text
GO WITH LIMITATIONS
```

Esto significa que el MVP puede continuar como release acotado y explícitamente limitado, pero la evidencia no respalda claims de exactitud amplia, utilidad humana, calidad de AI en vivo ni production readiness.

## 2. Metodología

La fase usó el pipeline acotado existente y los siguientes controles:

- sin clonado de repositorios;
- sin instalación de dependencias de los repositorios analizados;
- sin ejecución de código, scripts, tests ni builds externos del repositorio;
- sin cambios de analyzer, scoring, arquitectura ni AI;
- sin revisores simulados ni respuestas de usuarios;
- sin solicitud ni creación de credenciales;
- sin infraestructura nueva.

El benchmark previsto de 15 repositorios se intentó conceptualmente pero no se lanzó porque la cuota disponible de GitHub era insuficiente. Esto es una **EXTERNAL SERVICE LIMITATION**, no un fallo del producto.

## 3. Benchmark real

### Estado del benchmark de la Phase 18

```text
NOT VALIDATED
```

Ampliación del benchmark requerida: no ejecutada. La cuota disponible de GitHub era de 2 requests, mientras que el runner existente necesita varios requests por repositorio. No se fabricaron resultados y el dataset no se redujo silenciosamente.

### Contexto histórico del benchmark

El benchmark real verificado más reciente sigue siendo los cinco repositorios de la Phase 16:

| Repositorio | Commit | Estado | Cobertura | Archivos | Findings | Duración |
|---|---|---|---|---|---|---:|---:|
| `octocat/Hello-World` | `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` | completed | insufficient | 1 | 3 | 1.08 s |
| `sindresorhus/type-fest` | `3fe02d33596f8afa167bc465d9d9ac9ab81b497e` | completed | partial | 10 | 6 | 3.27 s |
| `expressjs/express` | `023767fe9872e029271df1418f73401bff20ff40` | completed | partial | 10 | 4 | 3.39 s |
| `angular/angular` | `133cafda42028fbd8efd7840d6ff3fea25223166` | completed | partial | 10 | 2 | 3.46 s |
| `facebook/react` | `29d9d3184484b03cb0369e0494617207df777b7a` | completed | partial | 10 | 3 | 3.79 s |

Estas cifras son mediciones históricas de la Phase 16, no mediciones de la Phase 18.

## 4. Ground truth

El ground truth disponible se limita a fixtures controlados y a la inspección previa del benchmark:

- las expresiones de secretos gestionadas de GitHub Actions se excluyen de los findings de secreto commiteado;
- los valores realistas con aspecto de secreto se tratan como señales de alta confianza/severidad alta;
- los placeholders y los valores de demo/example se clasifican de forma conservadora;
- los redirects canónicos de GitHub se manejan de forma segura;
- los metadatos de Angular se detectan cuando están seleccionados;
- los imports sin resolver heurísticos exponen confianza media;
- los findings de lockfile y de ausencia están acotados al snapshot cuando la cobertura es parcial.

No se estableció un ground truth estadísticamente representativo de la Phase 18:

```text
Precision = NOT VALIDATED
Recall = NOT VALIDATED
Tasa de falsos positivos = NOT VALIDATED
Conteo de falsos negativos = NOT VALIDATED
```

Ningún caso UNKNOWN se convirtió en TRUE_POSITIVE o FALSE_POSITIVE.

## 5. Exactitud de los findings

Estado:

```text
PARTIALLY VALIDATED
```

Los casos controlados existentes y el benchmark histórico de cinco repositorios respaldan las siguientes conclusiones:

- la calibración de seguridad es defendible para los fixtures positivos y negativos testeados;
- los findings de ausencia sobre snapshots parciales no deben interpretarse como ausencia en todo el repositorio;
- la detección de imports sin resolver es heurística en lugar de resolución semántica de módulos;
- el report determinista conserva las relaciones de regla, severidad, confianza, evidencia y recomendación.

La exactitud amplia en el mundo real sigue en `NOT VALIDATED` porque el benchmark de la Phase 18 no pudo ejecutarse y la muestra existente es demasiado pequeña para claims globales.

## 6. Evaluación de la evidencia

Estado:

```text
PARTIALLY VALIDATED
```

Propiedades de contrato verificadas:

- paths normalizados relativos al repositorio;
- rangos de línea donde hay ubicaciones de source disponibles;
- provenance de snapshot y commit;
- referencias finding-a-evidencia;
- manejo de solo hash para evidencia sensible;
- sin valores completos de secretos en la evidencia persistida.

Clasificación de accionabilidad para el desarrollador en una muestra suficientemente amplia revisada por humanos:

```text
Tasas ACTIONABLE / PARTIALLY_ACTIONABLE / NOT_ACTIONABLE = NOT VALIDATED
```

Limitación conocida: la evidencia de solo hash mejora la confidencialidad pero puede requerir que el desarrollador inspeccione el repositorio de forma independiente.

## 7. Evaluación de las recomendaciones

Estado:

```text
PARTIALLY VALIDATED
```

Las recomendaciones son deterministas, están enlazadas a los findings y generalmente sugieren acciones como añadir tests, configurar linting, revisar imports o commitear un lockfile.

Confirmación independiente de desarrolladores de que las recomendaciones son consistentemente específicas y accionables:

```text
NOT VALIDATED
```

No se introdujeron recomendaciones generadas por AI.

## 8. Evaluación del scoring

Estado:

```text
PARTIALLY VALIDATED
```

El scoring dimensional actual sigue siendo determinista, anulable donde los datos son insuficientes y acompañado explícitamente de cobertura y limitaciones. Ningún cambio de fórmula se justificó con la evidencia disponible.

El riesgo restante es la interpretación: un score numérico sobre un snapshot parcial puede confundirse con una valoración completa de salud del repositorio. Esto es un riesgo de presentación/comprensión, no una prueba de que la fórmula sea matemáticamente incorrecta.

No se calcula ningún score global.

## 9. Evaluación humana

```text
HUMAN EVALUATION = NOT VALIDATED
```

No había desarrolladores independientes disponibles. No se generaron métricas de finalización de tareas, comprensión, confianza, satisfacción ni utilidad.

Las tareas futuras preparadas son:

1. identificar los problemas detectados más importantes;
2. localizar un finding en el repositorio;
3. explicar la evidencia de respaldo;
4. indicar la siguiente acción;
5. explicar `coverage: partial`;
6. decidir si el score representa la salud completa del repositorio.

El revisor debe recibir el report sin coaching y los resultados deben registrarse solo cuando participen revisores reales.

## 10. Evaluación live de AI

No había credenciales server-side de AI configuradas.

```text
AI LIVE VALIDATION = NOT VALIDATED
AI SEMANTIC USEFULNESS = NOT VALIDATED
AI LIVE COST = NOT VALIDATED
AI LIVE LATENCY = NOT VALIDATED
```

Los tests existentes de FakeAIProvider validan solo la integración técnica: contexto acotado, salida estructurada, validación de referencias, aislamiento de fallos y preservación del report determinista. No son evidencia semántica sobre un modelo real.

## 11. Scorecard de utilidad del producto

| Área | Estado | Evidencia y límites |
|---|---|---|
| Exactitud del analyzer | PARTIALLY VALIDATED | fixtures controlados y cinco repositorios reales históricos; sin muestra ampliada de la Phase 18 |
| Utilidad de la evidencia | PARTIALLY VALIDATED | provenance y referencias testeadas; accionabilidad independiente no medida |
| Utilidad de las recomendaciones | PARTIALLY VALIDATED | acciones deterministas enlazadas observadas; accionabilidad humana no medida |
| Comprensión del scoring | NOT VALIDATED | presentación de source revisada; sin tareas independientes de comprensión |
| Usabilidad del frontend | PARTIALLY VALIDATED | plantillas, labels, estados, semánticas e interpolación segura revisadas; sin estudio de navegador/usuario |
| Confianza en seguridad | VALIDATED para controles testeados | SSRF, redirects, protecciones de path, redacción y fronteras de AI cubiertos; recall exhaustivo no establecido |
| Utilidad de AI | NOT VALIDATED | sin credenciales de provider real; solo integración fake |
| Preparación operativa | NOT VALIDATED | sin evidencia de carga de producción, despliegue, multi-instancia, backup ni HA |

No se reporta ningún score global artificial.

## 12. Defectos encontrados

No se estableció ningún defecto nuevo de producción durante la Phase 18 porque el benchmark ampliado del mundo real y la evaluación humana independiente no estuvieron disponibles.

Los riesgos de producto conocidos permanecen:

- los snapshots parciales limitan el significado de los findings de ausencia;
- los scores numéricos parciales pueden sobreinterpretarse;
- la evidencia de solo hash puede reducir la accionabilidad inmediata;
- el análisis de imports sin resolver es heurístico;
- la utilidad semántica de AI es desconocida.

Estas son observaciones documentadas, no reclasificadas silenciosamente como defectos.

## 13. Correcciones aplicadas

No se aplicó ninguna corrección de producción.

El único cambio en esta fase es este documento de evaluación. No se modificó ningún código de analyzer, scoring, frontend, API, AI ni infraestructura.

Resumen de decisiones:

| Problema | Decisión | Razón |
|---|---|---|
| Benchmark ampliado bloqueado por cuota de GitHub | DEFER | limitación de servicio externo; no fabricar ni reducir la muestra |
| Utilidad humana | DEFER | sin revisores independientes disponibles |
| Comprensión del score | DEFER | requiere resultados de tareas de revisores reales antes de cambiar presentación/fórmula |
| Calidad semántica de AI | DEFER | sin credenciales seguras de provider server-side |
| Infraestructura nueva | DROP para esta fase | sin necesidad operativa medida |

## 14. Quality gates

Ejecutados después de crear la documentación:

| Comando | Resultado |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm check:architecture` | PASS |
| `pnpm format:check` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS |
| `pnpm build` | PASS |
| `pnpm audit --audit-level=high` | PASS |
| `git diff --check` | PASS |

Total de tests:

```text
75 passing
```

Desglose: 15 domain, 19 GitHub, 17 analyzer, 3 scoring, 2 persistence, 4 AI, 7 API y 4 frontend.

## 15. Decisión final de release

```text
GO WITH LIMITATIONS
```

Justificación:

- el pipeline determinista acotado está técnicamente validado;
- la ejecución previa en repositorios reales se completó para cinco repositorios;
- la seguridad, el provenance, los límites y la separación determinista/AI tienen controles testeados;
- no se introdujo ni dejó sin clasificar ningún defecto de seguridad crítico conocido en esta fase;
- el benchmark ampliado requerido de la Phase 18 no se validó por la cuota de GitHub;
- la utilidad humana, las métricas amplias de exactitud y la calidad real de AI siguen sin validar.

Esta decisión no significa production-ready ni enterprise-ready.

## 16. Limitaciones restantes

- benchmark de 15+ repositorios de la Phase 18: `NOT VALIDATED`;
- la cuota anónima de GitHub impidió nuevas mediciones reales;
- sin revisores humanos independientes;
- sin precision/recall estadísticamente defendibles;
- `maxFileCount = 10` mantiene los findings de ausencia acotados al snapshot;
- los scores parciales pueden sobreinterpretarse;
- sin validación live del provider de AI, coste ni calidad semántica;
- sin E2E de navegador ni auditoría automatizada de accesibilidad;
- sin validación de carga de producción, multi-instancia, backup/recovery ni HA;
- el Node local 25 difiere del Node 24 del proyecto/CI;
- `node:sqlite` sigue siendo experimental.

## 17. Recomendación para el siguiente paso

Ejecutar el benchmark ampliado con una cuota de GitHub autenticada de forma segura o después del reset de la cuota anónima, y después realizar la revisión independiente de desarrolladores con al menos tres participantes reales. Priorizar la recopilación de evidencia sobre los cambios de arquitectura. Validar un provider de AI real por separado solo cuando ya existan credenciales server-side.

## Conventional Commit

```text
test: validate final product readiness
```
