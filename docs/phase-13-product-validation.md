# Phase 13 — Validación de producto y evaluación en el mundo real

## Resumen ejecutivo

La Phase 13 ejecutó el pipeline determinista del v1.0.0 publicado contra repositorios públicos reales de GitHub. El producto funciona end-to-end: cada repositorio analizado produjo un snapshot anclado a commit, findings, evidencia, recomendaciones y scores dimensionales sin ejecutar ningún código del repositorio.

La validación también encontró defectos concretos de producto:

1. **`AN-SEC-003` produce falsos positivos de severidad alta.** Una expresión estándar de GitHub Actions (`token: '${{secrets.GITHUB_TOKEN}}'` en `angular/angular`) y un secreto de sesión de demostración (`examples/auth/index.js` en `expressjs/express`) se reportan ambos como "A potential committed secret was detected" con severidad `high`. Este es el defecto más dañino para un producto basado en evidencia.
2. **La selección de archivos deja sin presupuesto a los metadatos raíz.** La política de selección toma archivos en orden de árbol. Los directorios de puntos (`.github/`, `.devcontainer/`, `.gemini/`) dominan el cap y dejan sin presupuesto a `package.json`, `README`, `tsconfig.json` y los directorios de tests. Esto produjo falsos positivos ("README missing", "tests missing", "tooling missing") y falsos negativos (Angular no se detectó en el propio `angular/angular`).
3. **`facebook/react` no puede ingerirse.** GitHub devuelve `301` en `GET /repos/facebook/react` (redirect canónico a la URL numérica del repositorio). La política de redirects segura contra SSRF lo rechaza y el usuario recibe solo `GITHUB_UNAVAILABLE`, sin información accionable.
4. **Los scores son mecánicamente consistentes pero pueden engañar en snapshots truncados.** Los repositorios con truncamiento intenso siguen recibiendo scores como `9.5/10`, que un usuario puede leer como veredicto de calidad aunque existan `coverage: partial` y limitaciones explícitas.

## Metodología

- Runner: `apps/api/src/validate-real-repos.ts` (usa solo el pipeline existente `ingestRepository` → `analyze` → `scoreAnalysis`).
- Límites usados en este benchmark (reducidos respecto a los defaults de la API para caber en el rate limit anónimo de GitHub de 60 requests/hora): `maxFileCount: 10`, `maxTotalBytes: 1 MiB`, `maxApiRequests: 14`. El default de la API es `maxFileCount: 50`, `maxTotalBytes: 2 MiB`, `maxApiRequests: 125`.
- No se ejecutó, instaló ni compiló ningún código del repositorio.
- Los findings se verificaron contra los repositorios reales usando obtenciones de archivos raw de solo lectura y simulación de árbol.

## Dataset del benchmark

| Repositorio | Nota | SHA de commit | Tamaño (KB) | Archivos seleccionados | Entradas de árbol | Cobertura | Estado |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| `octocat/Hello-World` | baseline diminuto, sin tests | `7fd1a60b` | 1 | 1 | 1 | insufficient | completed_with_limitations |
| `sindresorhus/type-fest` | TypeScript limpio, tests | `3fe02d33` | 3,089 | 10 | 495 | partial | completed_with_limitations |
| `expressjs/express` | JavaScript/Node.js, tests, CI | `023767fe` | 9,857 | 10 | 281 | partial | completed_with_limitations |
| `angular/angular` | TypeScript grande, Angular | `66d505e2` | 655,323 | 10 | 12,919 | partial | completed_with_limitations |
| `facebook/react` | JavaScript grande, React | n/a (fallido) | n/a | n/a | n/a | n/a | failed (redirect) |

Cobertura de categorías lograda: TypeScript limpio (`type-fest`), JavaScript/Node.js (`express`), Angular (`angular`), diminuto/sin tests (`Hello-World`), grande (`angular`, `react`), con/sin CI, con/sin lockfile. Los casos de React y de "detección de Angular" quedan cubiertos por la evidencia de fallo y el falso negativo de detección de framework que se indica abajo.

## Calidad de los findings

| Repo | Findings | Veredicto |
| --- | --- | --- |
| `Hello-World` | sin tests, sin tooling de tests, sin lint | **correcto** (el repositorio no tiene nada de eso) |
| `type-fest` | sin README, sin tooling de tests, strictness no verificada, import sin resolver | **falso positivo / cuestionable** — `readme.md`, `package.json`, `tsconfig.json` existen pero quedaron fuera por la selección |
| `express` | sin tests, sin tooling de tests, sin lint, import sin resolver, posible secreto | **mixto** — no-lint es correcto (no hay config de ESLint en ese commit); tests/tooling son falsos positivos (fuera por selección); el secreto es un match de patrón sobre un fixture de demo |
| `angular` | sin tests, sin lint, posible secreto | **falso positivo** — la suite de tests es enorme (fuera por selección); el secreto es una expresión estándar `${{ secrets.* }}` |

### Findings correctos

- `Hello-World`: los tres findings son verdaderos positivos.
- `express` "Lint configuration was not detected": verificado correcto en el commit `023767fe` (no existe ningún `.eslintrc*`/`eslint.config.*`).

### Falsos positivos observados

- `AN-DOC-001` "README was not detected" en `type-fest`: `readme.md` existe en el commit analizado; no fue seleccionado porque los archivos de `.github/workflows/*` llenan el cap primero.
- `AN-TEST-001` "Test files were not detected" en `express` y `angular`: ambos tienen suites de tests extensas; los directorios de tests no fueron seleccionados.
- `AN-TEST-002` "Test tooling was not detected" en `type-fest` y `express`: `package.json` (con `xo`/`tsd`/`mocha`) no fue seleccionado.
- `AN-TOOL-001` "Lint configuration was not detected" en `angular`: Angular tiene configuración de ESLint; no fue seleccionada.
- `AN-ARCH-002` "Unresolved relative import" en `type-fest` (`index.d.ts`) y `express` (`examples/auth/index.js`): ambos se resuelven en realidad; el resolver solo ve el subconjunto seleccionado.
- `AN-SEC-003` "Potential committed secret" en `angular` (`.github/workflows/adev-preview-deploy.yml`): el valor coincidente es `token: '${{secrets.GITHUB_TOKEN}}'` — una expresión estándar de GitHub Actions, no una credencial.
- `AN-SEC-003` en `express` (`examples/auth/index.js`): el valor coincidente es `secret: 'shhhh, very secret'` — un fixture de demo; el patrón coincide técnicamente pero la severidad `high` es engañosa.

### Falso negativo detectado

- `angular/angular`: `framework_detected` fue `not_detected`. El repositorio es el propio framework Angular; la detección falló porque `package.json`/`angular.json` no fueron seleccionados. El hecho `typescript_strict: observed = true` se derivó de `.github/actions/deploy-docs-site/tsconfig.json` — una configuración interna del CI, no la configuración principal de build.

## Análisis de falsos positivos por regla

| Regla | Activaciones | Plausiblemente correctas | Cuestionables | FP confirmados |
| --- | ---: | ---: | ---: | ---: |
| README missing (`AN-DOC-001`) | 1 | 0 | 0 | 1 |
| Tests missing (`AN-TEST-001`) | 3 | 1 (`Hello-World`) | 0 | 2 |
| Test tooling missing (`AN-TEST-002`) | 3 | 1 (`Hello-World`) | 0 | 2 |
| Lint missing (`AN-TOOL-001`) | 3 | 2 (`Hello-World`, `express`) | 0 | 1 |
| Strictness not verified (`AN-CQ-002`) | 1 | 0 | 1 | 0 |
| Import sin resolver (`AN-ARCH-002`) | 2 | 0 | 0 | 2 |
| Posible secreto (`AN-SEC-003`) | 2 | 0 | 0 | 2 |

Causas raíz, no excepciones regla por regla:

1. **Inanición de selección (principal).** La selección itera el árbol en orden de la API sin priorizar los metadatos raíz. Los directorios de puntos y `examples` dominan el cap. Dirección de corrección (no implementada en esta fase): priorizar paths de manifest/metadata/config/lockfile en el pase de selección y reservar slots para archivos raíz.
2. **El patrón de `AN-SEC-003` es ingenuo.** El regex trata cualquier `secret|token|api_key = "12+ chars"` como finding de severidad alta. Debe excluir expresiones de GitHub Actions (`${{ ... }}`), paths de demo/test/example, y requerir evidencia más fuerte (naming de archivo, contexto circundante, valores más largos/de mayor entropía) antes de asignar `high`.

## Validación del scoring

Scores dimensionales observados:

| Repo | Architecture | Maintainability | Testing | Documentation | Dependencies | Code Quality |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `Hello-World` | 10 | 10 | 8.5 | 10 | null | 9.5 |
| `type-fest` | 9 | 10 | 9.5 | 9.5 | null | 9.5 |
| `express` | 9 | 10 | 8.5 | 10 | null | 9.5 |
| `angular` | 10 | 10 | 9 | 10 | null | 9.5 |

Observaciones:

- Los scores son mecánicamente consistentes con la tabla de penalizaciones y nunca bajan de `8.5` en esta muestra. Eso es esperable: el conjunto de reglas es deliberadamente conservador y esta muestra contiene repositorios reputados.
- `dependencies` es `null` (cobertura insuficiente) en todos los repositorios porque `package.json` no fue seleccionado — la dimensión es efectivamente inerte bajo el comportamiento de selección actual.
- Las penalizaciones de `testing` están impulsadas en parte por findings falsos positivos (`express`, `angular`), por lo que el score puede castigar a un repositorio por señales que el analyzer no logró observar.
- Los scores se calculan incluso sobre snapshots fuertemente truncados. `coverage: partial` y las limitaciones están presentes, pero el score numérico sigue leyéndose como veredicto de calidad. El informe debe hacer más explícita la conexión entre score y cobertura.

No se hizo ningún cambio de fórmula de scoring en esta fase.

## Cobertura y limitaciones

- `coverage: insufficient` aparece cuando no hay archivos fuente seleccionables (`Hello-World`). Es esperado y se comunica correctamente.
- `coverage: partial` aparece en todos los demás repositorios, impulsado por las limitaciones `file_count_limit_reached`, `import_count_limit_reached` y `relative_import_resolution_is_heuristic`.
- `status: completed_with_limitations` se produjo en todos los repositorios analizados — incluido `Hello-World` con un único archivo. Es honesto pero corre el riesgo de leerse como un fallo. La API y el frontend exponen las limitaciones; el frontend las muestra bajo una sección explícita "Limitations".
- `score: null` se renderiza como "Score unavailable" en el frontend, distinto de un score numérico. Es correcto.
- Con el cap por defecto de la API (`maxFileCount: 50`), los peores artefactos de truncamiento se reducirían pero no se eliminarían: los repositorios con muchos archivos de directorios de puntos (p. ej., `angular` con 12,919 entradas de árbol) pueden seguir dejando sin presupuesto a los metadatos raíz.

## Evaluación de AI

**Evaluación semántica con proveedor real: NOT VALIDATED** — no había credenciales de proveedor disponibles, no se inventaron y no se hizo ninguna solicitud en vivo.

La integración técnica está validada con `FakeAIProvider` mediante los tests existentes (construcción de contexto, validación de referencias, contexto acotado, delimitadores de prompt, informe determinista sin cambios). El contrato `POST /analyses/:id/ai` y `GET /analyses/:id/ai` está cubierto por tests de integración de la API.

## Informe de AI vs informe determinista

La capa de AI está correctamente acotada: solo puede referenciar findings/evidencia/recomendaciones existentes, no puede crear nuevos paths/ranges/scores, y su contexto se deriva del informe determinista.

Veredicto para esta fase: **no hay suficiente evidencia** de que la capa de AI mejore la experiencia de usuario, y hay un riesgo concreto — la AI hereda los falsos positivos del informe determinista (p. ej., "README missing", "tests missing", "potential secret") y los presentaría como entradas de su síntesis. Hasta que mejore la calidad de los findings deterministas, la interpretación de AI debe tratarse como un experimento, no como un diferenciador.

## Baseline de rendimiento

Medido localmente (Node 25.3.0, proceso único, GitHub sin autenticar):

| Repo | Ingestion | Analyzer | Scoring | Total |
| --- | ---: | ---: | ---: | ---: |
| `Hello-World` | 1,048 ms | 8 ms | 1 ms | 1,057 ms |
| `type-fest` | 4,983 ms | 29 ms | 1 ms | 5,013 ms |
| `express` | 4,227 ms | 4 ms | 1 ms | 4,232 ms |
| `angular` | 5,050 ms | 2 ms | 1 ms | 5,053 ms |

El análisis está acotado por la red; el analyzer y el scorer están por debajo de 50 ms para este tamaño de snapshot. Ningún caché, worker ni cola se justifica con estos datos.

## Utilidad del producto

1. **Qué resuelve:** da a un desarrollador un resumen reproducible y vinculado a evidencia de las señales estructurales de un repositorio (tests, docs, tooling, dependencias, archivos grandes, posibles secretos).
2. **Para quién:** un desarrollador que evalúa un repositorio antes de contribuir o adoptarlo; un maintainer que busca una segunda opinión externa y determinista.
3. **Qué es genuinamente útil:** snapshots anclados a commit, paths de evidencia, limitaciones, scores dimensionales con cobertura explícita, y el modelo honesto de `completed_with_limitations`.
4. **Qué es ruido:** "README missing"/"tests missing"/"tooling missing" cuando son artefactos de selección; findings de secretos de severidad `high` sobre expresiones estándar de CI o fixtures de demo.
5. **Qué falta para informes accionables:** selección priorizada de metadatos raíz; calibración de severidad para `AN-SEC-003`; una explicación más clara del "significado del score dada la cobertura"; y detalle por repositorio que muestre por qué una señal no fue observada.
6. **Qué podría engañar:** scores numéricos sobre snapshots truncados; findings de seguridad `high` que son falsos positivos; el error `GITHUB_UNAVAILABLE` para `facebook/react`.
7. **Diferenciador:** análisis determinista, trazable por evidencia y reproducible con limitaciones explícitas — los findings de seguridad deben ser confiables para que esto se sostenga.
8. **Técnicamente interesante pero de bajo valor hoy:** la capa de interpretación de AI, hasta que mejore la calidad de los findings deterministas.

## Evaluación de arquitectura

| Componente | Veredicto | Justificación |
| --- | --- | --- |
| Frontend Angular | KEEP | Renderiza el informe correctamente, incluidos scores null y limitaciones |
| API Fastify | KEEP | Contrato y manejo de errores validados |
| Capa de aplicación | KEEP | Runner, idempotencia y ciclo de vida del job se comportaron correctamente |
| Runner in-process | KEEP | Semánticas de concurrencia/timeout adecuadas para la muestra |
| Ingestion REST de GitHub | KEEP, fix | Funciona, pero el manejo de redirects produce un fallo opaco para repos válidos; la selección deja sin presupuesto a los metadatos raíz |
| Analyzer determinista | KEEP, fix | Los findings son trazables por evidencia, pero `AN-SEC-003` y las reglas sensibles al truncamiento necesitan calibración |
| Scoring | KEEP | Mecánicamente consistente; debe comunicar mejor la dependencia de cobertura |
| SQLite | KEEP | Round-trips de persistence validados |
| AI provider | KEEP (experimental) | La frontera es segura; el valor semántico no está probado |

Ninguna infraestructura nueva (workers, colas, Redis, PostgreSQL, caché) se justifica con los datos de esta fase.

## Problemas críticos

1. Falsos positivos de severidad alta de `AN-SEC-003` sobre expresiones estándar de GitHub Actions y fixtures de demo.
2. La inanición de selección de archivos sobre los metadatos raíz produce falsos positivos y falsos negativos (incluido no detectar Angular en `angular/angular`).
3. `facebook/react` no puede analizarse y el error es opaco.
4. Los scores sobre snapshots truncados pueden engañar a pesar de `coverage: partial`.

## Cambios recomendados (no implementados en esta fase)

1. Recalibrar `AN-SEC-003`: excluir expresiones `${{ ... }}`, excluir paths `examples/`, `test/`, `tests/`, `fixtures/`, `*.test.*`, requerir valores de mayor entropía y reasignar la severidad.
2. Priorizar los metadatos raíz en la política de selección (`package.json`, `README*`, lockfiles, `tsconfig*`, configs de lint/format) antes que los archivos fuente y de CI.
3. Añadir una vía de resolución consciente de redirects en el cliente de GitHub (los redirects al mismo host hacia `api.github.com/repositories/{id}` son legítimos) o un mapeo de errores más claro para repositorios rechazados por redirect.
4. Comunicar el acoplamiento score/cobertura en la API y el frontend ("score computado sobre snapshot parcial").
5. Antes de cualquier promoción adicional de la AI, corregir los falsos positivos deterministas que la AI heredaría.

## Cambios diferidos

- Cambios de fórmula de scoring (sin evidencia de defectos de fórmula; los problemas son de selección de entradas y calibración de severidad).
- Nuevas reglas, nuevas dimensiones, global score.
- Workers, colas, Redis, PostgreSQL, caché, realtime.
- Evaluación semántica de AI con proveedor real (bloqueada por credenciales).

## Evaluación del v1.0.0

**READY WITH LIMITATIONS** sigue siendo la clasificación de release correcta. Los defectos encontrados no invalidan el release del MVP: son problemas de calidad/calibración en el analyzer y en la selección de ingestión, no fallos de corrección o seguridad del proceso de release. Deberían corregirse antes de presentar el producto como herramienta confiable de informes de salud y antes de cualquier claim de marketing sobre findings de seguridad.

## Recomendación para la Phase 14

Corregir los tres defectos de mayor impacto encontrados aquí, en orden:

1. Recalibrar `AN-SEC-003` (los falsos positivos destruyen la confianza).
2. Priorizar los metadatos raíz en la selección de archivos (corrige la mayoría de los artefactos de README/tests/tooling y el falso negativo de Angular).
3. Manejar los redirects canónicos de GitHub y mejorar los mensajes de error (corrige `facebook/react`).

Después re-ejecutar este mismo benchmark para medir la reducción de falsos positivos. Ninguna infraestructura nueva está justificada.
