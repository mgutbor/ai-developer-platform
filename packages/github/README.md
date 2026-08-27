# Paquete de ingestión de GitHub

`@ai-developer-platform/github` proporciona acceso acotado y seguro a la GitHub REST API para snapshots de repositorios públicos.

El paquete contiene:

- validación canónica de URL/ref de repositorios públicos de GitHub;
- un port inyectable `GitHubClient`;
- un adapter REST nativo basado en `fetch`;
- ingestión acotada de tree/blob;
- políticas seguras de decodificación de paths y texto;
- errores de ingestión clasificados.

Depende únicamente del paquete de dominio de la Fase 2. No contiene reglas del analyzer, findings, scoring, SQLite, handlers de Fastify, código Angular, integración con AI, ejecución del repositorio, clonado, extracción de archivos ni acceso al sistema de archivos local.

Ver [`docs/github-ingestion.md`](../../docs/github-ingestion.md) para los límites y la política de seguridad.
