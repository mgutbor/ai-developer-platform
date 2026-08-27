# Product Audit — v1.0.0

> Auditoría conceptual de producto, no técnica. Evalúa qué valor obtiene un desarrollador real al usar
> el MVP v1.0.0 de ai-developer-platform. Basada en inspección del código real, documentación y la
> evidencia experimental de la validación anónima (`docs/anonymous-github-validation.md`) y de
> Phases 20–25. No modifica código ni contratos.

## 1. Método

- Contraste **código observado > documentación > intención histórica** en: analyzer
  (`packages/analyzer/src/analysis.ts`, `classification.ts`), scoring (`packages/scoring/src/index.ts`),
  evidencia (domain factories), mapper de API (`apps/api/src/mapper.ts`), frontend
  (`report.page.html/ts`, `analysis-messages.ts`), README, docs de producto y phases 21–25.
- Evidencia experimental real: 2 análisis completados sin token (Hello-World, camelcase) y 2 fallos
  controlados por cuota (`GITHUB_RATE_LIMITED`).

## 2. ¿Qué puede hacer HOY realmente?

> Un desarrollador puede: pegar la URL de un repositorio público de GitHub (con o sin
> `GITHUB_TOKEN` server-side), esperar unos segundos, y recibir un reporte determinista con
> dimension scores (0–10 por dimensión), findings, recomendaciones, cobertura y limitaciones,
> anclado a un commit SHA concreto.

- **Entrada:** una URL `https://github.com/owner/repo` (y opcionalmente una ref).
- **Qué ocurre después:** job → GitHub API → ingestion acotada (árbol segmentado, máx. 125 requests,
  50 archivos, 2 MiB) → analyzer determinista → scoring → SQLite → reporte.
- **Qué obtiene:** 6 dimension scores (`architecture`, `maintainability`, `testing`, `documentation`,
  `dependencies`, `code_quality`), findings con severity/category/confidence, recomendaciones,
  métricas (recuentos de archivos, imports, TODO/FIXME…), coverage (`complete|partial|insufficient`),
  confidence, limitations y un commit SHA.
- **Qué NO puede hacer:** analizar repositorios privados, ejecutar código del repo, resolver imports
  con el resolver real del proyecto, detectar bugs reales (no es un linter/SAST), dar un score global,
  comparar repositorios entre sí, persistir resultados accesibles públicamente, ni funcionar sin
  cuota de GitHub disponible (anónimo) o sin token (para repos medianos/grandes).

## 3. ¿Qué recibe realmente un developer? (clasificación)

### A. Alto valor
- **Commit SHA anclado + coverage/confidence**: el developer sabe exactamente qué se analizó y con qué
  grado de confianza. Es la parte más honesta y útil del producto.
- **Métricas de recuento** (nº de source/test/doc files, imports, TODO/FIXME): verificables y útiles
  para una primera impresión, cuando la cobertura es decente.
- **Findings de presencia real** (secret-like content AN-SEC-003, archivo sensible, archivo >400 líneas
  con path y línea): son localizables y accionables.

### B. Valor medio
- **Recomendaciones**: genéricas pero razonables ("Add automated tests…", "Commit a dependency
  lockfile", "Review the oversized source module"). Dicen *qué hacer* a nivel de objetivo, no cómo.
- **Dimension scores con confidence y limitations por dimensión**: útiles como señal débil, no como
  veredicto.

### C. Bajo valor
- **Findings absence-based** ("Test files were not detected", "Test tooling was not detected", "Lint
  configuration was not detected", "TypeScript strictness was not verified"): dependen del snapshot;
  con cobertura `partial`/`insufficient` son hipótesis, no hechos.
- **Scores 10/10 por ausencia**: un 10 en una dimensión significa *no se encontraron findings*, no que
  la dimensión esté bien (la propia limitación del score lo dice).
- **Facts y metrics crudos en el reporte** ("33 facts · 26 metrics"): recuentos sin contexto para el
  usuario; parecen diseñados alrededor del modelo interno.

### D. Ruido / complejidad interna
- **Evidence con solo `excerptHash`**: un hash estable de `snapshotId|path|ruleId|line` sin contenido.
  El developer ve "evidence reference fd282eb9" sin poder abrir nada. Es trazabilidad interna
  (provenance), no evidencia que permita verificación.
- **IDs internos** (`evidence:missing-tests`, `finding:…`, `metric:…`) y campos de provenance que se
  exponen en la respuesta pero no aportan decisión al usuario.
- **La sección "AI-assisted interpretation"** está presente en el reporte pero no hay provider real
  conectado (mensaje "AI interpretation is currently unavailable"): es un placeholder de UI para algo
  que no existe en el MVP.

## 4. ¿Qué es realmente accionable?

| Finding | ¿Problema claro? | ¿Por qué importa? | ¿Actuable? | ¿Recomendación dice qué hacer? | ¿Verificable después? |
|---|---|---|---|---|---|
| AN-SEC-003 (secret-like content) | Sí (path concreto) | Seguridad | Sí | Sí (rotar/eliminar) | Sí (re-analizar) |
| AN-SEC-002 (filename sensible) | Parcial (solo por nombre) | Riesgo potencial | Parcial | Sí | Parcial |
| AN-MAINT-001 (archivo >400 líneas) | Sí (path + línea) | Mantenibilidad | Sí | Parcial ("revisar límites") | Sí |
| AN-ARCH-002 (import no resuelto) | No — puede ser falso positivo del resolver acotado | Dudoso | No sin abrir el repo | Sí ("verificar") | Parcial |
| AN-TEST-001/002 (ausencia tests/tooling) | No — depende del snapshot | Dudoso con coverage parcial | No confiable | Sí (genérica) | No (sin snapshot completo) |
| AN-TOOL-001 (sin lint) | No — depende del snapshot | Dudoso | No confiable | Sí | No |
| AN-CQ-002 (strict desconocido) | Parcial | Menor | Parcial | Sí | Parcial |

**Conclusión:** la mayoría de los findings que produce el sistema en la práctica son absence-based y
dependen del snapshot. Distinguen **"información interesante"** de **"información que permite decidir"**
solo en los findings de presencia (security, tamaño de archivo). El resto, con cobertura parcial, es
ruido con formato profesional.

## 5. Evidence: ¿aporta valor o es arquitectura interna?

**Es principalmente arquitectura interna.** Evidencia observada en código:

- El analyzer crea evidencia con `createEvidence({ excerptHash: stableHash(snapshotId|path|ruleId|line), kind, location, … })`.
- **`redactedExcerpt` nunca se rellena** en el analyzer (campo nullable en el contrato, siempre `null` en la práctica — verificado en los reportes reales).
- El frontend muestra: `kind`, `location` (path y líneas cuando existen) y el hash como "evidence reference".

Resultado:

- **WHAT → WHY → WHERE → HOW**: NO. Solo se comunica WHAT (título) y parcialmente WHERE (path/línea de los findings de presencia). WHY es una descripción textual. HOW es la recomendación genérica.
- **WHAT → referencia interna**: SÍ, para los findings absence-based la "evidencia" es un hash no inspeccionable.
- Un developer **no puede verificar por qué** el analyzer concluyó "no se detectaron tests": no hay excerpt, no hay lista de archivos inspeccionados en el reporte, y el hash no es utilizable.

Esto es trazabilidad/provenance (valiosa internamente para reproducibilidad), no evidencia verificable por el usuario. Es la mayor distancia entre la promesa "evidence-based" y la realidad observable.

## 6. Scoring: ¿los scores significan algo?

- **Fórmula:** `score = clamp(10 − Σ penalidades por severity de findings en esa dimensión)`; si no hay
  señal observada en la dimensión → score `null` con `insufficient`.
- **`8.5` NO significa "está bien".** Significa "se detectaron findings de testing con severidad
  low/medium y no más". Un 10 significa "cero findings detectados en esa dimensión" (la limitación
  `absence of findings is not proof of quality` aparece en el reporte, pero es texto discreto).
- **Riesgo de falsa precisión: ALTO.** El formato `8.5/10` con `confidence: high` y `coverage:
  partial` (ej. Hello-World: `architecture: 10, confidence: high, coverage: partial` sobre 1 archivo
  ingerido de ~4) es precisamente la combinación que un developer lee como veredicto. La coexistencia
  de `confidence: high` con `coverage: partial/insufficient` es engañosa: la confianza se refiere a la
  señal, no a la completitud.
- **¿Ayudan a decidir o hacen parecer sofisticado?** Principalmente lo segundo en el estado actual,
  salvo el caso `null`/`insufficient` (honesto). Los scores sobre snapshots parciales no soportan
  decisiones ("¿refactorizo testing?" no puede responderse con un 8.5 sobre 3 archivos).
- **Sin global score** es una decisión defensible y honesta (evita un número todavía más falso).

## 7. Coverage e ingestion

- Mecanismo observable: `tree_segmented_acquisition` + `maxFileCount=50` + `maxApiRequests=125` +
  `maxTotalBytes=2 MiB` + `maxFileBytes=256 KiB`. En repos grandes: `SNAPSHOT_LIMIT_EXCEEDED`
  (job `failed`, sin reporte). Anónimo: ~60 req/h → `GITHUB_RATE_LIMITED` para casi todo repo
  no diminuto (evidencia: type-fest agotó 60/60).
- **¿Puede un developer interpretar erróneamente un resultado parcial como análisis completo?**
  - **Sí, en los scores y findings si no lee las limitaciones.** El banner de coverage (Phase 24) es
    claro ("Analysis based on limited information"), pero los findings absence-based se presentan con
    el mismo peso visual que los de presencia, y los `8.5/10` invitan a la lectura positiva.
  - **Dónde está el riesgo exacto:** (1) findings absence-based sin marca visible "no inspeccionado";
    (2) dimension scores con `coverage: partial` y `confidence: high`; (3) la "evidencia" hash que no
    permite al usuario darse cuenta de qué se inspeccionó; (4) el reporte no lista los archivos
    ingeridos (el snapshot no expone la lista de files al frontend), por lo que el usuario no puede
    reconstruir el alcance real.

## 8. ¿Qué problema resuelve realmente?

> Un developer que quiere una primera impresión rápida, reproducible y anclada a un commit de la
> estructura y el estado de higiene básica de un repositorio público, sin clonarlo.

- **"Este producto merece la pena porque…"** …ofrece una inspección determinista, reproducible y
  sin instalación de un repo público en segundos, con la honestidad de coverage/confidence que la
  mayoría de las herramientas de "quality score" no muestran.
- **"Este producto NO merece la pena si…"** …el repositorio no es diminuto (la cobertura cae), si el
  developer espera detectar problemas reales (no hay análisis profundo de código), o si ya tiene
  linter + CI + dependabot configurados (los findings absence-based le dicen lo que ya sabe o nada).
- **¿Existe value proposition convincente?** Aún no, en el estado actual. El "niche" defendible
  (inspección reproducible de un repo ajeno sin clonar) es real pero el valor entregado por finding
  todavía es demasiado bajo para sostenerlo. Es una promesa, no un hecho demostrado.

## 9. Comparación mental con herramientas existentes

| Categoría | Cubre | Diferencia de ai-developer-platform |
|---|---|---|
| Linters (ESLint/Biome) | Bugs, estilo, complejidad en el código | El producto NO detecta esto; solo presencia de configuración |
| TypeScript `tsc` | Errores de tipos | El producto solo mira `strict` en tsconfig |
| Test coverage (jest/istanbul) | Qué se testea | El producto solo cuenta archivos de test |
| Dependabot/npm audit | Vulnerabilidades de deps | El producto solo detecta lockfile/tooling |
| SonarQube/CodeClimate | Calidad agregada con reglas profundas | El producto usa heurísticas de nombres/strings |
| GitHub Insights | Actividad/community | Fuera de alcance |

- **¿Qué hace que un developer no obtenga fácilmente con herramientas que ya usa?** Prácticamente
  nada en la capa de findings: las herramientas estándar detectan más y mejor. Lo único no trivial:
  **el reporte agregado determinista + reproducible + anclado a commit + coverage honesta**, y la
  **inspección sin clonar** (GitHub REST). La diferenciación conceptual existe, pero se apoya en la
  agregación y la honestidad, no en el análisis profundo.

## 10. Developer Journey (1–5)

| Paso | Pregunta | Puntuación | Justificación |
|---|---|---|---|
| Descubrimiento | ¿Entiendo qué hace? | 4 | README claro ("Developer Health Report", flujo, límites) |
| Setup | ¿Es fácil probarlo? | 3 | `pnpm install && pnpm dev` funciona; requiere entender `GITHUB_TOKEN` (opcional pero recomendado) |
| Input | ¿Sé qué URL dar? | 5 | Placeholder y validación clara en la UI |
| Espera | ¿Entiendo qué ocurre? | 4 | Estados queued/running claros; puede tardar y no siempre se explica la causa |
| Resultado | ¿Entiendo qué veo? | 3 | Banner de coverage claro, pero scores 8.5/10 + "33 facts" mezclan señal y ruido |
| Finding | ¿Entiendo el problema? | 2 | Los absence-based ("X was not detected") confunden ausencia con no-inspección |
| Evidence | ¿Puedo verificarlo? | 1 | Solo hash interno; sin excerpt, sin lista de archivos inspeccionados |
| Recommendation | ¿Sé qué hacer? | 3 | Genéricas y razonables, pero sin contexto específico del repo |
| Prioridad | ¿Sé qué arreglar primero? | 2 | No hay priorización real entre findings (priority es estática por regla) |
| Repetición | ¿Puedo comprobar si mejoré? | 3 | Sí: mismo commit → reproducible; pero sin historial comparativo en UI |

**Media ≈ 3.0/10 en la cadena crítica (Finding/Evidence/Prioridad tiran la media).**

## 11. ¿Lo usaría yo?

**No todavía.**

Como developer experimentado, para un repo propio: mi CI + linter + dependabot ya me dicen lo que
este producto encuentra (y con más profundidad), y para un repo ajeno me basta con `git clone` +
`tree` + leer el README. El reporte actual no me descubre nada que no pueda ver en 5 minutos, y la
"evidencia" no verificable reduce la confianza en lo único que sí podría aportar. Lo usaría **cuando**
(1) los findings de presencia sean profundos y verificables (excerpt redactado, lista de archivos
inspeccionados), y (2) la agregación permita comparar repos o trackear evolución.

## 12. ¿Qué falta para generar valor real? (top 3)

1. **Evidencia verificable: excerpt redactado + lista de archivos inspeccionados.**
   - Problema: la evidencia es un hash interno; el usuario no puede verificar nada.
   - Por qué importa: es la promesa central ("evidence-based") y la base de toda confianza.
   - Impacto esperado: alto (WHAT→WHY→WHERE reales).
   - Complejidad: baja-media (persistir excerpt redactado o un índice de archivos del snapshot).
   - Imprescindible.

2. **Semántica absence/not-inspected en findings y scores.**
   - Problema: "X was not detected" sobre snapshot parcial se lee como "X no existe".
   - Por qué importa: es la principal fuente de conclusión errónea.
   - Impacto esperado: alto en honestidad y en evitar falsas decisiones.
   - Complejidad: media (estado `not_inspected` por finding + UI + mensajes).
   - Imprescindible.

3. **Priorización real y acción: vincular findings a decisiones (y opcionalmente comparación entre runs).**
   - Problema: el reporte no dice "qué primero".
   - Por qué importa: un reporte que no prioriza no cambia decisiones.
   - Impacto esperado: medio-alto.
   - Complejidad: media (rankear por severity+confidence+coverage; historial por commit).
   - Nice-to-have (alto impacto, pero depende de 1 y 2).

## 13. Separar producto de portfolio

- **Portfolio:** arquitectura (paquetes, dominio, contratos), tests, CI, documentación, fases
  disciplinadas, seguridad, reproducibilidad, trazabilidad interna, validación real. **Excelente.**
- **Producto:** lo que un developer obtiene al introducir una URL. Actualmente: un reporte agregado
  honesto pero de findings superficiales, con evidencia no verificable y cobertura limitada.
- **Ambos:** la honestidad de coverage/confidence y la inspección sin clonar.

**Riesgo confirmado:** existe el riesgo real de que esto sea, hoy, **un excelente proyecto de
portfolio que todavía no es un producto especialmente útil**. La ingeniería es de nivel superior al
valor de producto entregado. No es un defecto del trabajo técnico; es una decisión de dirección de
producto pendiente.

## 14. PRODUCT VERDICT

### What it is
Un servicio que produce un Developer Health Report determinista y reproducible de un repositorio
público de GitHub (dimension scores, findings, recomendaciones, coverage) a partir de una ingestion
acotada vía GitHub REST, sin ejecutar el código del repositorio. Es una inspección superficial y
honesta, anclada a un commit, más que un análisis profundo.

### What it does well
1. Inspección reproducible y anclada a commit SHA, sin clonar ni ejecutar el repo.
2. Honestidad estructural: coverage, confidence, limitations y scores null explícitos.
3. Estados de error controlados (rate limit, snapshot limit, 404) sin fugas ni hangs.
4. Arquitectura limpia y testeada (dominio, contratos, paquetes, determinismo).
5. Validación real documentada (E2E, dataset congelado, fases 22–25).

### What currently limits its value
1. Findings mayormente absence-based sobre snapshots parciales (riesgo de conclusión errónea).
2. Evidencia no verificable por el usuario (solo hash; sin excerpt ni lista de archivos inspeccionados).
3. Coverage insuficiente en repos no diminutos (límites de ingestion/requests/cuota anónima).
4. Scoring 10−penalidades que con `confidence: high` y `coverage: partial` produce falsa precisión.
5. Sin priorización real ni comparación entre ejecuciones.

### Biggest product strength
La honestidad de cobertura/confidence/limitations combinada con reproducibilidad por commit.

### Biggest product weakness
La evidencia no verificable y los findings absence-based sobre snapshots parciales — la brecha entre
la promesa "evidence-based" y lo que el usuario puede comprobar.

### Biggest risk
Que el producto se posicione como "health/quality assessment" y genere falsas conclusiones (o falsa
confianza) porque la cobertura parcial y la semántica de ausencia no se comunican en el punto exacto
de decisión (scores y findings), a pesar de los avisos.

### Current developer value
**3/10.**

### Portfolio value
**9/10.**

### Would you use it?
**No todavía.**

### Recommendation
**ITERATE BEFORE CALLING IT PRODUCT-READY.**

Motivo: v1.0.0 demuestra una ingeniería sólida y honesta, pero el valor de producto observado no
soporta la afirmación de "product-ready" (de hecho, el propio proyecto lo etiqueta como MVP con
limitaciones). Antes de escalar (más repos, más reglas, AI), conviene cerrar la brecha de evidencia
(WHAT→WHY→WHERE verificable) y la semántica de ausencia; son los dos problemas que limitan el valor
percibido y la confianza. No se sugiere rehacer la arquitectura — se sugiere iterar sobre el
contrato de evidencia y la semántica de findings antes de añadir más superficie.

## 15. Regla fundamental aplicada

La cantidad de código, tests, documentación, arquitectura y fases **no** se tradujo, todavía, en valor
proporcional para el developer. Todo lo construido hasta v1.0.0 demuestra capacidad de ejecución
técnica y disciplina; la utilidad real entregada es la de una **inspección honesta pero superficial**
de repositorios pequeños. Descubrir esto ahora es precisamente el objetivo de esta auditoría: la
siguiente iteración debe decidir si cierra la brecha de valor o acepta el rol de demo/portfolio.

---

*Auditoría conceptual — sin cambios de código ni contratos. Evidencia: código de
`packages/analyzer`, `packages/scoring`, `packages/domain`, `apps/api`, `apps/web`; reportes reales
de la validación anónima; documentación de Phases 21–25.*

## 16. Addendum — Phase 26 (Evidence & Trust)

La auditoría anterior identificó tres problemas: evidence no verificable (solo hash interno),
absence-based ambiguo y falsa precisión (`confidence: high` con `coverage` parcial). Phase 26 los
abordó **sin ampliar el alcance del analyzer**:

- Cada finding declara ahora su semántica de evidencia: `verified` / `absence_based` /
  `not_inspected` / `not_verified`. La ausencia detectada se expresa como "detectado en el scope
  inspeccionado", no como "no existe en el repositorio"; la falta de información se expresa como
  "no evaluado", no como ausencia.
- El reporte expone el **scope de inspección** (`inspectedScope`: archivos inspeccionados, entradas
  de árbol vistas, bytes) y el frontend lo presenta como "partial snapshot, not a complete
  repository analysis".
- El frontend distingue visualmente los cuatro estados y deja de presentar el hash interno como
  evidencia principal.

Impacto en las puntuaciones de la auditoría (ver `docs/phase-26-evidence-and-trust.md`):
verificabilidad 1→3, claridad del finding 2→4, comprensión de absence-based 1→4, comprensión de
coverage 2→4. La verificabilidad de contenido sigue limitada (3/5) por decisión deliberada de
seguridad: no se exponen excerpts. El veredicto de Phase 26 es **PASS WITH LIMITATIONS**; esta
auditoría ya no refleja el estado del contrato de evidencia y debe leerse con este addendum.*
