# Phase 22.3 — Revisión humana de los findings del analyzer

## Propósito

Este documento es el índice único de revisión de los **25 findings** producidos en la Phase 22.2 a partir del dataset congelado de la Phase 22.1. Su propósito es permitir que Manuel (el revisor humano) clasifique cada finding de forma eficiente, agrupe los patrones de regla repetidos y registre las clasificaciones que alimentarán las métricas de la Phase 22.3 (solo donde la muestra clasificada sea defendible).

La Phase 22.3 es estrictamente una fase de **preparación de la revisión**. No añade funcionalidades y no cambia ningún código de producción. Ninguna clasificación se genera automáticamente; cada campo de clasificación de abajo está vacío y reservado para Manuel.

## Referencia del dataset congelado

Repositorios y SHAs de commit exactos (congelados el 2026-08-27, ver `docs/phase-22-ground-truth-dataset.md` y `docs/phase-22-human-review-package.md`):

| Repositorio | SHA de commit congelado | Snapshot | Findings |
| --- | --- | --- | ---: |
| octocat/Hello-World | 7fd1a60b01f91b314f59955a4e4d4e80d8edf11d | snapshot ok | 3 |
| sindresorhus/type-fest | 3fe02d33596f8afa167bc465d9d9ac9ab81b497e | snapshot ok | 7 |
| expressjs/express | 023767fe9872e029271df1418f73401bff20ff40 | snapshot ok | 4 |
| angular/angular | 133cafda42028fbd8efd7840d6ff3fea25223166 | snapshot ok | 4 |
| react/react | — | sin snapshot (ingestion_limit_reached) | 0 |
| vuejs/core | d63616ca17de965ed32dcb449a4c5cd9982f15d2 | snapshot ok | 5 |
| nestjs/nest | a333a9dae6169537da3954c5b1ac35202b057fcb | snapshot ok | 2 |
| vitejs/vite | — | sin snapshot (ingestion_limit_reached) | 0 |

`react/react` y `vitejs/vite` no produjeron findings: su snapshot de `maxFileCount=50` supera `maxApiRequests=125` (limitación documentada de recursos acotados, fuera del alcance de esta fase).

## Metodología de revisión

- Clasificar cada finding usando solo las cuatro etiquetas válidas: **TP**, **FP**, **UNCERTAIN**, **NOT_EVALUABLE**.
- Basar cada clasificación en la evidencia registrada en el paquete de revisión de la Phase 22.2 (`/tmp/phase22-human-review/`).
- Tratar los findings de forma independiente. **No** asumir que una regla plausible implica TP, que una recomendación razonable implica TP, o que la ausencia de un finding implica FN.
- Un finding ausente solo puede marcarse como falso negativo cuando evidencia verificable de forma independiente muestra que la regla debería haberse disparado.
- Completar la plantilla vacía bajo cada finding: `Classification`, `Evidence sufficient`, `Actionable`, `Reviewer confidence`, y responder la pregunta del revisor.

### Definiciones de clasificación

- **TP (true positive):** la condición que describe la regla existe genuinamente en la evidencia inspeccionada, y el finding describe un problema real.
- **FP (false positive):** el finding no se corresponde con un problema real en la evidencia inspeccionada (la regla se disparó pero no hay nada material presente/incorrecto).
- **UNCERTAIN:** no está claro si el finding es correcto; la evidencia es ambigua o insuficiente para decidir.
- **NOT_EVALUABLE:** el finding no puede evaluarse a partir del snapshot disponible (p. ej., el archivo/contexto relevante no estaba en el snapshot acotado).

## Instrucciones para el revisor

1. Abrir `/tmp/phase22-human-review/README.md` y los archivos de findings por repositorio para el detalle completo (cada finding ya tiene una plantilla vacía `### Human review`).
2. Para cada finding de abajo, registrar la misma clasificación en la tabla de este documento (o mantener una única copia autoritativa en el paquete de revisión y referenciarla aquí).
3. No cambiar ningún texto de evidencia, path, rango ni hash de excerpt.
4. Si un finding necesita contenido fuera del snapshot para ser juzgado, marcarlo como **NOT_EVALUABLE** en lugar de adivinar.
5. Devolver el documento completado para agregar las métricas en la Phase 22.3 (después de la revisión, no antes).

## Reglas de clasificación

- Las clasificaciones las hace exclusivamente el revisor humano (Manuel).
- Este documento **no contiene clasificaciones automáticas**.
- Todas las celdas `Classification` de las tablas de abajo empiezan vacías y se dejan deliberadamente sin rellenar.
- No se calcula ninguna precision, recall, tasa de falsos positivos ni tasa de falsos negativos en esta fase; permanecen `NOT_AVAILABLE` hasta que se proporcionen las clasificaciones de Manuel.

## Resumen de findings

- **Total de findings: 25**

### Findings por regla

| Regla | Conteo |
| --- | ---: |
| `AN-ARCH-002` | 5 |
| `AN-CQ-002` | 4 |
| `AN-MAINT-001` | 4 |
| `AN-TEST-001` | 4 |
| `AN-DEP-001` | 2 |
| `AN-SEC-003` | 2 |
| `AN-TEST-002` | 2 |
| `AN-TOOL-001` | 2 |

### Findings por repositorio

| Repositorio | Conteo |
| --- | ---: |
| octocat/Hello-World | 3 |
| sindresorhus/type-fest | 7 |
| expressjs/express | 4 |
| angular/angular | 4 |
| react/react | 0 |
| vuejs/core | 5 |
| nestjs/nest | 2 |
| vitejs/vite | 0 |

### Findings por severidad

| Severidad | Conteo |
| --- | ---: |
| critical | 0 |
| high | 0 |
| medium | 14 |
| low | 11 |
| info | 0 |

### Findings por dimensión

| Dimensión | Conteo |
| --- | ---: |
| code_quality | 6 |
| testing | 6 |
| architecture | 5 |
| maintainability | 4 |
| dependencies | 2 |
| security | 2 |

### Conteos de clasificación (todos empiezan en cero)

| Clasificación | Conteo |
| --- | ---: |
| TP | 0 |
| FP | 0 |
| UNCERTAIN | 0 |
| NOT_EVALUABLE | 0 |

## Estado de las métricas

| Métrica | Estado |
| --- | --- |
| Precision | `NOT_AVAILABLE` (aún sin revisión humana) |
| Recall | `NOT_AVAILABLE` (aún sin revisión humana) |
| Tasa de falsos positivos | `NOT_AVAILABLE` (aún sin revisión humana) |
| Tasa de falsos negativos | `NOT_AVAILABLE` (sin negativos de ground truth recopilados) |

## Tabla de clasificación (agrupada por regla y repositorio)

Cada finding tiene exactamente una entrada. La celda `Classification` se deja deliberadamente vacía para Manuel. Rellenar las respuestas en una copia devuelta; no rellenar aquí automáticamente.

### Regla `AN-TEST-001`

| # | Repositorio | Severidad | Título | Path / archivo | Rango de evidencia | Evidencia (ref hash) | Dimensión | Recomendación | Classification | Pregunta para el revisor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | octocat/Hello-World | medium | Test files were not detected | `(none)` | — | fd282eb9 | testing | Add automated tests for critical behavior: Add focused automated tests for critical behavior and run them in the project workflow. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 2 | sindresorhus/type-fest | medium | Test files were not detected | `(none)` | — | 56502344 | testing | Add automated tests for critical behavior: Add focused automated tests for critical behavior and run them in the project workflow. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 3 | angular/angular | low | Test files were not included in the bounded snapshot | `(none)` | — | 07cfb038 | testing | Consider increasing ingestion limits to include test files: The bounded snapshot did not include test files; this may be a limitation of the ingestion limits. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 4 | vuejs/core | low | Test files were not included in the bounded snapshot | `(none)` | — | d6e90721 | testing | Consider increasing ingestion limits to include test files: The bounded snapshot did not include test files; this may be a limitation of the ingestion limits. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |

### Regla `AN-TEST-002`

| # | Repositorio | Severidad | Título | Path / archivo | Rango de evidencia | Evidencia (ref hash) | Dimensión | Recomendación | Classification | Pregunta para el revisor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | octocat/Hello-World | low | Test tooling was not detected | `(none)` | — | 3f0fd0e8 | testing | Document a testing entry point: Document and configure a test tool appropriate for the project, without assuming a specific framework. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 2 | sindresorhus/type-fest | low | Test tooling was not detected | `(none)` | — | 91eee195 | testing | Document a testing entry point: Document and configure a test tool appropriate for the project, without assuming a specific framework. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |

### Regla `AN-TOOL-001`

| # | Repositorio | Severidad | Título | Path / archivo | Rango de evidencia | Evidencia (ref hash) | Dimensión | Recomendación | Classification | Pregunta para el revisor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | octocat/Hello-World | low | Lint configuration was not detected | `(none)` | — | be347767 | code_quality | Add deterministic linting: Introduce a deterministic lint configuration and document how it is run in CI. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 2 | sindresorhus/type-fest | low | Lint configuration was not detected | `(none)` | — | b83751ee | code_quality | Add deterministic linting: Introduce a deterministic lint configuration and document how it is run in CI. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |

### Regla `AN-DEP-001`

| # | Repositorio | Severidad | Título | Path / archivo | Rango de evidencia | Evidencia (ref hash) | Dimensión | Recomendación | Classification | Pregunta para el revisor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sindresorhus/type-fest | medium | Package manifest has no detected lockfile | `package.json` | — | 629da0c5 | dependencies | Commit a dependency lockfile: Add and commit the lockfile matching the repository package manager. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 2 | expressjs/express | medium | Package manifest has no detected lockfile | `package.json` | — | 9e88116f | dependencies | Commit a dependency lockfile: Add and commit the lockfile matching the repository package manager. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |

### Regla `AN-CQ-002`

| # | Repositorio | Severidad | Título | Path / archivo | Rango de evidencia | Evidencia (ref hash) | Dimensión | Recomendación | Classification | Pregunta para el revisor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sindresorhus/type-fest | low | TypeScript strictness was not verified | `tsconfig.json` | — | 33c77894 | code_quality | Make TypeScript checks explicit: Document or enable the TypeScript compiler checks that the project intentionally relies on. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 2 | angular/angular | low | TypeScript strictness was not verified | `(none)` | — | e21c068d | code_quality | Make TypeScript checks explicit: Document or enable the TypeScript compiler checks that the project intentionally relies on. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 3 | vuejs/core | low | TypeScript strictness was not verified | `tsconfig.build.json` | — | 46762645 | code_quality | Make TypeScript checks explicit: Document or enable the TypeScript compiler checks that the project intentionally relies on. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 4 | nestjs/nest | low | TypeScript strictness was not verified | `tsconfig.json` | — | 514e3a10 | code_quality | Make TypeScript checks explicit: Document or enable the TypeScript compiler checks that the project intentionally relies on. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |

### Regla `AN-MAINT-001`

| # | Repositorio | Severidad | Título | Path / archivo | Rango de evidencia | Evidencia (ref hash) | Dimensión | Recomendación | Classification | Pregunta para el revisor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sindresorhus/type-fest | medium | Source file exceeds the initial size heuristic | `lint-rules/validate-jsdoc-codeblocks.js` | L425 | edfdede5 | maintainability | Review the oversized source module: Review the module boundaries and split the file only where that improves cohesive ownership. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 2 | expressjs/express | medium | Source file exceeds the initial size heuristic | `lib/response.js` | L1048 | 8ab0335e | maintainability | Review the oversized source module: Review the module boundaries and split the file only where that improves cohesive ownership. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 3 | angular/angular | medium | Source file exceeds the initial size heuristic | `adev/shared-docs/components/viewers/docs-viewer/docs-viewer.component.ts` | L449 | f5a044d3 | maintainability | Review the oversized source module: Review the module boundaries and split the file only where that improves cohesive ownership. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 4 | vuejs/core | medium | Source file exceeds the initial size heuristic | `packages-private/dts-test/defineComponent.test-d.tsx` | L2261 | 0e7b2e98 | maintainability | Review the oversized source module: Review the module boundaries and split the file only where that improves cohesive ownership. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |

### Regla `AN-ARCH-002`

| # | Repositorio | Severidad | Título | Path / archivo | Rango de evidencia | Evidencia (ref hash) | Dimensión | Recomendación | Classification | Pregunta para el revisor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sindresorhus/type-fest | medium | A relative import could not be resolved statically | `index.d.ts` | L2 | ebf39772 | architecture | Verify the unresolved relative import: Verify the import path and the project resolver configuration; this analyzer does not execute module resolution. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 2 | expressjs/express | medium | A relative import could not be resolved statically | `examples/auth/index.js` | L7 | b0414e44 | architecture | Verify the unresolved relative import: Verify the import path and the project resolver configuration; this analyzer does not execute module resolution. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 3 | angular/angular | medium | A relative import could not be resolved statically | `.ng-dev/release.mjs` | L44 | 93a525b6 | architecture | Verify the unresolved relative import: Verify the import path and the project resolver configuration; this analyzer does not execute module resolution. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 4 | vuejs/core | medium | A relative import could not be resolved statically | `packages-private/sfc-playground/src/download/download.ts` | L3 | ccb1b24f | architecture | Verify the unresolved relative import: Verify the import path and the project resolver configuration; this analyzer does not execute module resolution. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 5 | nestjs/nest | medium | A relative import could not be resolved statically | `gulpfile.mjs` | L13 | b7d72ed3 | architecture | Verify the unresolved relative import: Verify the import path and the project resolver configuration; this analyzer does not execute module resolution. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |

### Regla `AN-SEC-003`

| # | Repositorio | Severidad | Título | Path / archivo | Rango de evidencia | Evidencia (ref hash) | Dimensión | Recomendación | Classification | Pregunta para el revisor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | expressjs/express | low | Secret-like demo or test content was detected | `examples/auth/index.js` | — | d219ea17 | security | Replace demo credentials with placeholder references: Replace hard-coded demo credentials with placeholder references or clearly documented example values. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |
| 2 | vuejs/core | medium | A possible secret-like value was detected | `packages-private/template-explorer/src/theme.ts` | — | e3589532 | security | Verify whether the detected value is a real credential: Verify whether the value is a real credential; if it is, rotate it and remove it from version control. |  | ¿La condición existe realmente en el path/evidencia citado, y la recomendación es razonable? |

## Referencia del paquete de revisión

El detalle completo de cada finding (incluido el impacto de score y las limitaciones del snapshot) está en `/tmp/phase22-human-review/`. Mapeo a los archivos del paquete:

- `01-octocat-hello-world.md` — octocat/Hello-World (3 findings)
- `02-sindresorhus-type-fest.md` — sindresorhus/type-fest (7 findings)
- `03-expressjs-express.md` — expressjs/express (4 findings)
- `04-angular-angular.md` — angular/angular (4 findings)
- `05-react-react.md` — react/react (0 findings)
- `06-vuejs-core.md` — vuejs/core (5 findings)
- `07-nestjs-nest.md` — nestjs/nest (2 findings)
- `08-vitejs-vite.md` — vitejs/vite (0 findings)
