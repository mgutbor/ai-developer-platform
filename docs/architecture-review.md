# Fase 0.1 — Architecture Review y refinamiento del MVP

## Resumen ejecutivo

La Fase 0 definió principios sólidos de trazabilidad, seguridad y separación entre análisis determinista e IA. Sin embargo, adelantó demasiados límites operativos para un producto aún no validado: tres aplicaciones runtime, worker separado, persistencia abstracta, scoring híbrido desde el inicio y ocho dimensiones completas.

La recomendación de esta revisión es reducir el primer producto a un vertical slice determinista y explicable:

```text
Angular web
    ↓ HTTP API
API modular
    ↓ in-process job runner
GitHub REST ingestion
    ↓
TypeScript / JavaScript deterministic analyzer
    ↓
findings + evidence + deterministic score
    ↓
SQLite result store
    ↓
report
```

La IA queda fuera del primer vertical slice. Se conserva un puerto pequeño para introducirla después, pero no se implementan providers, prompts ni orchestration en el MVP inicial.

## Scorecard de arquitectura

La valoración corresponde a la arquitectura de la Fase 0 antes de esta revisión.

| Dimensión | Score | Evaluación |
| --- | ---: | --- |
| Product clarity | 7/10 | Problema y principios claros, pero el MVP mezclaba validación de valor con capacidades futuras. |
| Architectural simplicity | 5/10 | Monorepo, tres apps, worker, persistencia y pipeline AI eran demasiado para el primer slice. |
| Maintainability | 7/10 | Buenos límites conceptuales, con riesgo de demasiados packages vacíos y abstracciones prematuras. |
| Testability | 7/10 | La estrategia era completa, pero parte del coste pertenecía a fases posteriores. |
| Security | 8/10 | El tratamiento de repositories no confiables y la prohibición de ejecución eran decisiones fuertes. |
| Scalability | 6/10 | La evolución estaba prevista, pero se diseñó infraestructura antes de medir carga. |
| Developer Experience | 6/10 | La intención era buena, aunque la base propuesta tenía demasiadas decisiones pendientes simultáneas. |
| AI architecture | 7/10 | Provider abstraction y structured output eran correctos, pero no necesarios para validar el primer valor. |
| Frontend architecture | 6/10 | La propuesta React era genérica y no estaba suficientemente justificada frente a Angular. |
| Operational complexity | 4/10 | Worker, base de datos, IA, rate limits y observabilidad completa elevaban el coste inicial. |
| Portfolio value | 8/10 | El problema es demostrativo, siempre que el proyecto muestre criterio y no acumulación de tecnología. |

## Qué se mantiene

- Evidence over opinion.
- Deterministic first.
- No ejecutar código de repositories analizados.
- Snapshot fijado a commit SHA.
- Separación entre fact, metric, finding y recommendation.
- Provider abstraction pequeña para una fase posterior.
- Structured output y validación si se incorpora IA.
- Monorepo como opción de organización, con menos packages iniciales.
- Seguridad, límites y accesibilidad como requisitos del producto.

## Qué cambia

- React se sustituye por Angular.
- El worker independiente se pospone.
- SQLite sustituye a la decisión abierta de persistencia del MVP.
- La IA no participa en el primer vertical slice.
- El score inicial es determinista; una futura AI assessment se mostrará separada.
- Se empieza con un único analyzer profundo para TypeScript/JavaScript.
- Se reducen las dimensiones operativas iniciales a las que tienen evidencia fiable sin ejecutar el repository.
- Dashboard, polling sofisticado, realtime y operaciones distribuidas se posponen.

## Hallazgos críticos

### Importante — El MVP intentaba validar demasiadas hipótesis a la vez

**Problem:** GitHub, ingesta segura, analyzer multi-dimensión, jobs, persistencia, scoring, IA y frontend aparecían como requisitos simultáneos.

**Why:** Si el primer resultado es incorrecto o difícil de interpretar, no sabremos si falla el producto, el analyzer, la IA o la experiencia de usuario.

**Recommendation:** validar primero un reporte determinista para TypeScript/JavaScript con evidence navegable.

**Trade-off:** se renuncia temporalmente a la diferenciación de IA, pero se obtiene feedback sobre el valor principal y una base auditable.

### Importante — El worker separado era una decisión operativa prematura

**Problem:** API y worker requerían despliegue, lifecycle, coordinación y observabilidad separados antes de conocer duración o volumen.

**Recommendation:** mantener `AnalysisJob` como contrato, pero ejecutar inicialmente el runner dentro del proceso de API. Extraerlo cuando existan señales medibles.

### Importante — El score híbrido podía aparentar precisión

**Problem:** `70% deterministic + 30% AI` fijaba una fórmula sin datos de calibración y mezclaba señales de naturaleza distinta.

**Recommendation:** score determinista explicable en el MVP; futura `AI assessment` separada, con confidence y sin modificar automáticamente el score base.

### Mejora — Ocho dimensiones no tienen la misma observabilidad

**Problem:** Accessibility, Security y Maintainability pueden producir señales limitadas sin ejecutar código ni conocer contexto operativo.

**Recommendation:** incluirlas como dimensiones con cobertura explícita o posponer su valoración; no rellenar huecos con puntuaciones artificiales.

## React vs Angular

### Recomendación

Elegir **Angular + TypeScript** para `apps/web`.

### Comparación

| Criterio | React + TypeScript | Angular + TypeScript | Evaluación para este producto |
| --- | --- | --- | --- |
| Adecuación | Muy buena para interfaces compuestas por componentes y ecosistema flexible | Muy buena para una aplicación operativa con workflow, forms y routing integrado | Ventaja ligera para Angular |
| Complejidad | Menor núcleo, pero exige elegir routing, data fetching, forms y convenciones | Más estructura inicial y más decisiones integradas | Angular reduce decisiones dispersas; React puede ser más pequeño |
| Arquitectura | Flexible, con riesgo de divergencia sin disciplina | Convenciones, DI, routing y límites más guiados | Angular encaja mejor con el objetivo arquitectónico |
| Testing | Ecosistema amplio, composición flexible | Testing integrado en la estructura de la aplicación | Empate técnico; Angular favorece consistencia |
| Accesibilidad | Dependiente de componentes y disciplina del equipo | Igualmente dependiente de la implementación | Empate; no elegir por una promesa automática |
| Maintainability | Excelente con boundaries explícitos | Excelente con boundaries y convenciones explícitas | Angular reduce variabilidad inicial |
| Ecosystem | Más amplio y diverso | Amplio y cohesionado para aplicaciones completas | React gana amplitud; no es requisito del MVP |
| Developer experience | Iteración rápida y bajo acoplamiento inicial | CLI, DI y estructura consistente | Angular encaja mejor con el contexto del proyecto |
| API integration | HTTP y contracts compartidos sin diferencia relevante | HTTP y contracts compartidos sin diferencia relevante | Empate |
| Portfolio value | Demuestra una opción muy extendida | Demuestra arquitectura, criterio y coherencia con el perfil objetivo | Ventaja para Angular en este portfolio |
| Design system | Gran oferta de componentes, con riesgo de mezclar paradigmas | Buen encaje con una librería interna consistente | Ligera ventaja para Angular por convención |
| Evolución | Muy flexible, requiere gobernanza continua | Evolución guiada y explícita, con más ceremony | Angular es preferible para este workflow |

### Razones

- El producto es una aplicación operativa con formularios, routing, estados de progreso, tablas, filtros y vistas de detalle; Angular ofrece una estructura integrada adecuada para ese workflow.
- Angular encaja mejor con el objetivo de demostrar arquitectura frontend, boundaries por feature, dependency injection, testing y design system dentro de una aplicación coherente.
- El contexto técnico disponible tiene experiencia relevante con Angular, lo que reduce riesgo de implementación y mejora la calidad del primer slice.
- Angular facilita imponer convenciones compartidas en un repository inicialmente sin código.
- La accesibilidad depende de la implementación, no del framework; Angular permite estructurar componentes, forms y estados accesibles sin una desventaja relevante.
- La integración con la API es equivalente en ambos casos mediante HTTP y contracts compartidos.

### Compromisos (trade-offs)

React tiene un ecosystem más amplio y puede ser más ligero para una única pantalla. Angular introduce más estructura y una curva inicial mayor. Esa ceremony es aceptable aquí porque el objetivo no es solo renderizar un formulario, sino demostrar una aplicación mantenible y accesible.

### Cuándo React sería mejor

React sería preferible si el portfolio necesitara deliberadamente demostrar React, si el equipo tuviera mucha más experiencia con React, si se requiriera integrar un ecosystem concreto de componentes React o si el producto evolucionara hacia una superficie de UI muy pequeña y altamente embebible.

La decisión no se basa en cuota de mercado. Está registrada en [ADR-008](adr/ADR-008-angular-frontend.md).

## Clasificación de features del MVP

| Feature | Classification | Decision |
| --- | --- | --- |
| Public GitHub repositories | MUST HAVE | Único origen y alcance controlado del primer slice. |
| URL validation | MUST HAVE | Requisito funcional y de seguridad. |
| Branch to commit SHA resolution | MUST HAVE | Necesario para reproducibilidad. |
| Tree and bounded text-file ingestion | MUST HAVE | Alimenta el analyzer sin descargar indiscriminadamente. |
| TypeScript/JavaScript deterministic analysis | MUST HAVE | Núcleo del valor demostrable. |
| Evidence with path/range/snapshot | MUST HAVE | Sin trazabilidad no existe un report confiable. |
| Deterministic findings and score | MUST HAVE | Valor útil sin IA. |
| Analysis job abstraction | MUST HAVE | Permite estados y evolución sin exigir un worker. |
| SQLite persistence | MUST HAVE | Necesaria para consultar estado y report después de la request. |
| Angular input/progress/report flow | MUST HAVE | Vertical slice usable. |
| Basic rate limiting and resource limits | MUST HAVE | Evita abuso y denial of service básico. |
| Accessibility checks for critical flow | MUST HAVE | Requisito de calidad del producto. |
| Angular/React/Node.js detection | SHOULD HAVE | Contexto útil, pero sin análisis profundo de framework. |
| Maintainability heuristics | SHOULD HAVE | Añadir solo reglas simples y explicables. |
| Security/accessibility tooling coverage | SHOULD HAVE | Mostrar señales, no prometer auditorías completas. |
| Simple polling | SHOULD HAVE | Solo si el análisis no termina en la request. |
| AI assessment | COULD HAVE | Fase posterior condicionada a feedback y calidad determinista. |
| Global score | COULD HAVE | Requiere demostrar que las dimensiones son comparables. |
| Private repositories | NOT NOW | Requiere identidad, tokens, consentimiento y política de datos. |
| Dedicated worker and distributed queue | NOT NOW | No hay evidencia de volumen o duración. |
| PostgreSQL and multi-instance deployment | NOT NOW | SQLite cubre el primer runtime. |
| Realtime, dashboard complejo y GitHub write access | NOT NOW | No ayudan a validar el valor central. |

## Vertical slice y decisión de IA

El mínimo flujo completo es:

```text
GitHub URL
    ↓
validated public repository
    ↓
commit SHA snapshot
    ↓
bounded TypeScript/JavaScript files
    ↓
deterministic facts and metrics
    ↓
evidence-backed findings
    ↓
deterministic dimension score
    ↓
recommendations
    ↓
Angular report
```

La IA no debe formar parte del primer slice. El producto ya puede responder "qué se detectó, dónde y con qué evidencia" sin coste de provider ni riesgo de confundir una inferencia con un hecho. La IA tendrá sentido después para interpretar relaciones semánticas o priorizar acciones sobre evidence existente.

## Alternativas de job

| Option | Assessment |
| --- | --- |
| API procesa análisis directamente | Simple, pero una request larga mezcla transporte y ejecución y hace más difícil exponer progreso. Solo es aceptable para un análisis pequeño y síncrono. |
| Worker independiente | Escalable y aislable, pero exige despliegue, coordinación, retries, observabilidad y operación desde el primer commit. Prematuro. |
| Job abstraction con runner en el mismo proceso | Recomendado: conserva lifecycle, persistencia e idempotencia, con menor complejidad. Debe limitar concurrencia y tener una interfaz extraíble. |

## Decisión de persistence

SQLite es la opción adecuada para el MVP porque necesitamos persistir jobs y resultados, pero no multiinstancia ni alto volumen. In-memory no sobrevive a reinicios y filesystem JSON ofrece peores garantías de integridad y consulta. PostgreSQL queda condicionado a señales de concurrencia, disponibilidad o escalado horizontal.

## Decisión de transporte GitHub

GitHub REST es suficiente para resolver metadata, branch, commit, tree y blobs seleccionados. GraphQL no aporta una ventaja necesaria todavía. `git clone` aumenta superficie de filesystem, hooks, submodules y LFS. Archives reducen requests, pero obligan a gestionar descompresión y archive bombs. La decisión está registrada en [ADR-010](adr/ADR-010-github-rest-snapshot.md).

## Referencia del roadmap refinado

La ejecución queda definida en [roadmap.md](roadmap.md): Foundation, contracts, GitHub REST ingestion, analyzer TypeScript/JavaScript, SQLite/job lifecycle, Angular report, hardening, AI condicional y scaling condicional. La IA y la extracción operativa no bloquean la validación del primer producto.

## Auditoría de complejidad

| Tecnología o componente | Use now? | Reason |
| --- | --- | --- |
| Redis | No | No hay necesidad de cache compartida ni cola distribuida en el MVP. |
| Kafka | No | Volumen y requisitos de eventos insuficientes. |
| RabbitMQ | No | El job runner vive inicialmente en la API. |
| Kubernetes | No | Coste operativo sin requisito de escala. |
| Terraform | No | La infraestructura aún no está decidida ni necesita reproducirse en esta fase. |
| Vector database | No | El contexto inicial es acotado y seleccionable por reglas. |
| RAG | No | No existe una base documental externa que recuperar. |
| Agents | No | El pipeline es conocido y determinista por etapas. |
| Microservices | No | No hay límites de escalado u ownership independientes. |
| GraphQL | No | Los recursos y consultas iniciales son simples y orientados a reportes. |
| Event sourcing | No | No necesitamos reconstruir un historial de eventos de negocio. |
| CQRS | No | Separar modelos de lectura/escritura añade coste sin una carga que lo justifique. |
| PostgreSQL | No en MVP | Es una buena opción de producción futura, pero SQLite cubre el primer despliegue y tests con menor coste. |
| Dedicated worker | No en MVP | Se conserva como evolución posterior al medir jobs reales. |

## Valor de portfolio

Aportan valor real:

- límites modulares y contratos explícitos;
- analyzer reproducible con evidence verificable;
- integración segura con una API externa no confiable;
- scoring explicable y tratamiento honesto de datos insuficientes;
- Angular accesible y orientado a una aplicación operativa;
- tests de reglas, evidence y lifecycle;
- decisión explícita de no ejecutar código analizado;
- futura IA estructurada, acotada y sustituible.

Es engineering theatre para el MVP:

- microservicios sin necesidad;
- Kubernetes, Terraform y colas distribuidas;
- RAG, embeddings y vector database;
- varios providers reales antes de tener un caso validado;
- dashboard complejo o realtime antes de observar usuarios;
- score global con una cifra aparentemente precisa pero sin calibración.

## Revisión de privacidad

La retención de 24 horas es razonable para el MVP si se eliminan también los datos temporales de ingesta y se ofrece una operación de cleanup verificable. La persistencia debe limitarse a request normalizada, SHA, facts, metrics, findings, evidence references y recommendations. No debe guardarse el repository completo, prompts ni responses.

La IA no recibe datos durante el primer vertical slice. Antes de habilitarla se debe documentar provider, transferencia, entrenamiento, consentimiento y redacción. Los logs deben contener solo IDs opacos, estados, duraciones y clases de error.

## Revisión de testing

Los riesgos que merecen prioridad son la reproducibilidad del snapshot, los límites de ingesta, la validez de evidence, las reglas del analyzer, el scoring y el lifecycle de jobs. El conjunto MUST está documentado en [quality.md](quality.md): unit tests de dominio/analyzer/scoring, integration tests de GitHub y SQLite, contract tests de API y tests del flujo frontend con accessibility.

La validación de IA, los provider contracts y los load tests pertenecen a fases posteriores. No se debe inflar la cobertura con tests de integración contra proveedores reales ni repositories externos inestables.

## Revisión del frontend

El frontend mínimo necesita tres vistas de workflow: entrada de repository, progreso y report. El report debe mostrar revision, estado, limitaciones, score determinista, findings, evidence y recommendations. No se necesita dashboard complejo, realtime, historial ni visualizaciones decorativas para validar el producto.

Angular ofrece la estructura adecuada para este flujo, pero la calidad dependerá de una API clara, estados completos y una implementación accesible. La arquitectura debe probar keyboard navigation, focus, labels, `aria-live`, contraste y responsive behavior en el flujo principal.

## Revisión de ADRs

| ADR | Decision | Action | Reason |
| --- | --- | --- | --- |
| ADR-001 | Monolito modular | MODIFY | Se mantiene el principio, pero el runtime inicial pasa de tres apps a web + API. |
| ADR-002 | Monorepo | KEEP | Sigue siendo útil para contracts y módulos coordinados. |
| ADR-003 | AI provider abstraction | MODIFY | Se conserva como boundary futuro, sin package ni providers en el MVP. |
| ADR-004 | Deterministic first | KEEP | Se refuerza al excluir IA del primer vertical slice. |
| ADR-005 | Structured AI output | MODIFY | La decisión sigue siendo válida, pero se difiere a Phase 8. |
| ADR-006 | Analysis job model | MODIFY | Se conserva `AnalysisJob`, pero el runner inicial vive dentro de la API. |
| ADR-007 | MVP runtime simplification | KEEP | Es la decisión refinada para el primer runtime. |
| ADR-008 | Angular frontend | KEEP | Decisión explícita y coherente con el producto y el contexto del proyecto. |
| ADR-009 | Deterministic MVP scoring | KEEP | Separa score base de AI assessment y evita precisión artificial. |
| ADR-010 | GitHub REST snapshot | KEEP | Satisface reproducibilidad con límites controlables. |
| ADR-011 | Incremental analyzer scope | KEEP | Reduce el alcance a TypeScript/JavaScript y declara limitaciones. |
| ADR-012 | SQLite persistence | KEEP | Cubre jobs y resultados sin introducir infraestructura prematura. |

No se elimina ningún ADR: los ADRs históricos permanecen para conservar trazabilidad. No se crea un ADR `SUPERSEDE` separado porque las modificaciones están documentadas en ADR-007 y en los estados del índice.

## Criterios de éxito

El MVP debe medir únicamente señales que puedan obtenerse razonablemente:

- **Reproducibility:** mismo commit, configuración y versión del analyzer producen el mismo resultado.
- **Completion rate:** porcentaje de jobs que alcanzan `completed` o `completed_with_limitations`.
- **Evidence coverage:** porcentaje de findings publicados con evidence verificable.
- **False positive sample rate:** proporción de findings revisados manualmente que se consideran incorrectos, sobre una muestra pequeña y definida.
- **Analysis duration:** tiempo desde la creación hasta el report para repositories dentro del límite.
- **Supported scope:** tamaño máximo documentado y porcentaje de archivos incluidos/excluidos.
- **AI validation failure rate:** solo cuando la IA se habilite; no es un gate del vertical slice determinista.
- **Critical frontend accessibility:** flujo principal navegable por teclado y validado con checks automáticos y revisión manual.

No se fija un umbral numérico antes de disponer de fixtures y una muestra de repositories; esos umbrales serán una decisión posterior basada en datos.
