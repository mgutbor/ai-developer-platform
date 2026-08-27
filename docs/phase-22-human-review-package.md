# Phase 22.2 — Paquete de revisión humana (evidencia, sin clasificación)

## Objetivo

Ejecutar el dataset congelado de la Phase 22.1 (8 repositorios públicos, SHAs de commit exactos) a través del pipeline determinista existente (ingestion → analyzer → scoring) y producir un **paquete de evidencia reproducible** para la posterior revisión ground-truth humana de Manuel.

Esta fase **solo produce evidencia**. No **clasifica** findings, no **calcula** precision/recall/accuracy y no **cambia** ninguna regla del analyzer, fórmula de scoring, comportamiento de ingestión ni límite de recursos.

```text
DATASET (Phase 22.1, congelado)
        ↓
8 ejecuciones (esta fase)
        ↓
FINDINGS + EVIDENCIA (paquete de revisión, esta fase)
        ↓
[Manuel clasifica en la Phase 22.3]
        ↓
MÉTRICAS
        ↓
DECISIÓN
```

## Dataset utilizado

Exactamente los 8 repositorios y SHAs congelados de `docs/phase-22-ground-truth-dataset.md`. La ejecución usa el SHA congelado como `ref` de ingestión; las referencias flotantes nunca se usan como fuente canónica.

| # | Repositorio | SHA congelado |
| --- | --- | --- |
| 1 | `octocat/Hello-World` | `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` |
| 2 | `sindresorhus/type-fest` | `3fe02d33596f8afa167bc465d9d9ac9ab81b497e` |
| 3 | `expressjs/express` | `023767fe9872e029271df1418f73401bff20ff40` |
| 4 | `angular/angular` | `133cafda42028fbd8efd7840d6ff3fea25223166` |
| 5 | `react/react` | `29d9d3184484b03cb0369e0494617207df777b7a` |
| 6 | `vuejs/core` | `d63616ca17de965ed32dcb449a4c5cd9982f15d2` |
| 7 | `nestjs/nest` | `a333a9dae6169537da3954c5b1ac35202b057fcb` |
| 8 | `vitejs/vite` | `ee644014aab61e546742b862a7d7b0d6c7d67a7b` |

## Parámetros de ejecución

Defaults contractuales, sin cambios:

| Parámetro | Valor |
| --- | ---: |
| `maxFileCount` | 50 |
| `maxApiRequests` | 125 |
| `maxJsonResponseBytes` | 4 MiB |
| `maxTotalBytes` | 2 MiB |
| `maxFileBytes` | 256 KiB |
| `maxTreeEntries` | 5,000 |
| `requestTimeoutMs` | 10,000 |
| `ingestionTimeoutMs` | 60,000 |

Versión del analyzer `1.0.0`, versión del scoring `1.0.0` (commit del proyecto `f9361be8048ea17084be44e83e364461fd4f5ccf`).

## Ejecución

- Runner: `apps/api/src/validate-ground-truth.ts`.
- Marca de tiempo de la ejecución (UTC): **2026-08-27 16:02**.
- Modo: secuencial (8 repositorios, un cliente+snapshot cada uno) para mantener los requests acotados y seguir siendo reproducible.
- Ejecución por repositorio: `GET` del repositorio → resolver SHA de commit → (Stage: el commit del snapshot) → ingestion → analyzer → scoring.

## Artefactos

| Ruta | Contenido |
| --- | --- |
| `/tmp/phase22-ground-truth-results.jsonl` | Resumen saneado por ejecución (8 líneas): repositorio, SHA congelado + SHA resuelto (verificados iguales), estado, categoría de ingestión, requests, conteos de tree/blob/otros requests, conteo de archivos seleccionados, bytes totales, findings, cobertura, limitaciones, latencia. |
| `/tmp/phase22-human-review/` | El paquete de evidencia de revisión: `README.md`, `00-summary.md` y un archivo de revisión por repositorio. |
| `docs/phase-22-human-review-package.md` | Este documento. |

### Estructura del paquete de revisión

```text
/tmp/phase22-human-review/
├── README.md
├── 00-summary.md
├── 01-octocat-hello-world.md
├── 02-sindresorhus-type-fest.md
├── 03-expressjs-express.md
├── 04-angular-angular.md
├── 05-react-react.md
├── 06-vuejs-core.md
├── 07-nestjs-nest.md
└── 08-vitejs-vite.md
```

Cada repositorio del dataset tiene un archivo, incluso aquellos que no produjeron findings.

## Formato de los findings

Cada archivo de revisión empieza con repositorio / commit / versión del analyzer / versión del scoring / estado de ejecución / cobertura / limitaciones, y luego una sección `## Findings`. Cada finding lista solo la evidencia producida por el analyzer: regla, severidad, título, mensaje, evidencia (id, kind, path, range, hash del excerpt), recomendación, dimensión e impacto de score cuando esté disponible. Los excerpts de evidencia **no** se incrustan como contenido del repositorio — la evidencia del analyzer determinista lleva un hash de excerpt + location; el contenido completo no se persiste.

Los findings de tipo missing-test / missing-lint / missing-doc referencian evidencia `kind=metadata` (una observación a nivel de repositorio, path `(none)`).

Cada finding termina con una **plantilla de revisión vacía** reservada para Manuel:

```text
### Human review

- Classification: [TP | FP | UNCERTAIN | NOT_EVALUABLE]
- Reviewer notes:
- Evidence sufficient: [YES | NO]
- Actionable: [YES | NO]
- Reviewer confidence: [HIGH | MEDIUM | LOW]
```

más preguntas concretas para el revisor. Nada está pre-llenado.

## Resumen de resultados

8 ejecuciones; el SHA coincide con el ancla congelada en las 8 (las 2 que terminaron `failed` aún resolvieron el SHA congelado antes del fallo y se registran como tales).

| Repositorio | Estado | Requests | Archivos | Findings |
| --- | --- | ---: | ---: | ---: |
| `octocat/Hello-World` | ok | 5 | 1 | 3 |
| `sindresorhus/type-fest` | ok | 62 | 50 | 7 |
| `expressjs/express` | ok | 93 | 21 | 4 |
| `angular/angular` | ok | 109 | 50 | 4 |
| `react/react` | failed (`ingestion_limit_reached`) | 125 | n/a | n/a |
| `vuejs/core` | ok | 83 | 50 | 5 |
| `nestjs/nest` | ok | 96 | 50 | 2 |
| `vitejs/vite` | failed (`ingestion_limit_reached`) | 125 | n/a | n/a |

**Total de findings producidos: 25** (en los 6 repositorios cuyos snapshots se completaron).

### Findings por regla (contadores de evidencia — no exactitud)

| Regla | Conteo |
| --- | ---: |
| `AN-ARCH-002` | 5 |
| `AN-TEST-001` | 4 |
| `AN-CQ-002` | 4 |
| `AN-MAINT-001` | 4 |
| `AN-TEST-002` | 2 |
| `AN-TOOL-001` | 2 |
| `AN-DEP-001` | 2 |
| `AN-SEC-003` | 2 |

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
| architecture | 5 |
| code_quality | 6 |
| dependencies | 2 |
| documentation | 0 |
| maintainability | 4 |
| security | 2 |
| testing | 6 |

### Cobertura de reglas prioritarias observada

| Regla | Observada en el dataset |
| --- | --- |
| `AN-SEC-003` | FOUND |
| `AN-TEST-001` | FOUND |
| `AN-DEP-001` | FOUND |
| `AN-ARCH-002` | FOUND |
| `AN-DOC-001` | NOT_FOUND |

`NOT_FOUND` es solo una observación registrada; no es evidencia de que una regla funcione o falle.

## Estado de cobertura / ingestión

La cobertura refleja el snapshot, no la salud del repositorio.

- `octocat/Hello-World`: cobertura `insufficient` (`tree_segmented_acquisition`).
- `expressjs/express`: cobertura `partial` (`tree_segmented_acquisition`).
- `type-fest`, `angular/angular`, `vuejs/core`, `nestjs/nest`: cobertura `partial` con limitaciones como `tree_segmented_early_termination`, `tree_truncated`, `file_count_limit_reached` y ocasional `file_too_large:<path>`.
- `react/react` y `vitejs/vite`: cobertura `null`, ingestión `ingestion_limit_reached` — sin snapshot, sin findings.

## Explicación del fallo — react/react y vitejs/vite

Ambos repositorios grandes excedieron el `maxApiRequests=125` contractual antes de completar un snapshot de `maxFileCount=50`:

- `react/react`: 81 requests de árbol + 41 requests de blob + 3 requests de resolución = 125.
- `vitejs/vite`: 79 requests de árbol + 43 requests de blob + 3 requests de resolución = 125.

Seleccionar y obtener 50 archivos de estos árboles grandes requiere más de 125 requests de API bajo el modelo actual de obtención por archivo (`3 de resolución + <recorrido de árbol> + 50 blob`). Es el mismo conflicto de presupuesto de recursos acotados documentado en las Phases 21.10/21.11 (TypeScript/100) y es **una limitación de producto, no un defecto del analyzer**. Los archivos de revisión de estos dos repositorios declaran `NO FINDINGS GENERATED` y registran los conteos limitantes exactos; nada está fabricado, y el snapshot se reporta como ausente (cobertura `null`), nunca como completo.

Según las reglas de la fase, no se elevó ningún límite ni se cambió ningún parámetro para forzar la finalización de estos dos. Esto sigue siendo un punto de decisión para una fase posterior (cobertura cercana acotada, o aceptar que `maxFileCount=50` no puede alcanzarse para repositorios muy grandes dentro de `maxApiRequests=125`).

## Separación evidencia / clasificación

- Este paquete contiene **solo contadores de evidencia**. No usa terminología de exactitud (sin precision, recall, accuracy, false-positive-rate, false-negative-rate).
- Ningún finding está etiquetado como TP/FP/uncertain/not-evaluable; esos campos son plantillas vacías.
- La trazabilidad se preserva: repositorio → commit → snapshot → path/range → regla → finding → recomendación (capturada en cada archivo de revisión y en el JSONL).

## Verificación de seguridad

- `GITHUB_TOKEN` / `GH_TOKEN`: leídos del entorno, pasados a `GitHubRestClient`, nunca impresos, persistidos, commiteados ni incluidos en ningún artefacto.
- Artefactos escaneados (`/tmp/phase22-ground-truth-results.jsonl` y `/tmp/phase22-human-review/`): sin ocurrencia de `GITHUB_TOKEN`, `GH_TOKEN`, `Authorization`, `Bearer` ni credenciales.
- Ningún código del repositorio ejecutado; ninguna dependencia del repositorio instalada; ningún repositorio analizado modificado.
- Los contenidos del repositorio se tratan estrictamente como datos y no se persisten (la evidencia del analyzer es un hash + location).

## Limitaciones

- Dos de los ocho repositorios no produjeron findings porque `maxApiRequests=125` no puede servir un snapshot de 50 archivos para sus árboles grandes; esto se registra, no se reinterpreta.
- La cobertura es `partial`/`insufficient` en la mayoría de los repositorios, coincidiendo con el contrato de snapshot acotado del producto.
- Los findings son un snapshot en los SHAs congelados (2026-08-27).
- El paquete de evidencia refleja solo esta versión del analyzer/scoring.
- Aún no hay ground truth verificado por humanos: precision/recall/accuracy **no se calculan** deliberadamente y siguen siendo responsabilidad de la Phase 22.3 bajo la revisión de Manuel.

## Reproducción

```bash
# Requiere GITHUB_TOKEN (o GH_TOKEN).
pnpm --filter @ai-developer-platform/api exec tsx src/validate-ground-truth.ts
```

Esto reescribe `/tmp/phase22-ground-truth-results.jsonl` y `/tmp/phase22-human-review/`. Los resultados son deterministas dado el dataset congelado y este commit.

## Procedimiento para Manuel (Phase 22.3)

1. Abrir el paquete de revisión: `open /tmp/phase22-human-review/README.md`.
2. Para cada finding, usar la plantilla vacía `### Human review`: elegir `Classification` entre `TP | FP | UNCERTAIN | NOT_EVALUABLE`, completar `Evidence sufficient`, `Actionable`, `Reviewer confidence` y responder las preguntas del revisor.
3. Tratar cada finding de forma independiente. No inferir que una regla correcta implica TP, ni que la ausencia de un finding implica FN.
4. Registrar los archivos completados; la Phase 22.3 los agregará en métricas solo donde la muestra clasificada sea defendible.

## Relación con otras fases

- La Phase 22.1 congeló el dataset (sin cambios). La Phase 22.2 lo ejecuta y produce este paquete de evidencia. La Phase 22.3 es la clasificación humana de Manuel. La Phase 22.4 (futura) puede calcular la exactitud defendible y la decisión de producto (KEEP/CALIBRATE/BLOCK).
