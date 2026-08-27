# ADR-015 — Ingestión GitHub REST y snapshot seguro

- **Estado:** Aceptado para la Fase 3; enmendado en la Fase 14
- **Fecha:** 2026-08-26

## Contexto

El producto necesita un snapshot de origen reproducible antes del análisis. El primer corte debe soportar repositorios públicos de GitHub sin clonar, sin extraer archivos, sin ejecutar el repositorio ni realizar descargas ilimitadas. Las URLs de repositorios y el contenido del repositorio son entrada no confiable, y el adapter no debe convertirse en un proxy genérico de requests server-side.

## Decisión

Implementar `@ai-developer-platform/github` como un adapter REST de GitHub independiente del framework y un servicio de ingestión acotado.

- Aceptar únicamente referencias de repositorio HTTPS públicas de `github.com`.
- Resolver la ref solicitada mediante la GitHub REST API y anclar el snapshot al commit SHA completo devuelto.
- Obtener metadatos, el tree recursivo y blobs seleccionados solo mediante endpoints conocidos de `api.github.com`.
- Aplicar límites de request/cuerpo/ingestión, clasificar rate limits y fallos, y evitar el logging del cuerpo de las respuestas.

## Enmienda de la Fase 14 (2026-08-27)

La validación con repositorios reales (Phase 13) mostró que deshabilitar los redirects por completo impedía analizar repositorios públicos válidos que GitHub sirve bajo URLs canónicas (`facebook/react` redirige a `/repositories/{id}` y se canonicaliza a `react/react`).

**Decisión:** seguir redirects solo cuando cada salto es HTTPS, el host destino está en una allowlist explícita (`api.github.com` por defecto), no tiene puerto, lleva una cabecera `location` válida y se mantiene dentro de `maxRedirects` (por defecto 3). `fetch` se ejecuta con `redirect: 'manual'` para que el cliente decida cada salto. Tras un redirect canónico seguro, la identidad del repositorio devuelta por GitHub es autoritativa y se usa para las requests posteriores; sin redirect, la respuesta debe coincidir exactamente con la identidad solicitada. Los redirects a hosts externos, HTTP o puertos se rechazan como `security_rejected`.

**Decisión:** la selección de archivos ahora está priorizada de forma determinista dentro de los mismos límites de ingestión — primero los metadatos raíz del repositorio (package.json, lockfiles, README, tsconfig, angular.json, config de vite/next), luego la config de CI/tooling, después los archivos fuente, luego los tests, y por último documentación/ejemplos/otros. Esto evita que `.github/`, `.devcontainer/` o `examples/` consuman el presupuesto de archivos antes de que se consideren `package.json`, `README` y los tests.

**Consecuencias:** los repositorios públicos renombrados son analizables bajo su identidad canónica; la superficie SSRF permanece sin cambios (allowlist de hosts, HTTPS, límite de saltos); los snapshots acotados son más informativos sin aumentar los límites.
- Seleccionar solo fuente TypeScript/JavaScript/JSON acotada y archivos de metadatos relevantes. Excluir rutas de dependencias, generadas, binarias y de credenciales.
- Validar los paths relativos al repositorio, rechazar symlinks y submódulos, decodificar solo blobs base64 UTF-8 válidos y acotados, y nunca ejecutar el contenido del repositorio.
- Devolver un `IngestionResult` en memoria; no exponer un endpoint HTTP ni añadir persistencia en esta fase.

La implementación usa `fetch` nativo con un transporte inyectable para tests deterministas. No se introduce ningún SDK de GitHub, librería de clonado, librería de archivos, cola, worker ni caché.

## Consecuencias

- La identidad del snapshot es reproducible para un owner, repositorio y commit SHA dados.
- El contenido grande, truncado, binario, no disponible o no soportado produce limitaciones explícitas en lugar de una falsa completitud.
- Fastify sigue siendo responsable de la composición HTTP futura, mientras que el dominio permanece ajeno a GitHub.
- Los límites iniciales son intencionadamente conservadores y requieren medición antes de una recalibración en producción.
- Un endpoint público futuro debe mapear el resultado de ingestión a un contrato de API explícito y aplicar límites de payload/rate en la frontera HTTP.

## Alternativas consideradas

- **GitHub GraphQL:** diferido porque las operaciones de la Fase 3 ya son expresables con un cliente REST pequeño.
- **`git clone`:** rechazado para el primer corte porque amplía los riesgos de filesystem, hooks, submódulos, LFS y volumen.
- **Archivos de GitHub:** rechazado porque la extracción añade complejidad de manejo de zip/archive bombs y paths.
- **Octokit u otro SDK:** rechazado porque `fetch` nativo es suficiente para la pequeña superficie de operaciones y mantiene el comportamiento del transporte explícito.
- **Endpoint Fastify en esta fase:** diferido porque el adapter y el comportamiento de seguridad pueden testearse sin definir prematuramente la semántica de la API de ingestión/jobs.
