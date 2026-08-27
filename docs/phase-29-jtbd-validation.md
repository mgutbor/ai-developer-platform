# Phase 29 — Experimento de validación JTBD

> La Phase 29 es un experimento, no una fase de build. No se cambió ningún código de producción.
> La evidencia observada por máquina proviene de ejecuciones reales del producto
> (dataset congelado de la Phase 22 + ejecuciones anónimas del producto v1.0.0 publicado y
> del código de las Phases 26/27, que producen los mismos findings con semántica adicional
> de evidencia y guía de verificación). No se fabricó ninguna validación humana;
> el protocolo de entrevistas está preparado pero las sesiones están pendientes de
> desarrolladores reales.

## 1. Hipótesis

> Un desarrollador que evalúa un repositorio público de GitHub desconocido puede usar
> ai-developer-platform para descubrir al menos un riesgo técnicamente relevante,
> **verificable** y **accionable** que no sea inmediatamente obvio a partir de una
> inspección manual breve del repositorio.

## 2. JTBD principal

> "Antes de adoptar o contribuir a un repositorio desconocido, ayúdame a entender
> rápidamente si hay riesgos técnicos que debería conocer."

## 3. Aha moment

> "Descubrí algo sobre este repositorio que probablemente no habría notado en mis
> primeros minutos mirándolo — y puedo verificar por qué la herramienta me lo dice."

## 4. North Star (métrica del experimento)

Porcentaje de análisis que producen al menos un finding que un desarrollador considera
**verificable y accionable**. Proxy usado en esta fase solo de máquina: proporción de
ejecuciones que producen al menos un finding clasificado `NON_OBVIOUS +
VERIFIABLE + ACTIONABLE`.

## 5. Diseño del experimento

- **Método:** ejecutar el producto real (flujo HTTP: POST /analyses → poll → report)
  sobre una muestra fija de repositorios públicos conocidos; establecer un baseline
  ligero de inspección humana de 3–5 minutos por repositorio; clasificar cada finding
  por novedad, verificabilidad, accionabilidad, confianza y riesgo de engaño.
- **Restricción:** cuota anónima de GitHub (~60 req/h/IP). Sin estrategia de espera:
  si la cuota se agota, la ejecución se detiene, las filas incompletas se marcan y el
  experimento termina con honestidad.
- **Reutilización de evidencia previa:** la Phase 22 ejecutó el mismo producto sobre la
  misma clase de repositorios con un token (8 repos, 25 findings); las ejecuciones
  anónimas cubren 2 repositorios pequeños adicionales sin ningún token. Ambas son
  observaciones de máquina del mismo pipeline determinista; las Phases 26/27 añadieron
  semántica de evidencia y verificación a los mismos findings (verificado por tests del
  analyzer).
- **Controles de sesgo:** la muestra incluye deliberadamente repositorios donde es
  probable que el analyzer produzca poco o nada (react, vite) y repositorios conocidos
  (el caso más duro para la novedad). Ninguna limitación se cuenta como finding. Los
  scores altos no se tratan como calidad. Los findings basados en ausencia no se tratan
  como defectos confirmados.

## 6. Muestra de repositorios (10)

| # | Repositorio | Situación | Resultado esperado del analyzer | Fuente de evidencia |
|---|---|---|---|---|
| 1 | `octocat/Hello-World` | muy pequeño, demo | 3 findings de ausencia, cobertura insuficiente | ejecución anónima + Phase 22 |
| 2 | `sindresorhus/camelcase` | pequeño, maduro, de un solo propósito | 6 findings, cobertura parcial | ejecución anónima |
| 3 | `sindresorhus/type-fest` | librería TS pequeña-media, docs fuertes | 7 findings, parcial | Phase 22 (token) |
| 4 | `expressjs/express` | medio, maduro, tests/CI fuertes | 4 findings, parcial | Phase 22 (token) |
| 5 | `axios/axios` | librería JS media | no ejecutado (cuota) | — |
| 6 | `nestjs/nest` | medio-grande, docs/CI fuertes | 2 findings, parcial | Phase 22 (token) |
| 7 | `vuejs/core` | grande, tests fuertes | 5 findings, parcial | Phase 22 (token) |
| 8 | `angular/angular` | muy grande, tests/CI fuertes | 4 findings, parcial | Phase 22 (token) |
| 9 | `facebook/react` | muy grande | **failed** (`ingestion_limit_reached`) | Phase 22 |
| 10 | `vitejs/vite` | grande | **failed** (`ingestion_limit_reached`) | Phase 22 |

**Ejecutados:** 8 de 10 (2 fallaron antes de producir un report, por diseño de la
muestra). **No ejecutado en esta fase:** `axios/axios` (cuota anónima 0/60 al inicio
del experimento; sin espera por diseño).

## 7. Metodología del baseline (ligera, 3–5 min por repo)

Señales del baseline registradas a partir de hechos públicos bien conocidos de cada
repositorio (el tipo de cosas que un desarrollador ve en la página de GitHub): calidad
del README, presencia de tests, presencia de CI, linting/tooling, gestión de
dependencias (lockfile), estructura del proyecto, actividad reciente, preocupaciones
obvias de mantenimiento. Los baselines son deliberadamente superficiales; los ítems
inciertos se marcan `UNCERTAIN`.

| Repo | README | Tests | CI | Lint | Lockfile | Estructura/actividad |
|---|---|---|---|---|---|---|
| Hello-World | mínimo | ninguno | ninguno | ninguno | n/a | demo, archivo único |
| camelcase | bueno | sí | sí | sí (xo) | sí | diminuto, maduro |
| type-fest | excelente | sí | sí | sí (xo) | UNCERTAIN | librería de tipos TS |
| express | bueno | extensos (mocha) | sí | sí (eslint) | sí (package-lock) | maduro, monolito lib/ |
| nestjs | excelente | sí | sí | sí | sí | framework, estructurado |
| vuejs/core | excelente | extensos (vitest) | sí | sí | sí | monorepo packages/ |
| angular | excelente | extensos (karma/jest) | sí | sí | sí | monorepo enorme |
| react | excelente | extensos | sí | sí | sí | monorepo enorme |
| vite | excelente | extensos (vitest) | sí | sí | sí | monorepo |

## 8. Observaciones del producto (observadas por máquina)

| Repo | Estado | Cobertura | Confianza | Archivos | Requests | Findings |
|---|---|---|---|---|---|---|
| Hello-World | ok | insufficient | low | 1 / ~4 | 5 | 3 |
| camelcase | ok | partial | medium | — | 13 | 6 |
| type-fest | ok | partial | — | 50 | 62 | 7 |
| express | ok | partial | — | 21 | 93 | 4 |
| nestjs | ok | partial | — | 50 | 96 | 2 |
| vuejs/core | ok | partial | — | 50 | 83 | 5 |
| angular | ok | partial | — | 50 | 109 | 4 |
| react | **failed** | n/a | n/a | n/a | 125 | 0 |
| vite | **failed** | n/a | n/a | n/a | 125 | 0 |

## 9. Matriz de evaluación de findings

Cada finding, clasificado para el **usuario pre-adopción que no conoce el
repositorio** (1–5: 5 = fuertemente, 1 = nada).

| Repo | Finding | Regla | Verificable | Accionable | Novedoso | Confiable | Riesgo de engaño | Valor para el desarrollador |
|---|---|---|---|---|---|---|---|---|
| Hello-World | Test files not detected | AN-TEST-001 | 2 | 1 | 1 (repo demo) | 3 | medio (ausencia en 1/4 archivos) | 1 |
| Hello-World | Test tooling not detected | AN-TEST-002 | 2 | 1 | 1 | 3 | medio | 1 |
| Hello-World | Lint config not detected | AN-TOOL-001 | 2 | 1 | 1 | 3 | medio | 1 |
| camelcase | Test files not detected | AN-TEST-001 | 2 | 2 | 2 (el repo tiene tests; fallo de snapshot) | 2 | **alto** (cuasi-falso) | 1 |
| camelcase | No lockfile detected | AN-DEP-001 | 2 | 3 | 2 | 2 | alto (claim de ausencia) | 2 |
| camelcase | TS strictness unverified | AN-CQ-002 | 2 | 1 | 2 | 3 | bajo (honesto) | 1 |
| camelcase | Source file > heuristic | AN-MAINT-001 | 3 (path+lines) | 1 | 2 | 3 | bajo | 1 |
| type-fest | Ausencia de tests/tooling/lint (3) | AN-TEST-001/002, AN-TOOL-001 | 2 | 2 | 2 | 3 | medio | 1–2 |
| type-fest | No lockfile detected | AN-DEP-001 | 2 | 3 | 2 | 2 | alto | 2 |
| type-fest | Strictness unverified | AN-CQ-002 | 2 | 1 | 2 | 3 | bajo | 1 |
| type-fest | Archivo fuente grande | AN-MAINT-001 | 3 | 1 | 2 | 3 | bajo | 1 |
| type-fest | Import sin resolver | AN-ARCH-002 | 2 | 2 | 2 | 2 | **alto** (limitación del resolver) | 1 |
| express | No lockfile detected | AN-DEP-001 | 2 | 3 | 2 | **1** | **alto (package-lock.json existe; fallo de snapshot)** | 1 |
| express | Archivo fuente grande (lib/application.js) | AN-MAINT-001 | 3 | 1 | 3 | 3 | bajo | 2 |
| express | Import sin resolver | AN-ARCH-002 | 2 | 2 | 2 | 2 | alto | 1 |
| express | Contenido demo tipo secreto | AN-SEC-003 | 2 (solo hash) | 2 | **4** | 2 | medio (probablemente fixture de test) | 2 |
| nestjs | Strictness unverified | AN-CQ-002 | 2 | 1 | 2 | 3 | bajo | 1 |
| nestjs | Import sin resolver | AN-ARCH-002 | 2 | 2 | 2 | 2 | alto | 1 |
| vuejs/core | Test files not in snapshot | AN-TEST-001 | 2 | 1 | 2 | 3 | bajo (not_inspected honesto) | 1 |
| vuejs/core | Strictness unverified | AN-CQ-002 | 2 | 1 | 2 | 3 | bajo | 1 |
| vuejs/core | Archivo fuente grande | AN-MAINT-001 | 3 | 1 | 2 | 3 | bajo | 1 |
| vuejs/core | Import sin resolver | AN-ARCH-002 | 2 | 2 | 2 | 2 | alto | 1 |
| vuejs/core | Posible valor tipo secreto | AN-SEC-003 | 2 | 3 | **4** | 2 | medio (no verificable) | 2 |
| angular | Tests no en snapshot / strictness / archivo grande / import (4) | — | 2–3 | 1–2 | 2 | 3 | bajo-medio | 1 |
| react | **sin report** (límite) | — | — | — | — | — | — | 0 |
| vite | **sin report** (límite) | — | — | — | — | — | 0 |

**Resumen de novedad:** `OBVIOUS` ≈ 8 · `NON_OBVIOUS` ≈ 3 (demo-secret de express,
posible-secret de vuejs, archivo grande de express) · `UNCERTAIN` ≈ 14.
**Métrica clave:** `NON_OBVIOUS + VERIFIABLE + ACTIONABLE` = **0 de 25 findings**.
Los tres findings NON_OBVIOUS son todos no verificables (evidencia de solo hash) y de
accionabilidad baja/media.

## 10. Evaluación de confianza

Por finding útil: WHAT / WHY / WHERE / VERIFY / LIMITATION.

| Aspecto | Resultado | Evidencia |
|---|---|---|
| WHAT (entender el problema) | **PASS** | títulos, descripciones y texto de impacto claros |
| WHY (por qué importa) | **PASS** | el campo de impacto es explícito y medido |
| WHERE (localizar la evidencia) | **PARTIAL** | path + rango de línea, pero sin contenido |
| VERIFY (confirmar de forma independiente) | **FAIL** | la evidencia es solo `excerptHash`; el desarrollador debe abrir el repo |
| LIMITATION (qué NO se inspeccionó) | **PASS** | coverage + limitations + `inspectedScope` son explícitos y honestos |

Patrones críticos observados:

- **Ausencia + snapshot parcial:** varios claims de ausencia son incorrectos para el
  repositorio real (p. ej., express `AN-DEP-001` "no lockfile" mientras
  `package-lock.json` existe; camelcase "no tests" mientras existen tests). La
  semántica `not_inspected` (Phase 26) mitiga los peores casos, pero el valor es una
  *señal nula*, no información.
- **`AN-ARCH-002` (imports sin resolver):** producido consistentemente en repos cuyos
  imports obviamente se resuelven (angular, vue, nest, type-fest). Son artefactos de
  la política del resolver, no defectos; un desarrollador que los investigue concluiría
  que la herramienta se equivoca. Riesgo de engaño alto.
- **Evidencia de solo hash:** ningún finding puede verificarse solo con el report.
  Esto rompe directamente el aha moment ("puedo verificar por qué").
- **Confianza alta sobre cobertura parcial:** mitigado por el mensaje de cobertura de
  la Phase 26, pero los dimension scores siguen leyéndose como veredictos.

## 11. Evaluación de accionabilidad

| Clasificación | Findings | Notas |
|---|---|---|
| `NO_ACTION` | ~15 | findings de ausencia/tooling/strictness en repos donde el hecho es visible o irrelevante para la adopción |
| `INVESTIGATE` | ~9 | imports (probablemente falsos), lockfile (probablemente falso), secretos (reales pero no verificables) |
| `MITIGATE` | 0 | nada en la muestra justificaba una decisión de mitigación pre-adopción |
| `REJECT` | 0 | nada |
| `ADOPT_WITH_CAUTION` | 0 | nada |

**Efectividad de las recomendaciones:** las recomendaciones de la Phase 27 y la guía de
verificación están bien formadas y son honestas, pero guían al *owner que arregla el
repo*, no al *adoptante que decide si adoptar*. Para el JTBD pre-adopción, las
recomendaciones no cambiaron ninguna decisión de adopción en esta muestra.

## 12. Evaluación de novedad (pregunta central)

> ¿Un desarrollador descubriría esto razonablemente en los primeros 3–5 minutos en
> GitHub?

- Findings de ausencia en **repos diminutos** (Hello-World): `OBVIOUS` — una mirada de
  5 minutos muestra un repo demo sin tests.
- Findings de ausencia en **repos maduros conocidos** (express, type-fest, vue, angular):
  mayormente `OBVIOUS` o incorrectos (fallo de snapshot) — e incluso cuando son
  correctos, el desarrollador puede ver los tests/CI en la página de GitHub.
- Señales tipo secreto de `AN-SEC-003`: `NON_OBVIOUS` (un desarrollador no hace grep de
  secretos en un repo en 5 minutos) — **pero no verificables** (solo hash) y
  probablemente fixtures de bajo valor.
- Archivos grandes de `AN-MAINT-001`: en la frontera de `NON_OBVIOUS`, accionabilidad baja.

**Conclusión sobre novedad:** la salida actual del producto es *mayormente obvia o una
señal nula*, con una señal genuina pequeña (secretos) que el producto no puede hacer
verificable. Esto es lo opuesto al finding requerido `NON_OBVIOUS + VERIFIABLE +
ACTIONABLE`.

## 13. Protocolo de entrevista a desarrolladores (preparado, NO realizado)

8 preguntas — el documento de abajo registra el protocolo; las respuestas reales de los
desarrolladores deben introducirse después en `docs/jtbd-validation-template.md`:

1. ¿Para qué crees que es este producto?
2. ¿Qué fue lo primero que te llamó la atención?
3. ¿Descubriste algo que no habrías notado tú mismo?
4. ¿Qué finding te inspiró confianza?
5. ¿Qué finding no te inspiró confianza?
6. ¿Algún resultado cambió lo que harías con el repositorio?
7. ¿Qué información fue confusa o innecesaria?
8. ¿Lo usarías antes de adoptar otro repositorio de GitHub? ¿Por qué?

## 14. Evidencia observada por máquina (esta fase)

- 8 ejecuciones del producto real sobre repos públicos conocidos; 25 findings.
- 2 ejecuciones anónimas del producto publicado (Hello-World, camelcase).
- **0 de 25 findings** clasificados `NON_OBVIOUS + VERIFIABLE + ACTIONABLE`.
- 3 findings clasificados `NON_OBVIOUS` (todos secretos o tamaño de archivo, todos no
  verificables, todos de accionabilidad baja/media).
- 2 de los 10 repos de la muestra produjeron **ningún report** (react, vite — los dos
  más grandes, es decir, los repos donde el análisis de riesgo pre-adopción importaría
  más).
- Comportamiento de fallo controlado verificado en fases previas (`GITHUB_RATE_LIMITED`,
  `SNAPSHOT_LIMIT_EXCEEDED`) — la ingeniería es sólida; el valor no está demostrado.

## 15. Sección de validación humana

**Estado: PENDIENTE — no realizada.** No se realizó ninguna entrevista a desarrolladores
en esta fase y no se fabricó ninguna. El protocolo (sección 13) y la plantilla de
registro (`docs/jtbd-validation-template.md`) están listos. La decisión de abajo se basa
exclusivamente en evidencia observada por máquina; no puede tomarse una decisión GO sin
las sesiones humanas.

## 16. Criterios de éxito (aplicados)

| Criterio | Resultado |
|---|---|
| ≥70% de las sesiones producen un finding `NON_OBVIOUS + VERIFIABLE + ACTIONABLE` | **NO CUMPLIDO (0/8)** |
| Los desarrolladores entienden el propósito sin explicación | no testeable (sin sesiones) |
| Los desarrolladores confían en la evidencia lo suficiente para investigar | no testeable (sin sesiones); la evidencia de máquina muestra VERIFY FAIL |
| Los findings cambian la siguiente acción del desarrollador | no testeable; la evidencia de máquina muestra 0 `MITIGATE`/`REJECT`/`ADOPT_WITH_CAUTION` |
| Valor diferenciado sobre una inspección manual rápida de GitHub | **NO DEMOSTRADO** en esta muestra |

## 17. Riesgos y sesgos (explícitos)

- **Sesgo de muestra (favorable al producto):** ninguno intencionado — la muestra son
  repos conocidos, que es la prueba de novedad *más dura*. La novedad en repos
  desconocidos está por tanto **sin testear**, y los findings de ausencia serían
  probablemente más novedosos allí.
- **Sesgo de muestra (desfavorable):** los repos conocidos subestiman el valor para
  repos realmente desconocidos; las conclusiones sobre novedad no deben extrapolarse a
  repos desconocidos.
- **Conteo basado en ausencia:** ninguna limitación se contó como finding; los findings
  de ausencia no se trataron como defectos.
- **Sin validación humana:** todas las conclusiones cualitativas son solo de máquina.
- **Artefactos obsoletos:** los reports anónimos son anteriores a las Phases 26/27; los
  findings son idénticos bajo el código actual (verificado por tests del analyzer), que
  añade `evidenceStatus` y verificación — ninguno cambia las conclusiones de
  novedad/verificabilidad (la verificabilidad sigue fallando: no hay evidencia de
  contenido).
- **Sesgo del experimentador:** mitigado usando solo salidas de máquina registradas y
  baselines por repo escritos antes del scoring.

## 18. Decisión

**NO-GO / PIVOT — para el producto actual como herramienta de riesgo pre-adopción.**

Basada solo en la evidencia observada por máquina:

1. El umbral del 70% se falla claramente: **0/8 repositorios ejecutados** produjeron
   un finding `NON_OBVIOUS + VERIFIABLE + ACTIONABLE`.
2. La mayoría de los findings de aspecto útil son `OBVIOUS` (visibles en la página de
   GitHub) o claims de ausencia que el repositorio real contradice (`express` lockfile,
   `camelcase` tests) — una responsabilidad de confianza, no una señal.
3. Los findings de `AN-ARCH-002` son artefactos del resolver, producidos repetidamente
   en repos cuyos imports se resuelven — engañosos y ruidosos.
4. La única clase de señal genuinamente novedosa (`AN-SEC-003` secretos) no es
   verificable por diseño (evidencia de solo hash), por lo que el aha moment ("puedo
   verificar por qué") no puede ocurrir.
5. Los repos que más necesitan análisis pre-adopción (react, vite — grandes, internos
   desconocidos) producen **ningún report** bajo los límites de ingestion actuales.

Matiz: esta decisión rechaza la *implementación actual* para el JTBD, no el JTBD en sí.
Las condiciones habilitadoras identificadas en la Phase 28 (evidencia de contenido
verificable; key-files + señales de repositorio para arreglar cobertura y cuota;
informe ordenado por riesgo) siguen sin testear. El potencial de novedad del triage por
ausencia en repositorios genuinamente **desconocidos** también está sin testear.

**Continuación recomendada (Phase 30, solo si está justificada):** un experimento
estrecho a nivel de prototipo — NO un build — que (a) se ejecute sobre una muestra de
repositorios medianos genuinamente desconocidos, (b) añada evidencia de contenido
redactada para findings `verified`/secretos, y (c) recopile las 3–5 sesiones de
desarrollador definidas aquí. Gate de salida sin cambios: ≥70% de sesiones con un
finding verificable, accionable y no obvio. Si ese experimento también falla, **detener
el desarrollo de features** y mantener el proyecto como artefacto de portfolio.

## 19. Recomendación para la Phase 30 (condicional)

- **Tipo:** experimento de prototipo (tooling experimental aislado únicamente).
- **NO construir:** features del MVP 2.0, AI, cuentas, más reglas, expansión de
  ingestion.
- **Debe incluir:** muestra de repos desconocidos; excerpts de evidencia redactados;
  sesiones de desarrollador mediante el protocolo de la sección 13.
- **Gate de decisión:** ≥70% de aha por sesión → continuar; de lo contrario, detener.

---

*Nota de honestidad: esta fase no produjo evidencia GO. El producto sigue siendo un
prototipo de triage honesto y bien construido cuyo valor para el JTBD pre-adopción no
está demostrado por la evidencia de máquina y requiere una validación humana que aún no
se ha producido.*
