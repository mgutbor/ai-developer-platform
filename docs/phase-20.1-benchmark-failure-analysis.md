# Phase 20.1 — Análisis de fallos del benchmark y corrección del runner

## 1. Resumen ejecutivo

La Phase 20.1 inspeccionó el diff exacto del runner de la Phase 20 y reprodujo de forma independiente las tres clases de fallo sin exponer credenciales. El cableado de autenticación es correcto: el runner resuelve `process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN` y pasa el resultado explícitamente a `new GitHubRestClient({ token })`.

Dos fallos fueron causados por una respuesta legítima de árbol grande de GitHub que interactúa con el límite de tamaño de respuesta existente configurado. `microsoft/TypeScript` y `nodejs/node` se resuelven correctamente y devuelven árboles JSON válidos, pero sus respuestas de árbol recursivo son de aproximadamente 18 MB y 17 MB, superando el límite `maxJsonResponseBytes` de 4 MB del cliente. El tercer fallo fue un identificador obsoleto del dataset: GitHub expone actualmente `nestjs/nest`, no `nestjs/nestjs`.

La corrección mínima se limitó a la entrada del dataset del benchmark, cambiando `nestjs/nestjs` por el canónico objetivo `nestjs/nest`. No se modificó ningún analyzer, scoring, cliente de ingestión, arquitectura ni comportamiento de AI.

```text
PHASE 20 = NOT COMPLETED
PHASE 20.1 = DIAGNOSIS COMPLETED
PRECISION = NOT VALIDATED
RECALL = NOT VALIDATED
```

## 2. Baseline de la Phase 20

- 15 repositorios intentados;
- 45 escenarios intentados;
- 36 completados;
- 9 fallidos;
- los fallos fueron `invalid_response` para `microsoft/TypeScript` y `nodejs/node`, y `repository_not_found` para `nestjs/nestjs`;
- el acceso autenticado a GitHub funcionó;
- ningún valor de token fue registrado, persistido ni escrito en artefactos.

## 3. Análisis exacto del diff

El diff de la Phase 20 hizo estos cambios relevantes en `apps/api/src/validate-real-repos.ts`:

- sustituyó el dataset histórico de cinco entradas por un dataset de 15 entradas;
- añadió `const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;`;
- se detuvo con `BENCHMARK BLOCKED — GITHUB_TOKEN/GH_TOKEN required` cuando ninguna variable está presente;
- pasó el token explícitamente a `new GitHubRestClient({ token })`;
- añadió los escenarios `maxFileCount` 10, 50 y 100;
- registró estado saneado, categoría de error, SHA del commit, resúmenes de findings, scores, conteos, bytes, requests y tiempos;
- escribió solo un artefacto JSON temporal bajo `/tmp`.

Las expresiones de autenticación exactas están presentes en el runner:

```ts
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const client = new GitHubRestClient({ token });
```

No hay logging del header Authorization. El artefacto no contiene ningún campo de token y solo información saneada de findings/errores. El invariante de manejo del token, por tanto, superó la inspección.

Se encontró un detalle de implementación no relacionado: `resolvedClient` se instanció pero no se usó. No afecta a la autenticación ni a los resultados, y no se cambió durante este diagnóstico para evitar limpieza no relacionada.

## 4. Matriz de fallos

| Repositorio | Escenario | Etapa con fallo | Estado HTTP | Endpoint | Causa raíz | ¿Defecto de producto? |
|---|---:|---|---:|---|---|---|
| `microsoft/TypeScript` | 10 | validación de respuesta/ingestion | 200 | árbol Git recursivo | respuesta válida supera el límite JSON configurado de 4 MiB | No se demostró defecto de producto; limitación legítima de árbol grande |
| `microsoft/TypeScript` | 50 | validación de respuesta/ingestion | 200 | árbol Git recursivo | igual | No |
| `microsoft/TypeScript` | 100 | validación de respuesta/ingestion | 200 | árbol Git recursivo | igual | No |
| `nodejs/node` | 10 | validación de respuesta/ingestion | 200 | árbol Git recursivo | respuesta válida supera el límite JSON configurado de 4 MiB | No se demostró defecto de producto; limitación legítima de árbol grande |
| `nodejs/node` | 50 | validación de respuesta/ingestion | 200 | árbol Git recursivo | igual | No |
| `nodejs/node` | 100 | validación de respuesta/ingestion | 200 | árbol Git recursivo | igual | No |
| `nestjs/nestjs` | 10 | resolución de repositorio | 404 | `/repos/nestjs/nestjs` | identificador de repositorio obsoleto/no canónico | Defecto del dataset, no de la aplicación |
| `nestjs/nestjs` | 50 | resolución de repositorio | 404 | `/repos/nestjs/nestjs` | igual | Defecto del dataset, no de la aplicación |
| `nestjs/nestjs` | 100 | resolución de repositorio | 404 | `/repos/nestjs/nestjs` | igual | Defecto del dataset, no de la aplicación |

Todos los estados, tipos de contenido y errores se inspeccionaron en forma saneada. No se imprimieron headers Authorization ni valores de credenciales.

## 5. Diagnóstico por repositorio

### `microsoft/TypeScript`

Las comprobaciones autenticadas devolvieron:

- endpoint de repositorio: HTTP 200;
- tipo de contenido: `application/json; charset=utf-8`;
- owner: `microsoft`;
- name: `TypeScript`;
- rama por defecto: `main`;
- HEAD actual: `e95d8e57a89f4c174604d76e683d1f14d148373d`;
- endpoint de árbol recursivo: HTTP 200;
- tamaño de respuesta observado: aproximadamente 18,010,247 bytes;
- entradas del árbol: 51,434;
- GitHub marcó el árbol como `truncated: true`;
- una solicitud directa de blob para una entrada válida del árbol devolvió HTTP 200, JSON, codificación base64 y metadatos válidos.

La aplicación rechaza el árbol antes de la selección de archivos porque su `maxJsonResponseBytes` configurado por defecto es 4 MiB. Esto es determinista en 10/50/100 porque la recuperación del árbol precede al escenario de conteo de archivos.

### `nodejs/node`

Las comprobaciones autenticadas devolvieron:

- endpoint de repositorio: HTTP 200;
- tipo de contenido: `application/json; charset=utf-8`;
- owner: `nodejs`;
- name: `node`;
- rama por defecto: `main`;
- HEAD actual: `29c517f5d44a7f6497f8908a1897a165cab0d9c7`;
- endpoint de árbol recursivo: HTTP 200;
- tamaño de respuesta observado: aproximadamente 17,399,260 bytes;
- entradas del árbol: 56,033;
- GitHub marcó el árbol como `truncated: false`;
- una solicitud directa de blob para una entrada válida del árbol devolvió HTTP 200, JSON, codificación base64 y metadatos válidos.

Como con TypeScript, la protección existente de tamaño de respuesta de 4 MiB rechaza el árbol antes de la selección. La respuesta no está malformada y el fallo es determinista.

### `nestjs/nestjs`

Las comprobaciones autenticadas devolvieron:

- `/repos/nestjs/nestjs`: HTTP 404, JSON, mensaje saneado `Not Found`;
- `/repos/nestjs/nest`: HTTP 200, JSON;
- owner/name canónico: `nestjs/nest`;
- rama por defecto: `master`;
- URL canónica: `https://github.com/nestjs/nest`.

La referencia del dataset estaba objetivamente obsoleta. Se corrigió de `nestjs/nestjs` a `nestjs/nest`; esto es una corrección del dataset, no una corrección de la aplicación de producción.

## 6. Causas raíz

1. **Árboles recursivos grandes:** el cliente existente limita intencionadamente el tamaño de la respuesta JSON a 4 MiB. GitHub devuelve JSON de árbol recursivo válido mayor que eso para repositorios muy grandes. Esta es una limitación legítima de ingestion acotada y no un fallo del analyzer/scoring.
2. **Identificador de repositorio obsoleto:** `nestjs/nestjs` no es actualmente un endpoint de repositorio. `nestjs/nest` es el repositorio público canónico devuelto por GitHub.
3. **Sin defecto de autenticación:** los requests autenticados, la resolución del repositorio, la resolución del HEAD actual y la recuperación de blobs funcionan sin exponer el token.

## 7. Determinación de defecto de producto

No se demostró ningún defecto reproducible de analyzer, scoring, arquitectura, seguridad ni cliente del benchmark. El comportamiento de árbol grande podría motivar un cambio futuro de diseño de ingestión, pero cambiar los límites de respuesta o añadir paginación alteraría el comportamiento de producción sin un requisito de la Phase 20 que lo exija y sin un contrato de regresión enfocado.

La corrección del dataset fue segura y verificada objetivamente, por lo que se aplicó solo al runner del benchmark.

## 8. Correcciones aplicadas

Se cambió una tupla del dataset en `apps/api/src/validate-real-repos.ts`:

```text
nestjs/nestjs → nestjs/nest
```

No se cambió ningún otro comportamiento de producción. No se añadió infraestructura.

## 9. Tests de regresión

No se añadió ningún test de regresión de producción porque no se estableció ningún defecto de producción. La corrección del repositorio canónico se validó mediante comprobaciones autenticadas directas de la API y re-ejecutando los tres escenarios afectados.

## 10. Resultados de la re-ejecución

El dataset corregido se re-ejecutó solo para las entradas afectadas:

| Repositorio | 10 | 50 | 100 | Resultado |
|---|---|---|---|---|
| `microsoft/TypeScript` | `invalid_response` | `invalid_response` | `invalid_response` | la limitación externa/configurada de árbol grande permanece |
| `nodejs/node` | `invalid_response` | `invalid_response` | `invalid_response` | la limitación externa/configurada de árbol grande permanece |
| `nestjs/nest` | completado | completado | completado | 10 archivos/3 findings; 50 archivos/3 findings; 100 archivos/4 findings |

Los SHAs de `nestjs/nest` de la re-ejecución no se copiaron en este informe porque el objetivo de esta fase era el diagnóstico de fallos y el artefacto legible por máquina de la re-ejecución sigue siendo temporal; la salida del runner y `/tmp/phase20-benchmark.json` contienen los valores observados para esta ejecución.

## 11. Limitaciones restantes

- `microsoft/TypeScript` y `nodejs/node` siguen sin poder analizarse con la política actual acotada de respuesta de árbol recursivo de 4 MiB;
- los árboles recursivos de GitHub pueden estar truncados o ser muy grandes;
- la finalización 15 × 3 de la Phase 20 aún no se ha logrado después de la corrección;
- la revisión ground-truth sigue sin estar disponible;
- la precision, el recall y la tasa de falsos negativos siguen en `NOT VALIDATED`;
- no se intentó ninguna evaluación humana ni evaluación de AI en vivo;
- el benchmark sigue dependiendo de la red;
- el cliente actual no dispone de contabilidad de bytes de cable request/response;
- `~/.knowledge.md` era accesible para comprobar su existencia, pero no se envió ninguna notificación ntfy porque esta fase prohibía explícitamente enviarla y sus instrucciones exactas de notificación no eran necesarias para el diagnóstico.

## 12. Recomendación para la finalización de la Phase 20

No vuelvas a ampliar el benchmark hasta que los casos restantes de árbol grande reciban una decisión explícita. Elige una vía basada en evidencia:

- mantener los fallos como limitaciones externas/configuradas documentadas y completar la Phase 20 con todos los estados clasificados; o
- diseñar un cambio separado de ingestión de árbol grande revisado en seguridad, con tests enfocados de paginación/manejo de respuesta acotados, antes de tocar los límites de producción.

La siguiente acción exacta es decidir si el límite existente de 4 MiB es una limitación aceptada del benchmark. Si se acepta, re-ejecuta el benchmark completo corregido de 15 × 3 una vez y actualiza el informe de la Phase 20 con los estados finales. Si no, crea una issue separada de ingestión con alcance estrecho; no aumentes el límite de respuesta de forma oportunista.

## Estado final

- Archivos modificados: `apps/api/src/validate-real-repos.ts`.
- Archivos creados: `docs/phase-20.1-benchmark-failure-analysis.md`.
- Tests: los tests existentes no se re-ejecutaron en esta fase en el momento de creación del documento; no se añadió ningún test de regresión.
- Quality gates: pendientes de ejecución final.
- Estado Git: los cambios permanecen sin commitear; sin tag ni push.
- La Phase 20 puede continuar: solo después de la decisión sobre la limitación de árbol grande.
- La Phase 20 sigue bloqueada: sí, hasta que los 45 escenarios estén clasificados explícitamente y el dataset corregido se re-ejecute como se requiere.
- Siguiente acción exacta: decidir y documentar la aceptación frente a la remediación con alcance estrecho de la limitación de respuesta de árbol recursivo de 4 MiB.
