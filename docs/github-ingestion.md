# Ingestión GitHub REST

La Fase 3 implementa `@ai-developer-platform/github`, un adapter independiente del framework para snapshots acotados de repositorios públicos de GitHub.

## Entrada soportada

La entrada aceptada es una URL HTTPS pública canónica:

```text
https://github.com/{owner}/{repository}
https://github.com/{owner}/{repository}/tree/{ref}
```

También puede suministrarse una ref explícita a `parseRepositoryReference` o `ingestRepository`. Se rechazan URLs SSH, Git, HTTP, hosts arbitrarios, query strings, fragments, repositorios privados y GitHub Enterprise. Una barra final y un sufijo `.git` opcional se normalizan.

## Flujo

```text
URL de repositorio validada
        |
        v
metadatos del repositorio
        |
        v
ref solicitada -> commit SHA
        |
        v
tree del commit
        |
        v
selección acotada de archivos -> blobs acotados -> texto UTF-8
        |
        v
RepositorySnapshot + RepositoryFile[] + limitaciones
```

El snapshot se crea mediante la factory de dominio de la Fase 2. Su identidad se deriva del owner normalizado, el nombre del repositorio y el commit SHA completo resuelto. La rama/ref solicitada se conserva como contexto y nunca se usa como identidad inmutable.

## Transporte y seguridad

`GitHubRestClient` usa la API `fetch` de la plataforma y solo construye requests contra `https://api.github.com`. Envía el media type JSON de GitHub y la versión de la API, aplica límites de request y de tamaño de respuesta, acepta un token opcional sin registrarlo y clasifica los fallos sin exponer los cuerpos de las respuestas.

### Política de redirects

GitHub devuelve redirects canónicos (por ejemplo, `facebook/react` redirige a `/repositories/{id}` y se canonicaliza a `react/react`). El cliente sigue redirects **solo** cuando cada salto cumple todas las condiciones siguientes:

- el destino es `https:`;
- el host destino está en la allowlist explícita (`api.github.com` por defecto);
- el destino no tiene puerto;
- el número de redirects seguidos no supera `maxRedirects` (por defecto 3);
- el redirect lleva una cabecera `location` válida.

Los redirects a hosts externos, HTTP plano o puertos se rechazan con `security_rejected`. `fetch` se llama con `redirect: 'manual'` para que el cliente, y no el runtime, decida si un redirect es seguro. Cuando se sigue un redirect canónico, la identidad del repositorio devuelta por GitHub es autoritativa (así, los repositorios renombrados se analizan bajo su `owner/name` canónico); cuando no hubo redirect, la respuesta debe coincidir exactamente con la identidad solicitada.

El paquete no clona repositorios, no descarga archivos, no sigue symlinks, no obtiene submódulos, no ejecuta contenido del repositorio, no instala dependencias ni accede al filesystem local. Los paths del repositorio siguen siendo datos y se validan como paths relativos normalizados.

## Estrategia de selección de archivos

Las entradas seleccionadas se priorizan de forma determinista para que el presupuesto acotado de archivos se gaste primero en los archivos más informativos. Los límites nunca se eliminan; la estrategia solo decide qué archivos se obtienen dentro de ellos.

| Priority | Files |
| ---: | --- |
| 1 | Metadatos raíz del repositorio: `package.json`, lockfiles, `README*`, `tsconfig*`, `angular.json`, `vite.config.*`, `next.config.*` |
| 2 | Metadatos de CI/tooling: `.github/workflows/*`, config raíz de `eslint`/`prettier`/`vitest`/`jest`/`playwright`, `biome.json` |
| 3 | Archivos fuente (TypeScript/JavaScript) |
| 4 | Archivos de tests |
| 5 | Documentación, ejemplos, fixtures y otros archivos seleccionables |

Dentro de la misma prioridad, los archivos se ordenan por path, por lo que la selección es estable entre ejecuciones. Esto evita que directorios como `.github/`, `.devcontainer/` o `examples/` consuman el presupuesto de archivos antes de que se consideren `package.json`, `README`, `tsconfig.json` y los tests.

Los topes por tier evitan que un solo tier domine: se conservan como máximo 8 archivos de metadatos raíz, 2 de CI/tooling, 8 de tests y 2 de documentación/ejemplos; los archivos fuente (prioridad 3) son ilimitados. El tope global de `maxTreeEntries` sigue acotando la lista final de candidatos. Esto evita que los repositorios con mucho CI (por ejemplo, `angular/angular`, cuyo tree contiene decenas de `.github/workflows`) priven a los archivos fuente.

Los lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lock`) son metadatos raíz seleccionables para que `lockfile_present` refleje el repositorio y no la política de selección. El `bun.lockb` binario sigue excluido.

## Límites iniciales del MVP

| Limit | Valor inicial |
| --- | ---: |
| Archivos seleccionados | 50 |
| Tamaño de archivo | 256 KiB |
| Bytes totales de archivos | 2 MiB |
| Entradas de tree consideradas (tras prioridad + topes por tier) | 5.000 |
| Requests de API por cliente | 125 |
| Timeout de request | 10 segundos |
| Timeout de ingestión | 60 segundos |
| Tamaño de respuesta JSON | 4 MiB |

Los valores son límites iniciales conservadores, no calibración de producción. Los archivos fuente con extensiones TypeScript/JavaScript/JSON y los metadatos de proyecto seleccionados son elegibles. `node_modules`, `.git`, `dist`, `build`, `coverage`, `.cache`, `vendor`, source maps, archivos generados/minificados, nombres de archivo de credenciales comunes, extensiones comunes de claves privadas y extensiones binarias evidentes se excluyen.

Las respuestas de blobs deben ser base64, UTF-8 válido, coherentes en tamaño y libres de datos binarios evidentes. Los punteros de archivos Git LFS se reportan como no disponibles en lugar de resolverse.

## Resultados parciales y errores

Un tree truncado, un path inseguro excluido, un blob no disponible, un archivo sobredimensionado, un archivo binario, un límite de requests o un puntero Git LFS se representan en `IngestionResult.limitations`. El resultado no se convierte en un `AnalysisResult` y no se generan findings.

Los fallos de transporte y validación usan categorías de `GitHubIngestionError` como `invalid_repository`, `repository_not_found`, `invalid_ref`, `rate_limited`, `request_timeout`, `invalid_response`, `security_rejected` e `ingestion_limit_reached`.

## Reproducibilidad e integración diferida

El mismo repositorio normalizado y commit resuelto producen la misma identidad de snapshot. El orden de obtención de archivos, los contenidos seleccionados y las limitaciones están acotados por la respuesta del tree y la política; los timestamps operativos son metadatos, no identidad.

La Fase 3 deliberadamente no expone un endpoint HTTP. El cableado de la aplicación Fastify, la persistencia, los jobs de análisis, las reglas del analyzer, la generación de evidencia, la puntuación y la selección de contexto de AI pertenecen a fases posteriores. La caché también queda diferida; la identidad del snapshot anclada al commit es suficiente para una futura clave de caché.
