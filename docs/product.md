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

## Evidencia de producto — prueba E2E anónima (MVP v1.0.0)

> Esta sección es **evidencia de producto**, no una feature ni una fase nueva. Documenta una prueba real ejecutada contra la release **v1.0.0** publicada, con el producto sin modificar.

### Prueba ejecutada

- **Repositorio:** https://github.com/octocat/Hello-World
- **Fecha:** 27 de agosto de 2026 (post-release v1.0.0)
- **Credenciales:** ninguna — la prueba se ejecutó **sin `GITHUB_TOKEN` ni `GH_TOKEN`**, forzando acceso anónimo a la GitHub API.
- **Flujo completo validado (funcionó de principio a fin):**

  ```text
  URL → AnalysisJob → GitHub anonymous API → ingestion → analyzer → scoring → persistence → report
  ```

- **Duración:** el análisis se completó en **~3 segundos** (sin rate limit, cuota anónima disponible).

### Resultado real del análisis

- Commit analizado: `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` (el mismo SHA congelado del dataset de Phase 22.1).
- **Coverage:** `insufficient` · **Confidence:** `low`
- Snapshot: **1 archivo ingerido de ~4** existentes en el repositorio (limitación de ingestion acotada).
- **3 findings** (todos absence-based):
  - `AN-TEST-001` · medium · *Test files were not detected*
  - `AN-TEST-002` · low · *Test tooling was not detected*
  - `AN-TOOL-001` · low · *Lint configuration was not detected*
- **3 recommendations** trazadas a sus findings.
- **Dimension scores** (sin global score — decisión explícita del MVP):

  | Dimensión | Score | Confianza | Cobertura |
  |---|---|---|---|
  | architecture | 10 | high | partial |
  | maintainability | 10 | high | partial |
  | testing | 8.5 | high | partial |
  | documentation | 10 | high | partial |
  | dependencies | null | low | insufficient |
  | code_quality | 9.5 | high | partial |

### Interpretación correcta de los findings absence-based

Los findings absence-based (p. ej. "no se detectaron tests") se generan sobre el **snapshot acotado** disponible y **NO son evidencia exhaustiva** de que una característica no exista en el repositorio. En esta prueba solo se ingirió 1 de ~4 archivos, por lo que la ausencia detectada debe interpretarse a la luz de la cobertura (`insufficient`, confidence `low`) y nunca como una afirmación definitiva sobre el repositorio completo.

### Limitación de la GitHub anonymous API

- GitHub limita el acceso anónimo a **~60 requests/hour por IP**.
- Si la cuota de la IP está agotada, el producto responde de forma **controlada y honesta**:
  - el job pasa a `failed` con `errorCode: GITHUB_RATE_LIMITED`;
  - el estado queda persistido en SQLite;
  - no hay bloqueos, stack traces ni fugas de credenciales;
  - el report no está disponible (`RESULT_NOT_AVAILABLE`) hasta que el análisis pueda completarse.
- Un desarrollador con una IP con cuota disponible puede analizar repositorios públicos **sin token**; esta limitación es de GitHub, no un defecto del producto.

### Respuesta a la pregunta de producto

**Sí, con matices.** Un desarrollador puede tomar una URL pública de GitHub, introducirla en ai-developer-platform y obtener un informe útil en segundos **cuando el análisis cabe dentro de la cuota anónima disponible**. El producto comunica honestamente la cobertura del snapshot y las limitaciones del análisis, y trata el acceso anónimo agotado como un estado controlado y comprensible.

> **Matiz de cuota (validado experimentalmente):** con `maxFileCount=50`, la ingestión de un repositorio pequeño-medio como `sindresorhus/type-fest` necesitó más de las 60 requests/hora de la cuota anónima y terminó en `GITHUB_RATE_LIMITED` sin reporte. El modo sin token es fiable para repositorios diminutos/pequeños (p. ej. `Hello-World`: 5 requests; `camelcase`: 13 requests). Para repositorios que requieren más requests, la cuota anónima de GitHub es una **limitación operativa** y el modo autenticado con `GITHUB_TOKEN` (server-side, ~5.000 requests/hora) permite completar la ingestión.

> Para la evidencia consolidada del experimento anónimo (incluida la deduplicación de SQLite observada en el entorno de prueba), ver **`docs/anonymous-github-validation.md`**.
