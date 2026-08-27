# Phase 7 — Validación y endurecimiento del MVP

## Fecha de validación

2026-08-26. El runtime local era Node `v25.3.0`; el target del proyecto y CI siguen siendo Node 24. La ejecución en Node 25 emite los warnings esperados de engine y de `node:sqlite` experimental.

## Dataset controlado

Los fixtures del analyzer proporcionan casos deterministas para:

- TypeScript limpio con tests, README, lint, formato, TypeScript estricto, lockfile y CI;
- TypeScript deficiente con TODO/FIXME, `any`, `@ts-ignore`, tests/tooling ausentes y un import relativo sin resolver;
- JavaScript con detección superficial de React;
- TypeScript tipo Angular con detección superficial de Angular;
- señales de seguridad con un patrón tipo secreto y paths sensibles;
- entrada parcial/malformada con paths inválidos, IDs de snapshot incorrectos y limitaciones de tree explícitas.

El comportamiento esperado se verifica mediante tests del analyzer y del scoring. La evidencia sensible almacena un hash estable en lugar del contenido fuente. La entrada parcial produce limitaciones explícitas y no se convierte por sí misma en una afirmación negativa de calidad.

## Findings y revisión de falsos positivos

Los findings actuales son deliberadamente conservadores y respaldados por evidencia:

- ausencia de README, tests, test tooling o lint tooling;
- manifest sin un lockfile soportado;
- estricto de TypeScript no verificado o deshabilitado;
- archivo fuente sobredimensionado, marcadores TODO/FIXME excesivos o `@ts-ignore`;
- import relativo sin resolver estáticamente;
- path fuente inusualmente profundo;
- nombre de archivo potencialmente sensible o contenido tipo credencial.

Los fixtures cubren casos positivos y negativos de las reglas principales. La ausencia de tooling es de severidad baja; las señales de seguridad son de severidad alta solo cuando existe una señal concreta de path/contenido sensible. El analyzer no reivindica estado de vulnerabilidad, suficiencia de tests, conformidad de accesibilidad ni calidad del repositorio a partir de una sola heurística.

## Repositorios en vivo

Una ejecución local controlada de la API usó el adapter REST real de GitHub, sin clonar, instalar, ejecutar ni compilar el contenido del repositorio:

| Repository | Result | Duration | Findings | Limitations | Coverage |
| --- | --- | ---: | ---: | ---: | --- |
| `octocat/Hello-World` | completed_with_limitations | 2s | 3 | 1 | insufficient |
| `githubtraining/hellogitworld` | completed_with_limitations | 2s | 3 | 1 | insufficient |

Los reportes se obtuvieron mediante `GET /analyses/:id/report`. Estos repositorios pequeños demuestran que el pipeline maneja entrada pública real y comunica datos de análisis insuficientes en lugar de fabricar una puntuación. La disponibilidad externa implica que los repositorios en vivo no son dependencias de CI.

## Revisión de seguridad

- SSRF: el parseo de URLs de GitHub y la allowlist de hosts de la API siguen aplicándose; los redirects no se consideran confiables.
- Paths: traversal, paths absolutos, caracteres de control, symlinks y submódulos se rechazan o excluyen en la ingestión.
- Contenido del repositorio: no se invoca ningún package manager, shell, test, build, import ni ejecutable.
- Secretos: la ingestión excluye archivos sensibles comunes; la evidencia del analyzer es solo hash para contenido tipo credencial; el frontend usa interpolación de texto y no `innerHTML`.
- Agotamiento de recursos: los límites de tree, archivo, bytes, request, tamaño de archivo y timeout son explícitos; la concurrencia del runner es de uno por defecto.
- Dependencias: `pnpm audit --audit-level=high` no reporta vulnerabilidades conocidas.

## Fiabilidad y retención

Los tests automatizados cubren respuestas de GitHub 404/rate-limit/timeout/malformadas, reintentos acotados, fallos/timeouts de jobs, round-trip/reinicio/limpieza de SQLite, idempotencia y determinismo del analyzer. La limpieza SQLite actual es determinista e idempotente. Un reinicio del proceso deja un job `running` persistido como `running`; la recuperación/reenqueue queda diferida deliberadamente hasta que un worker o un scheduler durable estén justificados.

## Accesibilidad y frontend

El frontend tiene headings y labels semánticos, foco de teclado visible, mensajes de estado `aria-live`, errores de formulario asociados, layouts responsive, renderizado seguro de texto y estados de retry. Los tests de componentes cubren el envío válido/inválido, la navegación y los errores de creación. No hay ninguna suite de axe ni de E2E de navegador configurada, por lo que esto es una línea base de accesibilidad, no una certificación WCAG.

## Utilidad del producto y decisión de arquitectura

El reporte actual es útil para mostrar señales reproducibles y trazabilidad, pero los repositorios pequeños suelen tener cobertura insuficiente. Por ello, la UI expone limitaciones y puntuaciones nullable en lugar de presentar falsa precisión. La arquitectura existente (Angular + Fastify + aplicación modular + runner en proceso + GitHub REST + analyzer determinista + SQLite) sigue siendo apropiada para el MVP.

No extraer un worker, cola, PostgreSQL, caché ni capa de realtime sin evidencia medida, como crecimiento sostenido de la cola, degradación de timeout/tasa de finalización, contención de escritura concurrente o un requisito de despliegue con múltiples instancias de la API.
