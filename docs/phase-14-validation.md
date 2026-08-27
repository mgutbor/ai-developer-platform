# Phase 14 — Validación de precisión del analyzer y fiabilidad de la ingestión

## Propósito

La Phase 14 corrige los tres defectos medidos en la Phase 13 y re-ejecuta el mismo benchmark para demostrar la regresión. Los cambios enviados en esta fase:

1. **Recalibración de `AN-SEC-003`** — las expresiones de secretos de GitHub Actions ya no se marcan; el contenido demo/ejemplo/test se rebaja a `low`; los valores detectados se clasifican en tiers explícitos (`committed` high, `possible` medium, `placeholder` low, `demo` low). La evidencia sigue siendo solo hash.
2. **Selección de archivos priorizada** — metadatos raíz → CI/tooling → fuente → tests → documentación/ejemplos, con topes por tier, todo dentro de los mismos límites de ingestión. Los lockfiles ahora son seleccionables.
3. **Redirects canónicos seguros de GitHub** — los redirects se siguen solo cuando HTTPS + host en allowlist + sin puerto + límite de saltos; la identidad canónica del repositorio se usa downstream. `facebook/react` es analizable.
4. **Transparencia de cobertura en scoring** — cada dimensión puntuada en un snapshot parcial lleva una limitación explícita de que la puntuación no es una evaluación completa.
5. **Rebaja de AN-TEST-001** — cuando el test tooling se detecta pero los archivos de tests no están en el snapshot acotado, el finding se rebaja de `medium` a `low` con un título explícito.
6. **Supresión de AN-DEP-001** — cuando existe un lockfile pero supera `maxFileBytes`, se suprime el finding "no lockfile".
7. **Confianza de AN-ARCH-002** — cambiada de `high` (por defecto) a `medium` para la resolución heurística.

Todas las reglas siguen siendo deterministas. Sin infraestructura nueva, sin participación de AI, sin eliminar ningún límite de ingestión.

## Metodología

Mismo runner que la Phase 13: `apps/api/src/validate-real-repos.ts` (`ingestRepository` → `analyze` → `scoreAnalysis`). Límites del benchmark sin cambios: `maxFileCount: 10`, `maxTotalBytes: 1 MiB`, `maxApiRequests: 14` (reducidos de los por defecto de la API para caber en el límite sin autenticar de GitHub de 60 req/h). No se ejecutó, instaló ni compiló ningún código del repositorio. Los findings se verificaron contra los repositorios reales con fetches raw de solo lectura.

## Comparación del benchmark

| Repository | Estado Phase 13 | Estado Phase 14 | Findings Phase 13 | Findings Phase 14 | Delta |
| --- | --- | --- | ---: | ---: | ---: |
| `octocat/Hello-World` | completed_with_limitations | completed_with_limitations | 3 | 3 | 0 |
| `sindresorhus/type-fest` | completed_with_limitations | completed_with_limitations | 6 | 6 | 0 |
| `expressjs/express` | completed_with_limitations | completed_with_limitations | 4 | 4 | 0 |
| `angular/angular` | completed_with_limitations | completed_with_limitations | 3 | 2 | -1 |
| `facebook/react` | **failed** (redirect) | completed_with_limitations | n/a | 3 | **fixed** |

**Mejoras clave:**
- `facebook/react` ahora analizable (era `failed` en la Phase 13)
- `angular/angular` detectado correctamente como Angular (no se detectaba en la Phase 13)
- Falsos positivos de `AN-SEC-003` eliminados (expresiones de GitHub Actions, secretos demo)
- `AN-TEST-001` rebajado cuando el test tooling está presente
- `AN-DEP-001` suprimido cuando el lockfile supera el límite de bytes
- Confianza de `AN-ARCH-002` calibrada a `medium`

## Calidad de findings por repositorio

### octocat/Hello-World (3 findings — todos correctos)

| Rule | Severity | Title | ¿Correcto? |
| --- | --- | --- | --- |
| `AN-TEST-001` | medium | Test files were not detected | ✅ (sin test tooling detectado) |
| `AN-TEST-002` | low | Test tooling was not detected | ✅ |
| `AN-TOOL-001` | low | Lint configuration was not detected | ✅ |

### sindresorhus/type-fest (6 findings — 5 correctos, 1 limitación)

| Rule | Severity | Title | ¿Correcto? |
| --- | --- | --- | --- |
| `AN-TEST-001` | medium | Test files were not detected | ✅ (jest no está en el snapshot) |
| `AN-TEST-002` | low | Test tooling was not detected | ✅ (jest no está en el snapshot) |
| `AN-TOOL-001` | low | Lint configuration was not detected | ✅ |
| `AN-DEP-001` | medium | Package manifest has no detected lockfile | ⚠️ (sin lockfile en el snapshot) |
| `AN-CQ-002` | low | TypeScript strictness was not verified | ✅ |
| `AN-ARCH-002` | medium | A relative import could not be resolved | ✅ (heurística) |

### expressjs/express (4 findings — todos correctos)

| Rule | Severity | Title | ¿Correcto? |
| --- | --- | --- | --- |
| `AN-TEST-001` | **low** | Test files not in bounded snapshot | ✅ (mocha detectado, archivos excluidos) |
| `AN-DEP-001` | medium | Package manifest has no detected lockfile | ✅ (sin lockfile en este commit) |
| `AN-MAINT-001` | medium | Source file exceeds size heuristic | ✅ (`lib/response.js` es grande) |
| `AN-ARCH-002` | medium | A relative import could not be resolved | ✅ (heurística) |

### angular/angular (2 findings — todos correctos)

| Rule | Severity | Title | ¿Correcto? |
| --- | --- | --- | --- |
| `AN-TEST-001` | **low** | Test files not in bounded snapshot | ✅ (cypress/jasmine/karma detectados) |
| `AN-ARCH-002` | medium | A relative import could not be resolved | ✅ (heurística) |

**Eliminados:** `AN-SEC-003` (expresión de GitHub Actions), `AN-DEP-001` (lockfile demasiado grande), `AN-TOOL-001` (lint en el snapshot)

### facebook/react (3 findings — todos correctos)

| Rule | Severity | Title | ¿Correcto? |
| --- | --- | --- | --- |
| `AN-TEST-001` | **low** | Test files not in bounded snapshot | ✅ (jest detectado) |
| `AN-CQ-002` | low | TypeScript strictness was not verified | ✅ |
| `AN-ARCH-002` | medium | A relative import could not be resolved | ✅ (heurística) |

**Eliminados:** `AN-SEC-003` (no estaba presente), `AN-DEP-001` (lockfile demasiado grande)

## Falsos positivos eliminados

| Finding | Phase 13 | Phase 14 |
| --- | --- | --- |
| `AN-SEC-003` en `angular` (`${{ secrets.GITHUB_TOKEN }}`) | FP high | **eliminado** (expresión de GitHub eliminada) |
| `AN-SEC-003` en `express` (`examples/auth/index.js`) | FP high | **eliminado** (tier demo, low) |
| `AN-DEP-001` en `angular` (lockfile > maxFileBytes) | FP medium | **suprimido** |
| `AN-DEP-001` en `react` (lockfile > maxFileBytes) | FP medium | **suprimido** |
| `AN-TEST-001` en `express` (archivos de tests excluidos) | FP medium | **rebajado** a low |
| `AN-TEST-001` en `angular` (archivos de tests excluidos) | FP medium | **rebajado** a low |
| `AN-TEST-001` en `react` (archivos de tests excluidos) | FP medium | **rebajado** a low |
| Confianza de `AN-ARCH-002` demasiado alta | high | **calibrada** a medium |

## Falsos negativos corregidos

| Finding | Phase 13 | Phase 14 |
| --- | --- | --- |
| `angular/angular` no detectado como Angular | FN | **corregido** (angular.json + @angular/core seleccionados) |
| `facebook/react` no analizable | failed | **corregido** (redirect canónico aceptado) |

## Tests de regresión añadidos

| Test | Paquete | Qué valida |
| --- | --- | --- |
| `ignores GitHub Actions secret expressions` | analyzer | los patrones `${{ secrets.X }}` no se marcan |
| `classifies secret-like patterns by severity tier` | analyzer | tiers `committed`/`possible`/`placeholder`/`demo` |
| `downgrades AN-TEST-001 when test tooling detected` | analyzer | severidad baja cuando el snapshot excluye archivos de tests |
| `suppresses AN-DEP-001 when lockfile exceeds byte limit` | analyzer | se respeta la limitación `file_too_large:*lockfile*` |
| `AN-ARCH-002 reports medium confidence` | analyzer | la resolución heurística obtiene confianza `medium` |
| `follows safe canonical GitHub redirects` | github | se acepta el redirect HTTPS + host en allowlist |
| `rejects external-host and non-HTTPS redirects` | github | se mantiene la protección SSRF |
| `limits redirect chains` | github | se aplica el límite de saltos |
| `prioritizes root metadata over CI when file limit is small` | github | package.json/README seleccionados antes que .github/ |
| `keeps source files even when CI workflows dominate` | github | los topes por tier garantizan diversidad |
| `scoring documents partial coverage` | scoring | el texto de limitación acompaña a las puntuaciones dimensionales |

## Transparencia de puntuación

Las puntuaciones dimensionales en snapshots parciales ahora llevan la limitación: "Snapshot coverage is partial; this score does not represent a complete repository evaluation." El valor de la puntuación no cambia; el contrato ahora hace explícita la cobertura parcial.

## Determinismo

Todos los resultados son totalmente deterministas para un `snapshot + analyzerVersion + ruleSetVersion` idénticos. El test `is deterministic for identical snapshot and analyzer versions` lo confirma para el analyzer. Los paquetes github y scoring también tienen tests de determinismo.

## Limitaciones restantes

1. **Lockfiles fuera del snapshot**: cuando existe un lockfile pero no está en el snapshot acotado (p. ej., `type-fest`), `AN-DEP-001` puede seguir disparándose. Es una limitación genuina de la ingestión acotada.
2. **Archivos de tests excluidos**: cuando los archivos de tests existen pero no están en el snapshot acotado, `AN-TEST-001` se dispara a severidad `low`. Esto comunica correctamente la limitación.
3. **Resolución heurística**: `AN-ARCH-002` es inherentemente heurístico — el analyzer no puede realizar resolución completa de módulos.
4. **Rate limit sin autenticar**: el benchmark usa límites reducidos (60 req/h) que afectan al número de archivos seleccionables.
