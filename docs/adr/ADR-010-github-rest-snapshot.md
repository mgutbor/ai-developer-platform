# ADR-010 — GitHub REST para snapshots del MVP

- **Status:** Accepted for MVP
- **Date:** 2026-08-26

## Contexto

El MVP necesita metadata, branch/commit, file tree y contenido textual limitado de repositories públicos. GitHub ofrece varias rutas: REST, GraphQL, `git clone` y archives. La seguridad requiere límites explícitos y la reproducibilidad requiere fijar una revision.

## Decisión

Usar la GitHub REST API para resolver repository, branch y commit, obtener metadata y tree, y recuperar únicamente los blobs textuales seleccionados dentro de límites. El pipeline guardará el commit SHA y no analizará una branch mutable sin fijarla previamente.

No se usará `git clone` porque introduce filesystem, hooks, submodules, LFS y control de volumen innecesarios para el primer slice. No se usará un archive como transporte principal porque obliga a gestionar descarga, descompresión y riesgos de archive bombs. GraphQL queda pospuesto porque no es necesario para las consultas iniciales.

## Consecuencias

- Integración basada en un protocolo conocido y operaciones acotables.
- Hay que controlar rate limits y el número de requests de blobs.
- El adapter debe truncar o excluir archivos grandes y respetar el límite de tree.
- Un repository que exceda límites recibe un report limitado, no una descarga ilimitada.
- Una futura estrategia de archive o clone requerirá una revisión de threat model.

## Alternativas consideradas

- **GitHub GraphQL:** potencialmente eficiente para consultas agregadas, pero añade complejidad y no es necesario aún.
- **`git clone`:** ofrece un snapshot completo, pero aumenta superficie de ataque y dificulta imponer límites antes de descargar.
- **GitHub archive:** reduce requests, pero añade descompresión y riesgos de zip/archive bombs.
