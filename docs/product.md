# Definición del producto

## Problem statement

Los equipos reciben repositories que funcionan, pero carecen de una evaluación técnica consistente y trazable. Las revisiones manuales son costosas, dependen de la experiencia de quien las realiza y suelen mezclar hechos observables con opiniones. Las herramientas aisladas detectan aspectos concretos, pero no los reúnen en una explicación priorizada que conecte problema, evidencia, impacto y acción.

AI Developer Platform convierte un repository de GitHub en un Developer Health Report técnico y explorable. El valor del producto está en correlacionar facts y métricas deterministas con razonamiento semántico de IA, sin presentar una inferencia como un hecho.

## Target users

- Frontend developers que necesitan una revisión rápida de estructura, calidad, accesibilidad y testing.
- Software engineers que mantienen repositories desconocidos o heredados.
- Tech leads que quieren priorizar deuda técnica con evidencia.
- Architects que necesitan una primera lectura comparable de varios repositories.
- Engineering teams que quieren un artefacto repetible para revisiones internas.

El usuario primario del MVP es un developer o tech lead que analiza un repository público y puede interpretar sus limitaciones técnicas. No es una herramienta de compliance ni sustituye una revisión humana de seguridad.

## Core use case

El usuario introduce la URL de un repository público de GitHub y solicita un análisis. El sistema valida la entrada, fija una revision, ingiere metadata y archivos textuales, ejecuta análisis determinista y muestra un reporte con score determinista, confidence, evidencias, findings y recomendaciones. La IA será una fase posterior y no es necesaria para demostrar el primer valor del producto.

## User journey

```text
Enter GitHub repository
        ↓
Validate repository and revision
        ↓
Create analysis job
        ↓
Show queued / running progress
        ↓
Ingest metadata and permitted files
        ↓
Run deterministic analysis
        ↓
Validate and reconcile results
        ↓
Show Developer Health Report
        ↓
Explore findings and evidence
        ↓
Explore prioritized recommendations
```

El flujo debe comunicar estados parciales, errores recuperables, datos insuficientes y el alcance exacto de la revision analizada.

## Product output

El reporte contiene:

- resumen de la revision, fecha y alcance del análisis;
- dimensiones con score, confidence y evidencia disponible;
- facts y métricas deterministas separados de las interpretaciones;
- findings navegables con ubicación y contexto limitado;
- recomendaciones independientes, priorizadas y vinculadas a findings;
- limitaciones, archivos excluidos y dimensiones sin datos suficientes.

## MVP

1. Análisis de repositories públicos de GitHub sin autenticación de usuario.
2. Entrada por URL y selección controlada de branch o revision por defecto.
3. Snapshot inmutable identificado por commit SHA antes de analizar.
4. Ingesta de metadata, file tree y archivos textuales dentro de límites explícitos mediante GitHub REST.
5. Análisis profundo de TypeScript/JavaScript y detección superficial de Angular, React y Node.js.
6. Facts, métricas, findings y recomendaciones deterministas sobre Architecture, Testing, Documentation, Dependencies y Code Quality.
7. Ejecución mediante `AnalysisJob`, inicialmente con runner dentro del proceso de API y estados `queued`, `running`, `completed`, `completed_with_limitations` y `failed`.
8. Score determinista por dimensión, confidence separada e `insufficient_data` cuando corresponda.
9. Visualización Angular responsive, accesible y consumidora de API.
10. Persistencia mínima en SQLite, sin almacenar el contenido completo del repository, y retención corta según la política de privacidad.

## Criterios de éxito del MVP

- Un usuario puede obtener un reporte reproducible para el mismo commit.
- Cada finding publicado enlaza a evidencia concreta.
- El sistema no ejecuta código del repository analizado.
- El usuario distingue score determinista de confidence y conoce qué no pudo analizarse.
- Los límites de tamaño, tiempo y rate limit se respetan de forma visible.
- El producto sigue siendo útil sin configurar un proveedor de IA.

## Out of scope

- Repositories privados y acceso mediante OAuth en la primera versión.
- Clonar o ejecutar el proyecto analizado, sus scripts, tests, builds o package managers.
- Remediación automática, creación de branches, pull requests o commits.
- Comentarios automáticos en GitHub.
- Análisis continuo por webhooks y comparación histórica avanzada.
- SAST/DAST completo, penetration testing, garantía de ausencia de vulnerabilidades o certificación de compliance.
- Soporte inicial para proveedores de Git distintos de GitHub.
- IA en el primer vertical slice, providers reales, agents, embeddings, vector database o RAG.
- Worker independiente, cola distribuida y PostgreSQL en la primera versión.
- Dashboard complejo, realtime, multi-tenant enterprise, SSO, billing y administración avanzada de equipos.

## Principios de producto

- **Evidence over opinion:** todo juicio debe mostrar soporte y limitaciones.
- **Deterministic first:** los hechos no dependen de un LLM.
- **AI as an analysis layer:** la IA aporta interpretación donde exista valor semántico.
- **Provider agnostic:** ningún proveedor forma parte del dominio.
- **Actionable over exhaustive:** se prioriza lo que ayuda a decidir qué mejorar primero.
