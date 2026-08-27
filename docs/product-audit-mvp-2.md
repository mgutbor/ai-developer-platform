# Auditoría de producto — Definición del MVP 2.0 (Phase 28)

> La Phase 28 es una fase de estrategia y planificación de validación. No se cambió ningún código.
> Los veredictos se basan en la implementación real (analyzer, scoring, ingestion,
> contratos, frontend), ejecuciones E2E reales de las Phases 22–27 y la auditoría
> conceptual del v1.0.0 (`docs/product-audit-v1.0.0.md`).

## 1. Resumen ejecutivo

`ai-developer-platform` es un analyzer determinista y de configuración cero de
repositorios públicos de GitHub: pega una URL, obtén un report con findings, estado de
evidencia, dimension scores, recomendaciones y guía de verificación. Funciona, es
honesto sobre sus limitaciones y está excepcionalmente bien construido para un MVP.

El valor para el desarrollador es, sin embargo, **bajo-moderado (3–4/10)**. La razón no
es la calidad de la ingeniería — es que el producto actual compite, para repos que un
desarrollador ya posee, con herramientas estrictamente mejores en cada trabajo
individual (ESLint, TypeScript, SonarCloud, Dependabot, CodeQL, gitleaks, CI, IDE).
Para repos que el desarrollador **no** posee, el producto actual a menudo no es
utilizable en absoluto: la ingestion acotada supera la cuota anónima de GitHub para
repositorios mayores que diminutos, y el modelo de evidencia aún no permite a un
desarrollador verificar un finding sin abrir el repositorio.

Existe, sin embargo, un nicho defendible donde la arquitectura existente tiene una
ventaja estructural real: **un snapshot de riesgo técnico de configuración cero de un
repositorio público desconocido antes de adoptarlo, usarlo como dependencia o
contribuir a él.** Ninguna herramienta competidora ofrece esto con cero setup, sin
clon, y una declaración explícita y auditable de qué se inspeccionó y qué no.

**Veredicto: continuar, pero estrechar el producto a ese trabajo.** El "analyzer
general de repositorios" actual no es un producto diferenciado. El snapshot de
due-diligence sí lo es. La Phase 29 debe validar esa hipótesis con un experimento fino
antes de cualquier build significativo.

## 2. Realidad actual del producto (factual)

### Input
Una URL de repositorio público de GitHub (opcionalmente un ref). Nada más. Sin cuentas,
sin auth, sin configuración. El acceso anónimo a GitHub funciona dentro de la cuota de
IP (~60 requests/hora); un `GITHUB_TOKEN` opcional server-side la eleva a
~5,000/hora.

### Pipeline
```
URL → AnalysisJob → GitHub REST → ingestion acotada → analyzer determinista
→ scoring → persistence SQLite → report API → frontend Angular
```

### Ingestion acotada (límites reales)
- `maxFileCount = 50` archivos
- `maxApiRequests = 125` requests por análisis
- `maxJsonResponseBytes = 4 MiB` por respuesta
- `maxTotalBytes = 2 MiB` de contenido total de archivos
- `maxFileBytes = 256 KiB` por archivo
- `maxTreeEntries = 5000` entradas de árbol
- timeout de request 10 s, timeout de análisis 60 s
- recorrido segmentado de árbol con terminación temprana que preserva la semántica
  (Phase 21), protección de árboles visitados, sin obtención de blobs antes de la
  selección final

### Analyzer
14 IDs de regla en 6 dimensiones, totalmente deterministas:
- documentación: `AN-DOC-001` (README ausente)
- testing: `AN-TEST-001` (sin archivos de tests), `AN-TEST-002` (sin tooling de tests)
- tooling/code quality: `AN-TOOL-001` (sin config de lint), `AN-CQ-002`
  (strictness sin verificar), `AN-CQ-003` (strict deshabilitado), `AN-CQ-004`
  (conteo de TODO/FIXME), `AN-CQ-005` (directivas TS ignore)
- dependencias: `AN-DEP-001` (manifest sin lockfile)
- maintainability: `AN-MAINT-001` (archivo fuente > heurística de 400 líneas)
- arquitectura: `AN-ARCH-001` (anidamiento profundo), `AN-ARCH-002` (import sin resolver)
- seguridad: `AN-SEC-002` (nombre de archivo sensible), `AN-SEC-003` (valores
  tipo secreto commiteados / posibles / placeholder / demo; **solo se almacena un hash**)

### Output (report)
- identidad del repositorio, SHA de commit, versiones del analyzer/reglas
- cobertura: `complete | partial | insufficient`
- confianza: `high | medium | low`
- `inspectedScope`: conteo de archivos, entradas de árbol vistas, bytes totales
- dimension scores (0–10 o `null` cuando las señales son insuficientes) para
  arquitectura, maintainability, testing, documentación, dependencias,
  code quality — **sin global score** (decisión explícita del MVP)
- findings con severidad, categoría, título, descripción, impacto,
  `evidenceStatus` (`verified | absence_based | not_inspected | not_verified`)
- evidencia: kind, path, rango de línea, `excerptHash` estable — **sin excerpts de
  contenido** (decisión de seguridad deliberada)
- recomendaciones con título, descripción, prioridad y **guía de verificación**
  (añadida en la Phase 27)
- lista de limitaciones, códigos de error (`SNAPSHOT_LIMIT_EXCEEDED`,
  `GITHUB_RATE_LIMITED`, etc.)

### Observaciones E2E reales (Phases 22–23, experimento de valor de producto)
- `octocat/Hello-World`: completado en ~3 s, **1 de ~4 archivos** ingeridos,
  cobertura `insufficient`, 3 findings basados en ausencia, 6 dimension scores.
- `sindresorhus/camelcase`: completado, cobertura `partial`, 6 findings.
- `sindresorhus/type-fest` (pequeño-medio): **consumió las 60 requests anónimas**
  y falló con `GITHUB_RATE_LIMITED`; sin report.
- `expressjs/express`: sin cuota disponible; falló de inmediato, controlado.
- react/react y vitejs/vite (Phase 22): `maxApiRequests=125` agotado antes de
  un snapshot de 50 archivos; sin findings.

## 3. Journey del desarrollador (lo que un desarrollador recibe realmente)

```
INPUT:   una URL de GitHub de un repositorio público
ANALYSIS: configuración cero; en cola → ejecutándose → report (segundos a ~1 min)
REPORT:   banner de cobertura, dimension scores, findings, recomendaciones, limitaciones
FINDING:  título + descripción + impacto + severidad + evidenceStatus
WHY:      texto de impacto ("por qué importa")
ACTION:   título + descripción de la recomendación
VERIFY:   guía de verificación ("cómo verificar", Phase 27)
```

Dónde se rompe el journey:

1. **Techo de cobertura.** Para cualquier repositorio por encima de "diminuto", el
   report se construye sobre un snapshot parcial; para repos medios+ falla con
   frecuencia por completo (cuota anónima) o devuelve ningún finding (react/react,
   vitejs/vite). El desarrollador no puede obtener ningún report para los repositorios
   que más valdría la pena analizar.
2. **Domina la ausencia.** La mayoría de los findings son `absence_based` ("X no fue
   detectado en el snapshot inspeccionado"). Son honestos pero débiles: no pueden
   confirmar un defecto, y un desarrollador que posee el repo ya sabe si tiene tests.
3. **La evidencia no es contenido verificable.** La evidencia apunta a un path y un
   hash. El desarrollador no puede ver *qué se observó* sin abrir el repositorio —
   momento en el que la propuesta de valor del producto (entender sin el repo) se
   derrumba.
4. **Los scores arriesgan falsa precisión.** `8.5/10` sobre un snapshot parcial se lee
   como veredicto de calidad incluso con el framing de honestidad; los dimension
   scores añaden credibilidad al report pero poco poder de decisión.

## 4. Auditoría del output del desarrollador

| Output | ¿Existe? | ¿Comprensible? | ¿Accionable? | ¿Verificable? | Valor real |
|---|---|---|---|---|---|
| Finding | SÍ | SÍ | PARCIAL | NO (sin contenido) | MEDIUM |
| Evidence | SÍ | SÍ (estado) | NO | PARCIAL (path/rango) | LOW |
| Coverage | SÍ | SÍ | SÍ (fija expectativas) | SÍ | MEDIUM-HIGH |
| Confidence | SÍ | PARCIAL (puede implicar más de lo conocido) | — | PARCIAL | LOW-MEDIUM |
| Score | SÍ | PARCIAL (riesgo de falsa precisión) | LOW | NO | LOW |
| Recommendation | SÍ | SÍ | SÍ | SÍ (P27) | MEDIUM-HIGH |
| Verification | SÍ | SÍ | SÍ | SÍ (re-ejecutar) | MEDIUM-HIGH |

Los dos outputs que aportan valor real y defendible hoy son **coverage**
(incluido el framing de honestidad) y **recomendación + verificación**.
Los dos más débiles son **evidence** (trazabilidad, no contenido) y **scores**
(riesgo de falsa precisión). Los findings están en el medio: individualmente
plausibles, pero dominados por claims basados en ausencia sobre snapshots parciales.

## 5. Auditoría de valor (honesta, no inflada)

- **Valor funcional (técnico): HIGH.** Funciona end-to-end, es determinista,
  reproducible, testeado y honesto.
- **Utilidad para un repo que posees: LOW-MEDIUM.** Tu IDE, linter, type checker,
  CI y Dependabot ya hacen cada comprobación individual con más profundidad y con tu
  codebase completo. El report añade un resumen, no información nueva.
- **Utilidad para un repo que no posees: MEDIUM pero condicional.** La idea
  ("¿cuáles son los riesgos técnicos de este repo?") es útil; la entrega actual falla
  para la mayoría de esos repos (cobertura/cuotas) y no puede mostrar contenido de
  evidencia.
- **Diferenciación: LOW-MEDIUM.** Nada en el output actual es algo que un desarrollador
  no pueda obtener, con más profundidad, de herramientas existentes — *excepto* la
  combinación de configuración cero, sin clon y auditable.

## 6. Test de alternativas / competidores

| Herramienta | Detecta | Más fuerte que este producto | Dónde podría ganar este producto |
|---|---|---|---|
| ESLint / Biome | Reglas de lint sobre tu código | Más profundo, configurable, local, codebase completo | Nada para repos propios |
| TypeScript | Errores de tipo | Exhaustivo para TS | Nada |
| SonarCloud/SonarQube | Análisis estático profundo, maintainability | Mucho más profundo; free tier para repos públicos | Requiere setup/auth; este producto es de configuración cero |
| Dependabot/Renovate | Actualizaciones de dependencias | Continuo, PRs automatizados | Nada para repos propios; necesita acceso al repo |
| CodeQL | Queries de seguridad | Más profundo, integrado en CI | Necesita setup de GitHub Actions |
| gitleaks / escáneres de secretos | Secretos commiteados | Especializados y mejores | Determinismo + integración con el report |
| Snyk | Vulnerabilidades de dependencias | Basado en advisory, continuo | Nada para repos propios |
| Señales nativas de GitHub | Stars, actividad, licencia, README | Siempre disponibles | GitHub no sintetiza un resumen de riesgo técnico |
| IDE + revisión humana | Todo, con criterio | Lo mejor posible | Requiere contexto y tiempo |

**Conclusión:** para repositorios que un desarrollador posee, no hay diferenciación
defendible. Para **repositorios públicos desconocidos**, las herramientas existentes
requieren setup, acceso al repo o un clon — ninguna ofrece un snapshot de riesgo de
configuración cero. La diferenciación es real pero estrecha y actualmente no
implementada.

## 7. Jobs To Be Done

Trabajos candidatos:

1. **Snapshot de riesgo pre-adopción / pre-dependencia**
   - Usuario: un desarrollador que evalúa un repo público desconocido (adoptar,
     depender de él, contribuir).
   - Situación: navegando por GitHub, decidiendo en minutos si el repo es lo
     bastante saludable.
   - Problema: README + stars + actividad no revelan el riesgo técnico (secretos,
     setup de tests roto, dependencias sin mantener, deriva de documentación).
   - Motivación: evitar adoptar algo que costará tiempo después.
   - Output: un snapshot técnico corto, ordenado por riesgo.
   - Frecuencia: ocasional, de alto riesgo.
   - Valor: alto si saca a la luz un riesgo real por repo.

2. **Onboarding en codebase heredada**
   - Usuario: un desarrollador que acaba de unirse a un equipo o heredó un repo.
   - Situación: necesita un mapa de por dónde empezar.
   - Problema: el producto no tiene actualmente la profundidad (contenido por archivo,
     grafo de dependencias) para ser genuinamente útil aquí.
   - Valor: alto, pero requiere capacidades que este producto no tiene.

3. **Segunda opinión objetiva sobre mi propio repo**
   - Usuario: un owner antes de un release o una auditoría.
   - Situación: quiere una comprobación neutral.
   - Problema: las herramientas existentes son mejores; el report añade poco más allá
     de un resumen.
   - Valor: bajo.

4. **Salud trazable a lo largo del tiempo**
   - Usuario: un owner que sigue la mejora.
   - Situación: re-ejecutar sobre commits nuevos.
   - Problema: requiere auth, cuotas y persistencia de historial; el valor depende de
     que los otros trabajos existan primero.
   - Valor: medio, más adelante.

### TRABAJO PRINCIPAL (PRIMARY JOB)

> "Antes de adoptar, depender de o contribuir a un repositorio público desconocido,
> quiero un snapshot de riesgo técnico de configuración cero y honesto que me diga qué
> debería saber — y qué no se inspeccionó — en menos de un minuto."

Este es el único trabajo donde la arquitectura actual (sin clon, sin setup,
determinista, cobertura explícita) es una ventaja estructural, y el único trabajo donde
las debilidades actuales (profundidad, contenido de evidencia) son tolerables en un MVP
2.0 que las corrija de forma incremental.

## 8. El momento "aha"

> "Acabo de descubrir algo sobre este repo que no habría notado en mis primeros
> minutos navegando — y puedo ver el código real que lo prueba."

Ejemplos concretos a los que el producto está más cerca de llegar:
- una credencial con aspecto de commiteada en un archivo de configuración
  (actualmente detectada, pero sin excerpt visible);
- un claim de README/documentación que el código contradice;
- una configuración de tests que parece no ejecutar ningún test;
- una dependencia sin mantener u obsoleta en un proyecto presentado como mantenido;
- evidencia (con contenido) para cualquier finding `verified`.

El aha requiere dos cosas que el producto aún no hace: **evidencia de contenido**
(qué se vio) y **ordenación por riesgo** (esto es lo más importante). El report actual
no puede producir el momento tal como está diseñado.

## 9. Valor actual vs potencial

| Capacidad | Valor actual (1–5) | Valor potencial (1–5) | Esfuerzo | Prioridad |
|---|---|---|---|---|
| Findings | 3 | 4 | S | P1 |
| Evidence (estado) | 3 | 4 | S | P1 |
| Evidence (excerpts de contenido, redactados) | 1 | 5 | M | P0 |
| Coverage / honestidad | 4 | 5 | S | P1 |
| Scores | 2 | 3 | S | P3 |
| Recomendaciones | 4 | 4 | S | P1 |
| Verification | 4 | 4 | S | P1 |
| Análisis de presencia en key-files | 1 | 5 | M-L | P0 |
| Señales a nivel de repositorio (licencia, actividad, issues, releases) | 0 | 4 | M | P1 |
| Resumen ordenado por riesgo | 0 | 5 | M | P0 |
| Viabilidad con cuota anónima para repos medios | 1 | 5 | L | P0 |
| Global score | 0 | 1 | M | P3 (no construir) |
| Interpretación de AI | 0 | 2–3 | XL | P3 (aún no construir) |

## 10. Propuesta de MVP 2.0 (máximo 3 apuestas)

### Apuesta 1 — Evidencia verificable (excerpts de contenido seguros)

- **Problema:** un desarrollador no puede confirmar por qué existe un finding sin abrir
  el repo; la evidencia es trazabilidad, no evidencia.
- **Usuario:** cualquier desarrollador que lea el report.
- **Comportamiento:** cada finding `verified` muestra el contenido observado (rango de
  línea o fragmento) con redacción de secretos; los findings
  `absence_based`/`not_inspected`/`not_verified` nunca muestran contenido y dicen por
  qué.
- **Valor:** convierte "confía en el analyzer" en "puedo comprobarlo".
- **Evidencia de que funciona:** un desarrollador confirma un finding solo con el
  report en una sesión de validación.
- **Excluye:** contenido completo de archivos, secretos raw, resumen de AI.
- **Riesgo:** fallos de redacción — mitigado reutilizando la lógica existente de
  clasificación de secretos y una regla estricta de "en caso de duda, no mostrar nada"
  (el invariante de seguridad de la Phase 26).

### Apuesta 2 — Análisis de key-files de alta señal + señales a nivel de repositorio

- **Problema:** la ingestion acotada hace los reports parciales para la mayoría de los
  repos y dominan los findings basados en ausencia; el modo anónimo falla para repos
  medios.
- **Usuario:** el evaluador pre-adopción.
- **Comportamiento:** ingerir primero un conjunto curado de archivos de alta señal
  (manifest, README, config de CI, entry points, paths sensibles a seguridad) más
  señales baratas a nivel de repositorio de la API de GitHub (licencia, release
  reciente/último commit, conteo de issues abiertos, manifests de dependencias) —
  suficiente para un snapshot significativo dentro de la cuota anónima; comprobaciones
  basadas en presencia sobre los key-files en lugar de amplitud basada en ausencia.
- **Valor:** un report utilizable para la mayoría de los repos públicos en segundos,
  con findings de presencia verificables.
- **Evidencia de que funciona:** ≥80% de un set de validación de 10 repos se completa
  dentro de la cuota anónima y produce al menos un finding basado en presencia.
- **Excluye:** recorrido completo del repo, clonado, reglas más profundas.
- **Riesgo:** cambia la economía de la ingestion (deben preservarse las garantías de
  la Phase 21); mitigado manteniendo el cambio aditivo y medido.

### Apuesta 3 — Reporte de due-diligence ordenado por riesgo (cáscara de producto)

- **Problema:** el report presenta los findings por dimensión, no como ayuda a la
  decisión de "¿debería adoptar este repo?".
- **Usuario:** el evaluador pre-adopción.
- **Comportamiento:** el report abre con un resumen corto de riesgo ("lo que deberías
  saber antes de adoptar"), ordena los findings por riesgo para el adoptante y siempre
  muestra qué no fue inspeccionado.
- **Valor:** la diferencia entre "un report interesante" y "una ayuda a la decisión".
- **Evidencia de que funciona:** un desarrollador puede indicar el riesgo individual
  más importante tras 30 segundos con el report.
- **Excluye:** cuentas, dashboards, badges, gamificación.
- **Riesgo:** podría convertirse en marketing — mitigado manteniendo cada afirmación
  ligada a un finding o un hecho.

Estas tres apuestas son un solo producto: evidencia que puedes comprobar (1) sobre los
archivos que importan (2), presentada como ayuda a la decisión (3). Están ordenadas por
dependencia — 1 y 2 habilitan 3.

## 11. Qué no construir

| Candidato | ¿Construir ahora? | Por qué sí / por qué no | Se justifica cuando |
|---|---|---|---|
| Interpretación AI / LLM | NO | Socava el diferenciador de determinismo y honestidad; esfuerzo grande; la visión original de AI de product.md no es el valor validado | Las apuestas 1–3 validan el JTBD y existe contenido de evidencia sobre el que razonar |
| Chatbot | NO | Sin evidencia de que alguien lo necesite | Después de que existan cuentas/uso |
| Global score | NO | Falsa precisión; la auditoría y la Phase 22 lo rechazaron explícitamente | Solo si se demuestra una métrica compuesta defendible (improbable) |
| Más reglas del analyzer | NO | Amplitud sin profundidad; el problema es la evidencia y la cobertura, no el conteo de reglas | Después de que el análisis de presencia en key-files pruebe valor |
| Más dimensiones | NO | Misma razón | Después de probar la profundidad |
| Más ingestion (recorrido completo) | NO | La estrategia de key-files debe testearse primero; más requests empeoran la viabilidad anónima | Si key-files resulta insuficiente y la auth está resuelta |
| CLI | NO | Producto server-side; el flujo URL-en-navegador es el diferenciador | Si los power users exigen automatización |
| Integración CI / GitHub App | NO | Requiere cuentas, auth, webhooks — una apuesta de plataforma | Después de que la validación muestre uso repetido |
| Dashboards | NO | No es una ayuda a la decisión | Después de que existan datos de uso |
| Autenticación / cuentas | NO | Eleva la barrera de activación | Después de demanda validada |
| Infraestructura Playwright / Lighthouse | NO | La infraestructura de QA no es valor para el desarrollador | Solo cuando las regresiones de UX duelan de verdad |
| Badges / gamificación | NO | Marketing sobre sustancia | Nunca, en el corto plazo |

## 12. Métrica North Star

**"% de análisis que producen al menos un finding que el desarrollador confirma como
verificable y sobre el que actuaría."**

Por qué: mide el aha moment directamente, está orientada a la evidencia (no a un conteo
de findings) y obliga al producto a optimizar por lo único que importa — un
desarrollador haciendo algo distinto por culpa del report. Requiere un control de
feedback ligero en el report (un clic: "actuaría sobre esto / no útil"). Hasta que
exista la instrumentación, el proxy es: "% de análisis con al menos un finding
`verified` basado en presencia" — medible hoy.

## 13. Criterios de éxito del MVP 2.0

Un desarrollador puede:

1. Analizar un repositorio público desconocido con **cero setup** (sin auth) y
   recibir un report en menos de 60 segundos. *(observable, medible)*
2. Leer **al menos un finding confirmado por evidencia de contenido** sin abrir el
   repositorio, en ≥80% de los análisis de un set de validación de 10 repos.
   *(observable, medible)*
3. Indicar el **riesgo individual más importante** tras 30 segundos con el report.
   *(observable, testeable)*
4. Explicar qué **no fue inspeccionado** y por qué el resultado es confiable.
   *(observable, testeable)*
5. Seguir una **recomendación hasta la verificación** para cada finding.
   *(ya cierto desde la Phase 27 — debe preservarse)*
6. En una validación de 5–10 desarrolladores, reportar ≥1 finding por análisis sobre
   el que "actuarían" en ≥70% de los análisis. *(medible, requiere instrumentación de
   feedback)*

## 14. Veredicto final de producto

### ¿Tiene sentido seguir desarrollando ai-developer-platform?

**SÍ — pero estrechar el producto.**

El analyzer general de repositorios, tal como se publicó en v1.0.0, no es un producto
diferenciado: cada capacidad individual la hace mejor una herramienta que los
desarrolladores ya usan, y las limitaciones acotadas/anónimas lo hacen inutilizable
para la mayoría de los repositorios medios+. Continuar añadiendo reglas, scores o
cobertura sobre esa base sería construir sobre una premisa no validada.

Sin embargo, existe un trabajo estrecho y defendible — **snapshot de riesgo técnico de
configuración cero de un repositorio público desconocido** — para el cual la
arquitectura existente (sin clon, sin setup, determinista, semántica de cobertura
explícita, honestidad del estado de evidencia, recomendación + verificación) es una
ventaja estructural, y para el cual las tres apuestas del MVP 2.0 forman un camino
coherente.

Este veredicto es **condicional**: si la validación de la Phase 29 no demuestra al
menos un aha por análisis en la mayoría de los repos, la respuesta correcta pasa a
ser **NO — diferenciación insuficiente**, y el proyecto debería detener el trabajo de
features y permanecer como artefacto de portfolio. La decisión es intencionadamente
reversible.

### ¿Qué debería ser la Phase 29?

**Un experimento de validación, no una fase de implementación.** Hipótesis: "un
snapshot de riesgo de configuración cero de un repositorio público desconocido produce
al menos un insight accionable y verificable por análisis que el evaluador no
encontraría en cinco minutos con las herramientas existentes". La Phase 29 debería
construir el prototipo más fino posible sobre el stack actual (comprobaciones de
presencia en key-files + señales de repositorio + excerpts de evidencia redactados +
resumen ordenado por riesgo), ejecutarlo sobre ~10 repositorios públicos reales y
recopilar feedback de 3–5 desarrolladores. El gate de salida: ≥1 aha por análisis en
≥70% de los casos → proceder al build del MVP 2.0; si no → detener y mantener el
proyecto como portfolio.

## 15. Siguiente fase recomendada (detalle)

- **Nombre:** Phase 29 — Validación del snapshot pre-adopción
- **Tipo:** experimento de validación (prototipo fino + entrevistas), NO un build
- **En alcance:** comprobaciones de presencia en key-files; señales a nivel de
  repositorio; excerpts de evidencia redactados para los findings principales; resumen
  ordenado por riesgo; ejecución de 10 repos; 3–5 entrevistas a desarrolladores
- **Fuera de alcance:** AI, cuentas, CI, CLI, GitHub App, global score, reglas nuevas
- **Éxito:** ≥70% de los análisis producen un aha confirmado
- **Fallo:** detener el desarrollo de features; mantener el analyzer determinista como
  portfolio

---

*Este documento es una auditoría de estrategia de producto. No hace claims sobre
preparación del producto, exactitud ni cobertura más allá de lo que demuestran la
implementación y las ejecuciones reales. Ver `docs/product-audit-v1.0.0.md` para la
auditoría del v1.0.0 y `docs/phase-26-evidence-and-trust.md` / `docs/phase-27-developer-actionability.md`
para el trabajo de confianza y accionabilidad sobre el que se construye.*
