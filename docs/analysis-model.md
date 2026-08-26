# Modelo de análisis

## Capas canónicas

Phase 2 separa deliberadamente cinco conceptos:

- **Fact:** observación directa del snapshot. Ejemplo: existe `README.md`.
- **Metric:** medida derivada de facts o de datos del snapshot. Ejemplo: `test_file_ratio = 0.18`.
- **Evidence:** soporte verificable y minimizado para una observación o medida.
- **Finding:** problema o riesgo interpretado, respaldado por una o más evidencias.
- **Recommendation:** acción concreta vinculada a uno o más findings.

```text
RepositorySnapshot
        |
       Facts
        |
      Metrics
        |
     Evidence
        |
     Findings
        |
 Recommendations
        |
  AnalysisResult
```

Ninguna de estas capas debe convertirse silenciosamente en otra. En particular, un fact no es un finding y una métrica no es una recomendación.

## RepositorySnapshot

`RepositorySnapshot` representa la revisión exacta analizada:

```text
id
owner
name
repositoryUrl
ref
commitSha
createdAt
```

Owner y repository se normalizan a minúsculas. La identidad es siempre `snapshot:owner/name@commitSha`; la branch/ref es contexto mutable y el `commitSha` completo es la identidad de la fuente. La factory valida una URL HTTPS sintácticamente pública de GitHub, la correspondencia con owner/name y un commit SHA completo de 40 o 64 caracteres hexadecimales. La visibilidad real del repository se comprueba en `packages/github`; el dominio solo valida la forma canónica de la identidad.

## Fact y Metric

`Fact` contiene `type`, `key`, un valor primitivo o una lista de strings, estado, provenance y metadata escalar opcional. El estado es uno de:

```text
observed | not_detected | unknown | insufficient_data
```

Un fact observado tiene valor; los demás tienen valor `null`.

`Metric` contiene nombre, valor numérico o textual, unidad opcional, IDs de facts de origen, provenance y `ruleVersion`. Una métrica no observada también tiene valor `null`. Las factories validan que sus facts de origen existan dentro del `AnalysisResult`.

## Evidence

`Evidence` contiene:

```text
id
snapshotId
kind
location
excerptHash | redactedExcerpt
sourceId
```

`location` puede ser `null` para evidence de tipo `metric` o `metadata`; evidence de archivo, config, dependency y workflow requiere path. El path es relativo, normalizado y no puede ser absoluto ni contener traversal. Un rango opcional usa posiciones positivas y no puede terminar antes de empezar.

Por minimización, una evidence de fuente usa un `excerptHash` o un `redactedExcerpt`, nunca ambos, y nunca almacena un archivo completo. Su `snapshotId` debe coincidir con el resultado y su `sourceId` debe resolver a un fact o metric del mismo resultado.

## Finding

Un finding contiene:

```text
id
category
severity
title
description
impact
evidenceIds
recommendationIds
confidence
source
ruleId
ruleVersion
provenance
```

`category` usa las ocho dimensiones actuales. `severity`, `confidence` y `source` son value sets cerrados. Todo finding requiere al menos una evidencia. Los findings deterministas requieren `ruleId` y `ruleVersion` tanto en el finding como en su provenance.

## Recommendation

Una recommendation contiene `id`, título, descripción, prioridad, IDs de findings y source. Debe referenciar al menos un finding. `AnalysisResult` exige que la relación sea recíproca: cada recommendation aparece en el finding que declara atender y viceversa.

## AnalysisResult y scoring

`AnalysisResult` es el aggregate report de Phase 2:

```text
id
snapshot
facts
metrics
evidence
findings
recommendations
dimensionScores
confidence
coverage
ruleSetVersion
analyzerVersion
limitations
createdAt
```

La factory valida IDs únicos, referencias resolubles, consistencia de snapshot, ausencia de evidence huérfana, relaciones recíprocas y versiones presentes. `DimensionScore` contiene un score entre 0 y 10 o `null`, confidence, evidence count, coverage y limitaciones. Un score `null` exige coverage `insufficient`; no existe score global ni cálculo de scoring en esta fase.

## Provenance y versionado

Toda observación, métrica y finding tiene provenance con source, method y snapshot ID. La provenance determinista requiere rule ID y rule version. `analyzerVersion` identifica la implementación del analyzer y `ruleSetVersion` identifica las reglas aplicadas; se conservan por separado porque pueden cambiar independientemente.

## Uncertainty

`unknown`, `not_detected` e `insufficient_data` son estados distintos. Los valores desconocidos se expresan con `null` y estado explícito. Nunca se representa desconocido como `false` ni insuficiencia como score `0`.

## Phase 4 implementada

Phase 3 produce un `RepositorySnapshot` y archivos textuales acotados. Phase 4 consume esa forma estructural mediante `packages/analyzer` y genera `AnalysisResult` determinista en memoria con facts, metrics, evidence, findings y recommendations. El analyzer no depende del adapter GitHub ni genera scores.

El modelo todavía no implementa persistencia SQLite, lifecycle de `AnalysisJob`, endpoints de report, score global ni IA.
