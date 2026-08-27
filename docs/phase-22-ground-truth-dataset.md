# Phase 22 — Dataset Ground-Truth (congelado)

## Propósito

Este documento define el dataset congelado y reproducible que la Phase 22.2 usará para ejecutar el pipeline determinista (ingestión de GitHub → analyzer → scoring) y posteriormente para soportar la clasificación humana ground-truth de los findings producidos.

La Phase 22.1 solo prepara el dataset. No contiene **findings, etiquetas humanas ni métricas**. Eso pertenece a los resultados de ejecución producidos en la Phase 22.2 y a la revisión humana posterior.

```text
DATASET (este documento) != RESULTADO DE EJECUCIÓN (Phase 22.2)
```

## Fecha de congelación

**2026-08-27.** Los commit SHAs siguientes se resolvieron una sola vez desde las ramas por defecto de los repositorios en esta fecha y ahora son anclas congeladas. Las referencias flotantes (`main`, `master`, `latest`) **no** son la fuente canónica para la ejecución.

## Criterios de selección de repositorios

- Ocho repositorios públicos, todos de ecosistemas principalmente JavaScript/TypeScript.
- La misma muestra central que el dataset del benchmark de la Phase 20, proporcionando continuidad con la evidencia de las Phases 13/14/16.
- Diversidad en tamaño, estructura, framework y tooling:
  - repositorio diminuto sin manifest (`octocat/Hello-World`);
  - librería TypeScript con tests y CI (`sindresorhus/type-fest`);
  - framework JavaScript/Node.js con tests y CI (`expressjs/express`);
  - repositorio grande TypeScript/Angular (`angular/angular`);
  - repositorio grande JavaScript/React (`facebook/react`, canónico `react/react`);
  - repositorio TypeScript/Vue (`vuejs/core`);
  - framework TypeScript/Node.js con tests y CI (`nestjs/nest`);
  - repositorio TypeScript de build-tooling con tests y CI (`vitejs/vite`).
- Todos los repositorios son públicos y se verificaron como `private: false`.
- `facebook/react` se analiza bajo su identidad canónica `react/react` porque GitHub redirige el alias heredado (mismo comportamiento que las Phases 13–20).

## Dataset congelado

| Repository | Ref (SHA congelado) | Commit SHA | maxFileCount | maxApiRequests | maxJsonResponseBytes | maxTotalBytes | Timeout (ingestión) | Analyzer version | Scoring version |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `octocat/Hello-World` | SHA | `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |
| `sindresorhus/type-fest` | SHA | `3fe02d33596f8afa167bc465d9d9ac9ab81b497e` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |
| `expressjs/express` | SHA | `023767fe9872e029271df1418f73401bff20ff40` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |
| `angular/angular` | SHA | `133cafda42028fbd8efd7840d6ff3fea25223166` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |
| `react/react` | SHA | `29d9d3184484b03cb0369e0494617207df777b7a` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |
| `vuejs/core` | SHA | `d63616ca17de965ed32dcb449a4c5cd9982f15d2` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |
| `nestjs/nest` | SHA | `a333a9dae6169537da3954c5b1ac35202b057fcb` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |
| `vitejs/vite` | SHA | `ee644014aab61e546742b862a7d7b0d6c7d67a7b` | 50 | 125 | 4 MiB | 2 MiB | 60 s | 1.0.0 `f9361be8` | 1.0.0 `f9361be8` |

## Parámetros de ejecución

Todos los valores son los valores contractuales por defecto existentes — ninguno se cambió para este dataset:

| Parámetro | Valor | Fuente |
| --- | ---: | --- |
| `maxFileCount` | 50 | `packages/github/src/policy.ts` |
| `maxApiRequests` | 125 | `packages/github/src/policy.ts` |
| `maxJsonResponseBytes` | 4 MiB | `packages/github/src/policy.ts` |
| `maxTotalBytes` | 2 MiB | `packages/github/src/policy.ts` |
| `maxFileBytes` | 256 KiB | `packages/github/src/policy.ts` |
| `maxTreeEntries` | 5.000 | `packages/github/src/policy.ts` |
| `requestTimeoutMs` | 10.000 | `packages/github/src/policy.ts` |
| `ingestionTimeoutMs` | 60.000 | `packages/github/src/policy.ts` |

## Versiones

- Analyzer: paquete `@ai-developer-platform/analyzer` versión `1.0.0` en el commit `f9361be8048ea17084be44e83e364461fd4f5ccf` del proyecto (todas las reglas en `packages/analyzer/src/analysis.ts` y `classification.ts`).
- Scoring: paquete `@ai-developer-platform/scoring` versión `1.0.0` en el mismo commit del proyecto (5 dimensiones: architecture, testing, documentation, dependencies, code_quality).
- Ingestión: `@ai-developer-platform/github` versión `1.0.0` en el mismo commit del proyecto, incluido el traversal segmentado del tree de la Phase 21.

## Procedimiento de reproducción

```bash
# Requiere GITHUB_TOKEN (o GH_TOKEN) en el entorno; nunca se imprime.
# Ejecuta el dataset congelado con commit SHAs exactos como refs.
pnpm --filter @ai-developer-platform/api exec tsx src/validate-ground-truth.ts

# Restringir a un solo repositorio (validación seca / ejecuciones parciales):
pnpm --filter @ai-developer-platform/api exec tsx src/validate-ground-truth.ts octocat/Hello-World
```

El runner:

- usa exactamente el SHA congelado como `ref` de la ingestión (nunca ramas flotantes);
- verifica que el commit del snapshot resuelto sea igual al SHA congelado (`commit_mismatch` en caso contrario);
- ejecuta solo el pipeline existente (`ingestRepository` → `analyze` → `scoreAnalysis`);
- escribe metadatos de resultado sanitizados en `/tmp/phase22-ground-truth-results.jsonl`;
- no ejecuta código del repositorio ni instala dependencias del repositorio.

## Validación realizada (Phase 22.1)

- Los 8 repositorios se resolvieron mediante la GitHub API autenticada y son públicos.
- Cada SHA congelado se verificó como resoluble (`GET /commits/{sha}` devuelve el mismo SHA).
- No queda ninguna referencia flotante como fuente canónica de ejecución.
- Los límites se confirmaron sin cambios respecto a `DEFAULT_INGESTION_LIMITS` (ver tabla de parámetros).
- El runner consumió el dataset en una ejecución de validación seca (`octocat/Hello-World`, `maxFileCount=50`).

## Seguridad

- Solo repositorios públicos; sin datos privados.
- El runner lee el token de `GITHUB_TOKEN ?? GH_TOKEN`, lo pasa a `GitHubRestClient` y nunca lo imprime, persiste ni incluye en artefactos.
- No aparecen secretos, credenciales ni cabeceras Authorization en este documento, en el runner ni en el artefacto de salida.
- La plataforma nunca ejecuta código de los repositorios analizados ni instala sus dependencias.

## Limitaciones

- Los SHAs están congelados en la resolución del 2026-08-27; los commits upstream posteriores quedan deliberadamente fuera del alcance de este dataset.
- `react/react` es la identidad canónica del alias heredado `facebook/react`.
- `octocat/Hello-World` usa la rama por defecto `master`; esto es metadatos registrados, y la ejecución siempre usa el SHA congelado.
- El dataset deliberadamente no incluye `microsoft/TypeScript` ni `nodejs/node`; los repositorios de tree grande quedan fuera del alcance de la Phase 22.2 (ver limitaciones de la Phase 21).

## Relación con la Phase 22.2

La Phase 22.2 ejecutará este dataset congelado con `src/validate-ground-truth.ts`, producirá el artefacto de resultados de ejecución y usará esos resultados para construir el paquete de revisión humana ground-truth (clasificación de findings y, solo donde sea defendible, métricas de precisión/falsos positivos). Este documento permanece congelado y no absorbe resultados de ejecución.

## Invariantes del dataset

- Los commits son inmutables; los SHAs anteriores son las anclas canónicas.
- El dataset es la entrada de la Phase 22.2.
- Aún no contiene ground truth humano.
- Aún no contiene etiquetas TP/FP/uncertain/not-evaluable.
- Aún no contiene métricas.
