# Modelo de análisis

## Alcance del analyzer

El MVP analiza profundamente TypeScript y JavaScript. Angular, React y Node.js se detectan como contexto mediante manifests, configuración y convenciones, pero no se hacen afirmaciones profundas específicas de framework sin reglas y evidencia suficientes. Otros lenguajes se registran como metadata y quedan fuera del scoring profundo.

El vertical slice prioriza Architecture, Testing, Documentation, Dependencies y Code Quality. Maintainability se limita a señales estáticas simples. Accessibility y Security se expresan inicialmente como cobertura de tooling/configuración, no como auditorías completas.

## Capas de resultado

- **Fact:** observación directa del snapshot, por ejemplo `has_ci_config = true`.
- **Metric:** medida derivada con método y denominador explícitos.
- **Finding:** problema o riesgo respaldado por evidence.
- **Recommendation:** acción concreta vinculada a uno o más findings.

La ausencia de una señal significa `unknown` o `not_detected`, no necesariamente `false`.

## Dimensiones del MVP

| Dimensión | Deterministic sin ejecutar | Finding razonable | Limitación |
| --- | --- | --- | --- |
| Architecture | árbol, entry points, imports, profundidad, módulos inferibles y ciclos simples | dependencias circulares o boundaries estructurales observables | no demuestra runtime architecture ni intención |
| Testing | test files/directories, framework/config, coverage config, CI test commands | ausencia de señales mínimas de testing en áreas detectables | no se ejecutan tests y presencia no implica calidad |
| Documentation | README, docs, contribution guide, changelog y referencias básicas | documentación mínima ausente o claramente incompleta | no mide conocimiento tácito ni exactitud completa |
| Dependencies | manifests, lockfiles, package manager, versiones, duplicados y metadata disponible | dependencia declarada sin lockfile o señales verificables de gestión débil | no instala ni resuelve dependencias del repository |
| Code Quality | lint, formatting, typecheck configs, generated files, tamaños y patrones simples | falta de tooling declarado o inconsistencias mecánicas | no conoce estándares internos |
| Maintainability | tamaño, complejidad sintáctica disponible, duplicación limitada y hotspots | archivo o módulo excesivamente grande según regla | heurísticas no equivalen a mantenibilidad real |
| Accessibility | tooling/config de accessibility y señales estáticas seleccionadas en TS/JS | ausencia de tooling declarado, con wording de cobertura limitada | no renderiza ni ejecuta auditoría WCAG |
| Security | patterns redactados, security tooling, workflow/config y advisories verificables | señales concretas de secreto o configuración insegura | no es SAST/DAST ni garantiza ausencia de vulnerabilidades |

Los findings de Accessibility y Security deben usar lenguaje de señal detectada, nunca afirmar una auditoría completa.

## Provenance y evidence

Cada fact o metric debe poder indicar:

```text
id
kind
value
source = deterministic
method
snapshotId
locations[]
limitations[]
```

Una evidence publicada debe resolver esta cadena:

```text
Finding
   ↓ evidenceId
Evidence
   ↓ snapshotId + path + range
RepositorySnapshot
   ↓ commit SHA
GitHub repository revision
```

El modelo mínimo de evidence es:

```text
id
kind = file | config | metric | metadata | dependency | workflow
snapshotId
path
range
redactedExcerpt or excerptHash
factId/metricId
```

`path` debe ser relativo, normalizado y perteneciente al tree fijado. `range` es opcional para metadata y obligatorio cuando el finding depende de una ubicación concreta. No se guardan excerpts completos por defecto.

## Finding

```text
id
category
severity
title
description
evidenceIds[]
locations[]
impact
recommendationIds[]
confidence
source = deterministic
status
snapshotId
ruleId
```

En el MVP `source` es `deterministic`. Los valores `ai` y `combined` quedan reservados para una fase posterior.

`severity` distingue impacto (`critical`, `high`, `medium`, `low`, `info`) y no certeza. `confidence` expresa la confianza en la validez de la afirmación.

## Recommendation

```text
id
title
description
findingIds[]
priority
expectedImpact
effort
acceptanceHint
source = deterministic
```

Las recommendations iniciales deben derivarse de reglas conocidas. No se generarán recomendaciones de texto libre sin un finding verificable.

## Scoring strategy

El MVP publicará un score determinista nullable por dimensión. No se publicará score global en el primer vertical slice.

```text
score = clamp(baseScore - rulePenalties, 0, 10)
```

Cada regla debe definir:

- señal requerida;
- valor esperado;
- peso o penalización;
- evidence generada;
- comportamiento cuando faltan datos;
- versión de regla;
- fixtures y casos límite.

La respuesta del report incluirá:

```text
deterministicScore: 0..10 | null
confidenceBand: low | medium | high
evidenceCount: integer
coverage: complete | partial | insufficient
ruleSetVersion
limitations[]
```

No se mezclan scores deterministas y de IA. Cuando la IA se incorpore, producirá una `aiAssessment` separada con claims y confidence, sin modificar automáticamente el score determinista. Solo una evaluación comparativa posterior podría justificar una combinación y requeriría un ADR nuevo.

`score = null` se usa cuando no hay señales mínimas o el denominador no es fiable. Nunca se representa desconocido como `0`.

## Reconciliation

Antes de publicar:

1. Deduplicar por rule, category, location y snapshot.
2. Verificar que evidence pertenece al snapshot.
3. Normalizar paths y rangos.
4. Validar enums y rangos.
5. Asociar recommendations a findings existentes.
6. Marcar `insufficient_data` y archivos excluidos.

La reproducibilidad se define por repository, commit SHA, configuración, versión del analyzer y versión de reglas.
