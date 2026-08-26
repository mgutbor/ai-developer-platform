# Arquitectura

## Estado de la propuesta

Esta es la arquitectura refinada tras la revisión de Fase 0.1. El repositorio todavía no contiene código ni configuración de runtime.

## Recomendación general

Empezar con un monorepo TypeScript y un **monolito modular** con dos aplicaciones runtime:

```text
apps/
  web/          # Angular; experiencia de usuario y consumo de API
  api/          # HTTP, casos de uso, job runner inicial y persistencia
packages/
  contracts/    # contratos externos versionados
  domain/       # entidades e invariantes
  github/       # adapter REST y políticas de snapshot
  ingestion/    # selección, redacción y límites de archivos
  analyzer/     # reglas TypeScript/JavaScript
  report/       # findings, recommendations y score determinista
```

No se crea `apps/worker` en el MVP. El concepto de job se conserva como contrato y el runner vive inicialmente dentro de la API. Se extraerá solo si aparecen señales reales de duración, concurrencia o disponibilidad.

No se crean packages `ai`, `config` u `observability` como contenedores vacíos. Sus responsabilidades se incorporarán en el módulo que las necesite y se extraerán cuando exista una frontera real.

## Dependencias permitidas

```text
contracts ← domain ← ingestion ← analyzer
                         ↘ github
report ← domain + analyzer
api ← contracts + domain + github + ingestion + analyzer + report
web ← contracts
```

- `domain` no conoce HTTP, GitHub, SQLite, Angular ni un proveedor de IA.
- `contracts` define la forma de comunicación externa, no reglas de negocio.
- `github` solo resuelve snapshots públicos mediante REST y no construye findings.
- `ingestion` aplica allowlists, límites y redacción sobre un snapshot abstracto.
- `analyzer` produce facts, metrics y findings deterministas; no llama a HTTP.
- `report` agrega resultados, genera recommendations deterministas y calcula scores.
- `api` compone adapters y casos de uso, pero sus handlers no contienen reglas de análisis.
- `web` solo consume la API y no conoce la implementación del analyzer.

Las dependencias deben apuntar hacia abstracciones y no formar ciclos.

## Vertical slice del MVP

```text
User enters GitHub URL
        ↓
API validates input
        ↓
GitHub REST resolves repository + commit SHA
        ↓
Ingestion selects bounded text files
        ↓
Deterministic TypeScript/JavaScript analysis
        ↓
Facts + metrics + evidence-backed findings
        ↓
Deterministic score and recommendations
        ↓
SQLite stores job and report metadata
        ↓
Angular renders report
```

## Analysis flow

1. La API valida URL, branch/revision y límites.
2. El adapter de GitHub resuelve el repository y fija un commit SHA.
3. Ingestion obtiene el tree y selecciona archivos textuales permitidos.
4. Se excluyen binarios, generated files, `node_modules`, lockfiles del contexto profundo y archivos sensibles; los manifests y lockfiles pueden conservarse como metadata/dependency evidence.
5. El analyzer procesa TypeScript/JavaScript y detecta Angular, React y Node.js como contexto.
6. El report reconcilia facts, metrics, findings y evidence, deduplica y calcula score determinista.
7. El resultado se persiste en SQLite.
8. La API expone el job y el report a Angular.

## Job model

Se conserva `AnalysisJob` con estados:

```text
queued → running → completed
                 ↘ completed_with_limitations
                 ↘ failed
```

El runner inicial puede ejecutarse en el mismo proceso y respetar una concurrencia máxima configurable. La operación debe ser idempotente por repository, commit SHA y configuración del analyzer. El frontend puede usar polling simple si la ejecución supera la request inicial.

La interfaz del runner debe permitir una futura implementación externa sin que el dominio conozca procesos, colas o transporte.

## Persistence

SQLite es la persistencia del MVP. Se guardan únicamente:

- request normalizada;
- repository y commit SHA;
- estado y timestamps del job;
- versión del analyzer y reglas;
- facts y metrics;
- findings y evidence references;
- recommendations;
- score determinista, confidence y limitaciones.

No se almacenan blobs completos del repository ni contenido de archivos salvo un extracto redactado estrictamente necesario para presentar evidence. La retención inicial es corta y debe tener limpieza explícita.

## Frontend architecture

Se utilizará Angular + TypeScript, organizado por features y con componentes standalone:

```text
features/
  analyses/
    pages/
    data-access/
    models/
  reports/
    pages/
    data-access/
    components/
shared/
  ui/
  layout/
  api-client/
```

- Routing por flujo: repository input, progress y report.
- Services de data access para API; no acceso directo desde componentes a infraestructura.
- Estado remoto local a cada feature; no introducir un store global hasta demostrar la necesidad.
- Design system pequeño para forms, tables, status, tabs, disclosure y feedback.
- Loading, empty, partial, error y retry states explícitos.
- Keyboard navigation, focus visible, landmarks, headings, labels, `aria-live` y contraste adecuado.
- El reporte debe priorizar findings y evidence sobre visualizaciones decorativas.
- No se construye un dashboard complejo ni realtime en el MVP.

La comparación React/Angular y la decisión final están documentadas en ADR-008.

## Backend/API architecture

Los handlers validan contratos, llaman casos de uso y traducen errores. No contienen scoring ni llamadas directas a APIs externas.

Endpoints conceptuales:

```text
POST /analyses
GET  /analyses/:id
GET  /analyses/:id/findings
GET  /analyses/:id/recommendations
GET  /analyses/:id/facts
GET  /health
```

`POST /analyses` puede devolver `202 Accepted` si el runner continúa en segundo plano. Los endpoints de consulta son paginados y exponen revision, limitaciones y estado. No existe ningún endpoint funcional en esta fase.

## Evolución

Extraer worker, PostgreSQL o infraestructura distribuida solo si se observan colas, jobs largos, concurrencia o despliegues multiinstancia que lo justifiquen. La arquitectura inicial conserva puertos suficientes para esa evolución sin pagarla por adelantado.
