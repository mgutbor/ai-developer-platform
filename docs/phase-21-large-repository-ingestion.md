# Phase 21 — Diseño de ingestión para repositorios grandes y adquisición acotada de árboles

## 1. Problema

La Phase 20.2 produjo evidencia reproducible de que la estrategia inicial de ingestión no puede analizar los dos repositorios más grandes del dataset del benchmark:

- `microsoft/TypeScript` falla sistemáticamente con `maxFileCount` 10/50/100;
- `nodejs/node` falla sistemáticamente con `maxFileCount` 10/50/100;
- ambos repositorios devuelven JSON válido de árbol Git recursivo de aproximadamente 17–18 MB;
- el cliente aplica `maxJsonResponseBytes = 4 MiB` por respuesta;
- el fallo ocurre antes de la selección de archivos, del analyzer y del scoring;
- 2 de los 15 repositorios del benchmark (13,3 %) se vieron afectados.

La Phase 21 diseñó y validó una estrategia de adquisición acotada que analiza esos repositorios sin eliminar límites, sin aumentar `maxJsonResponseBytes` y sin cambiar analyzer, scoring, AI, persistence ni arquitectura.

```text
PHASE 21 = COMPLETED WITH DOCUMENTED LIMITATION
```

## 2. Causa raíz

### 2.1 Adquisición monolítica de árbol recursivo

El `getTree` original solicitaba el árbol recursivo completo (`?recursive=1`) para el commit objetivo y rechazaba cualquier respuesta superior a 4 MiB. Para `microsoft/TypeScript` y `nodejs/node`, la respuesta del árbol recursivo es un documento JSON válido de aproximadamente 17–18 MB, por lo que la adquisición siempre fallaba con `invalid_response` antes de que pudiera seleccionarse ningún archivo. Esta es una limitación legítima de ingestión, no un defecto del analyzer ni del scoring.

### 2.2 Artefacto compilado obsoleto (Phase 21.5)

Durante el desarrollo, el runner cargaba `packages/github/dist/*` (el mapa `exports` del paquete apunta a `dist/index.js`), y el artefacto compilado aún contenía la implementación antigua de `resolveTree()` que solicitaba `/commits/{commitSha}` en lugar del corregido `/git/commits/{commitSha}`. Ese artefacto obsoleto producía `invalid_response` contra respuestas válidas de GitHub. Reconstruir `@ai-developer-platform/github` sincronizó `dist` con `src` y eliminó la divergencia. `dist/` está en gitignore; un checkout o build limpio siempre lo regenera.

### 2.3 Uso incorrecto del SHA de subtree (Phase 21.1/21.2)

Un fallback segmentado inicial intentaba recorrer subdirectorios pasando el SHA del commit o semánticas filtradas por path a `GET /git/trees/{sha}`. GitHub requiere el SHA del propio objeto árbol para el recorrido anidado. El contrato corregido es:

1. resolver el commit HEAD del repositorio;
2. resolver el commit a su SHA de árbol raíz mediante `GET /git/commits/{commitSha}`;
3. solicitar el árbol raíz con `GET /git/trees/{rootTreeSha}` (no recursivo);
4. para cada entrada `type=tree`, usar el propio `sha` de esa entrada para la siguiente solicitud;
5. transportar la ruta relativa acumulada por separado;
6. nunca usar un SHA de commit donde se requiera un SHA de árbol.

## 3. Enfoques rechazados

| Enfoque | Por qué se rechazó |
| --- | --- |
| Mantener el árbol recursivo completo y rechazar > 4 MiB | Falla todos los escenarios de los dos repositorios grandes |
| Aumentar `maxJsonResponseBytes` | Prohibido por el contrato de la fase y elimina un límite de seguridad |
| Solicitudes de árbol filtradas por path (`getTreePath`) | GitHub no admite semánticas de path en el endpoint Git Trees; se demostró inviable |
| Recorrer con el SHA de commit para subdirectorios | GitHub requiere el SHA del objeto árbol; producía `tree_unavailable` |
| Workers, colas, Redis, PostgreSQL, caché, RAG | Fuera de alcance; el MVP debe mantenerse simple y seguro |
| Detenerse de forma ingenua al descubrir `maxFileCount` candidatos | Puede omitir candidatos de mayor prioridad o lexicográficamente anteriores; no preserva la semántica |

## 4. Estrategia adoptada

### 4.1 Recorrido segmentado basado en SHA

`acquireTree` en `packages/github/src/ingestion.ts` realiza un recorrido determinista en amplitud sobre objetos de árbol no recursivos, usando el SHA propio de cada entrada `type=tree`, con:

- rutas relativas acumuladas;
- un conjunto de SHAs de árbol visitados (sin recorrido repetido, sin ciclos);
- `maxTreeEntries`, `maxApiRequests`, `maxJsonResponseBytes` y enforcement de timeout en cada solicitud;
- reporte de truncamiento para cualquier respuesta truncada.

### 4.2 Terminación temprana que preserva la semántica (Phase 21.9)

El recorrido solo puede detenerse temprano cuando cada subtree pendiente es demostrablemente incapaz de cambiar la selección observable de archivos:

- la selección observable son las primeras `min(maxFileCount, maxTreeEntries)` entradas del resultado existente de `selectEntries()` (caps por tier → orden de path), que es exactamente lo que la adquisición de blobs obtiene;
- para cada subtree pendiente se compara un límite inferior conservador `path + "/"` (con el mismo `localeCompare` usado por la selección) contra el peor path de la ventana de cada tier;
- se rechaza la terminación cuando un subtree pendiente podría llenar un slot vacío de la ventana, podría aportar un tier por debajo de uno ya presente en la ventana, o podría contener un path que se ordene antes del peor path de la ventana;
- las entradas tier-1 son solo raíz y nunca son posibles dentro de un subtree; las tier-2 solo bajo `.github/workflows`;
- **las respuestas truncadas desactivan por completo la terminación temprana** (nunca terminar sobre datos incompletos);
- si el límite no puede establecerse, el recorrido continúa.

### 4.3 Omisión de subtrees excluidos

Los subtrees dentro de directorios excluidos (`node_modules`, `dist`, `build`, `vendor`, `.git`, ...) contienen demostrablemente cero archivos seleccionables, por lo que nunca se ponen en cola. Esto preserva la selección exactamente y evita requests desperdiciados.

### 4.4 Selección de referencia sin cambios

`selectEntries()` no cambia (caps por tier → `path.localeCompare` → slice de `maxTreeEntries`) y ahora se exporta para tests de regresión. La obtención de blobs sigue ocurriendo solo después de que la selección final está fijada.

## 5. Argumento de preservación de la semántica

- La selección final siempre la produce el `selectEntries()` sin cambios sobre las entradas acumuladas.
- La terminación temprana solo se activa cuando el conjunto acumulado ya determina las primeras `maxFileCount` entradas de esa selección.
- El orden, los caps por tier y la semántica de `maxFileCount` no cambian; `maxTotalBytes` sigue aplicándose durante la adquisición de blobs.
- Los fixtures de regresión afirman selección idéntica contra un recorrido completo de referencia para: candidatos de mayor prioridad tempranos y tardíos, desplazamiento lexicográfico, múltiples tiers, caps por tier, árboles anidados, SHAs duplicados, directorios profundos excluidos, árboles truncados, subtrees ambiguos, `maxFileCount` 1/10/mayor, límite de requests y casos de timeout.
- En repositorios reales, los paths seleccionados son consistentes en prefijo a través de `maxFileCount` 10 → 50 → 100 (verificado para ambos repositorios), es decir, aumentar el conteo de archivos extiende la selección sin cambiar el orden.

## 6. Restricciones de seguridad y recursos

Todos los controles permanecen intactos:

- allowlist de hosts HTTPS de GitHub y `redirect: 'manual'` con hosts de redirect permitidos;
- límite de requests (`maxApiRequests = 125`), límite de bytes de respuesta (`maxJsonResponseBytes = 4 MiB`), límite de conteo de archivos, límite total de bytes (`maxTotalBytes`), timeout de request (10 s), timeout de ingestión (60 s);
- normalización/protección de path traversal, exclusión de symlinks y submódulos, redacción de secretos, errores saneados;
- sin clonación de repositorios, sin instalación de dependencias, sin ejecución de código externo;
- los tokens nunca se imprimen, persisten ni se escriben en artefactos o documentación.

No se aumentó ningún límite. `maxJsonResponseBytes` sigue siendo 4 MiB; `maxApiRequests` sigue siendo 125.

## 7. Mediciones reales (autenticado, rama `main`, commits recientes)

### Antes (baseline Phase 21.7, recorrido completo)

| Repo | maxFileCount | Estado | Tree requests | Requests | Resultado |
| --- | ---: | --- | ---: | ---: | --- |
| microsoft/TypeScript | 10 | fallido | 122 | 125 | `ingestion_limit_reached` |
| nodejs/node | 10 | fallido | 122 | 125 | `ingestion_limit_reached` |

Los primeros 10 candidatos aparecieron en el request 18 (TypeScript) y 16 (Node), pero el recorrido continuó hasta agotar el presupuesto de requests.

### Después (Phase 21.10, recorrido optimizado)

| Repo | maxFileCount | Estado | Categoría | Requests | Tree | Blob | Archivos | Bytes | Findings | Term. temp. | maxApiRequests | Latencia |
| --- | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| microsoft/TypeScript | 10 | ok | — | 30 | 17 | 10 | 10 | 355,514 | 6 | sí | no | 11.7 s |
| microsoft/TypeScript | 50 | ok | — | 78 | 25 | 50 | 50 | 1,573,999 | 6 | sí | no | 28.6 s |
| microsoft/TypeScript | 100 | fallido | `ingestion_limit_reached` | 125 | 25 | 97 | — | — | — | — | sí | 43.9 s |
| nodejs/node | 10 | ok | — | 27 | 14 | 10 | 10 | 75,699 | 3 | sí | no | 9.2 s |
| nodejs/node | 50 | ok | — | 71 | 18 | 50 | 50 | 123,015 | 3 | sí | no | 23.8 s |
| nodejs/node | 100 | ok | — | 125 | 22 | 100 | 100 | 215,480 | 3 | sí | no | 39.7 s |

`treeTruncated=true` en escenarios exitosos significa "snapshot intencionadamente parcial" (terminación temprana), no truncamiento de GitHub; las comprobaciones directas de la API confirmaron que no hubo respuestas truncadas durante estas ejecuciones.

## 8. Análisis del contrato y la limitación TypeScript/100

Contrato documentado (`docs/github-ingestion.md`, evaluaciones de las fases 13–16):

- `maxFileCount` ("Selected files", por defecto 50) es un **límite superior**: "devolver hasta N archivos dentro de los límites de recursos". El código lo aplica con `file_count_limit_reached`, y cada benchmark documenta `coverage: partial` cuando se activa.
- `maxApiRequests` ("API requests per client", por defecto 125) es un **techo duro**. El agotamiento eleva la categoría de error documentada `ingestion_limit_reached`. Tiene precedencia sobre `maxFileCount`.
- `maxTotalBytes` acota los bytes de contenido obtenidos durante la adquisición de blobs.
- Los snapshots parciales/incompletos deben exponerse explícitamente; el producto nunca implica cobertura completa sobre un snapshot acotado.

`maxFileCount=100` es por tanto un límite superior, no una garantía de exactamente 100 archivos. Para `microsoft/TypeScript` a 100, el presupuesto fijo necesita:

```text
3 requests de resolución + 25 requests de árbol + 100 requests de blob = 128 > maxApiRequests = 125
```

La ejecución termina explícitamente con `ingestion_limit_reached` (125 requests ejecutados, 97 blobs obtenidos, y entonces el guard de requests rechaza la siguiente solicitud). El resultado es determinista (recorrido ordenado por path sobre árboles de commit inmutables), acotado y expuesto como fallo con la categoría documentada — nunca reivindica cobertura de 100 archivos. `nodejs/node` completa el mismo escenario con exactamente 125 requests porque su recorrido solo necesita 22 requests de árbol.

**Decisión: el resultado TypeScript/100 es un resultado esperado de recursos acotados, no un defecto.** `maxApiRequests` no se aumentó porque el contrato de la fase prohíbe debilitar cualquier límite de seguridad/recursos, y el contrato documentado hace que `maxApiRequests` sea autoritativo sobre `maxFileCount`. No se hizo ningún cambio de código de producción para dejar el benchmark en verde.

## 9. Tests de regresión

Añadidos en `packages/github/src/github.test.ts` (suite del paquete: 25 tests, todos pasando):

- recorrido de árbol anidado usando el SHA de cada subtree y acumulación de paths;
- terminación temprana solo cuando los subtrees pendientes demostrablemente no pueden cambiar la ventana (con equivalencia de referencia de `selectEntries`);
- sin terminación mientras un subtree pendiente aún podría desplazar la ventana;
- sin parada ingenua en candidatos de `maxFileCount` cuando hay un subtree tier-2 `.github/workflows` pendiente;
- los datos truncados nunca permiten la terminación temprana; los subtrees excluidos nunca se recorren;
- ventana de un solo archivo (`maxFileCount=1`) se detiene antes de subtrees de tier inferior;
- los tests existentes de límite de requests, timeout, redirect, límite de bytes y seguridad no cambian y pasan.

## 10. Quality gates

Todos pasaron:

```text
pnpm install --frozen-lockfile
pnpm check:architecture
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test            (77 tests, 0 fallos)
pnpm build
pnpm audit --audit-level=high
git diff --check
```

Advertencia de entorno conocida: Node `25.3.0` está fuera del rango declarado (`>=24.15.0 <25`); no afectó a los resultados.

## 11. Limitaciones finales

- `microsoft/TypeScript` con `maxFileCount=100` no puede completarse bajo `maxApiRequests=125` porque se requieren 100 obtenciones de blob; esta es la precedencia documentada del presupuesto de requests sobre el cap de archivos.
- Los snapshots son intencionadamente parciales; `coverage` y las limitaciones lo comunican.
- El tier-3 (fuente) no tiene cap, por lo que la terminación temprana exacta solo es demostrable contra la ventana de obtención, no contra todo el repositorio.
- En un caso raro de omisión de obtención (archivo demasiado grande o binario), las entradas de fallback más allá de la ventana se toman del conjunto acumulado; las entradas de subtrees pendientes demostrablemente irrelevantes no se obtienen. Esto coincide con el contrato de snapshot acotado del producto y queda cubierto por las limitaciones.
- No se reivindica precision/recall ni ground truth humano.

## 12. Decisión final

```text
PHASE 21 = COMPLETED WITH DOCUMENTED LIMITATION
```

El recorrido segmentado acotado está validado: ambos repositorios grandes completan con `maxFileCount` 10 y 50, `nodejs/node` completa a 100, los requests bajaron de 125-con-fallo a 30/27/78/71 (y 125 para node/100), la selección es determinista y consistente en prefijo, todos los límites de seguridad/recursos están intactos, y el resultado TypeScript/100 cumple el contrato (precedencia de `maxApiRequests` sobre el límite superior de `maxFileCount`).

No se hizo ningún commit, tag ni push. Conventional Commit propuesto:

```text
feat: add semantics-preserving bounded tree traversal
```
