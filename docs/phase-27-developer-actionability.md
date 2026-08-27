# Phase 27 — Developer Actionability

## 1. Baseline

Estado tras Phase 26 (PASS WITH LIMITATIONS). La evaluación de confianza de Phase 26 mostró
`Actionability: 3/5` como dimensión más débil de la cadena finding → acción.

Trazado real de un finding a través del pipeline (antes de Phase 27):

```text
analyzer (FindingSpec) → createFindingBundle → Recommendation → AnalysisResult
→ scoreAnalysis → SqlitePersistence → mapper → /analyses/:id/report → report.page.html
```

Información que existía y llegaba al developer:

| Capability | Estado antes |
|---|---|
| WHAT (finding.title / description) | ✅ existía |
| WHY (finding.impact) | ✅ existía |
| ACTION (recommendation.title / description) | ✅ existía, calidad aceptable |
| HOW TO VERIFY (verification) | ❌ **no existía en ningún punto del modelo** |
| Explicación de prioridad | ⚠️ severity como palabra suelta, sin contexto |

Inventario completo de reglas con su recomendación: AN-DOC-001, AN-TEST-001, AN-TEST-002,
AN-TOOL-001, AN-DEP-001, AN-CQ-002, AN-CQ-003, AN-MAINT-001, AN-CQ-004, AN-CQ-005, AN-ARCH-001,
AN-ARCH-002, AN-SEC-002, AN-SEC-003 (4 variantes). Todas las recomendaciones eran genéricas pero
razonables; ninguna incluía cómo verificar la mejora.

**Problema identificado:** el journey "Finding → Why → Action → Verification" se rompía en el
último eslabón: un developer no podía responder "¿cómo compruebo que lo he arreglado?".

## 2. Contrato de actionability

Para cada finding el producto debe permitir responder:

| Pregunta | Fuente |
|---|---|
| ¿Qué está mal? | finding.title + finding.description |
| ¿Por qué importa? | finding.impact |
| ¿Qué hago? | recommendation.title + recommendation.description |
| ¿Cómo lo verifico? | **recommendation.verification** (nuevo) |

El contrato **no implica certeza** cuando la evidencia es `absence_based`, `not_inspected` o
`not_verified`: el texto de verificación respeta el estado de evidencia y nunca afirma ausencia o
confirmación que la evidencia no respalda.

## 3. Implementación

### Dominio (`packages/domain`)
- `Recommendation.verification?: string` — opcional (backward compatibility); el analyzer siempre lo
  establece.
- `CreateRecommendationInput.verification?: string`; `createRecommendation` valida texto no vacío
  cuando está presente.

### Contracts (`packages/contracts`)
- `ApiRecommendation.verification?: string`.

### Analyzer (`packages/analyzer`)
- `FindingSpec.recommendationVerification: string` (requerido) — el compilador fuerza que **toda**
  regla declare verificación.
- Texto evidence-aware por regla (ver sección 4).
- Propagación en `createFindingBundle` → `createRecommendation`.

### API (`apps/api`)
- `mapRecommendation` propaga `verification` por spread — sin cambios de código, verificado por test.

### Frontend (`apps/web`)
- Cada recomendación muestra ahora **"How to verify:"** con su texto.
- Nueva línea bajo la meta del finding: *"Severity: deterministic estimate within the inspected
  snapshot"* con `aria-label` explicativo completo (STEP 5 — la explicación mejora la presentación
  de prioridad sin tocar el cálculo).

## 4. Semántica de verificación (evidence-aware)

Reglas de redacción aplicadas, sin inventar comandos ni estructura del repo (solo "re-run the
analysis" o referencia a configuración ya observada):

| Estado de evidencia | Reglas | Wording de verificación |
|---|---|---|
| `absence_based` | AN-DOC-001, AN-TEST-001 (sin tooling), AN-TEST-002, AN-TOOL-001, AN-DEP-001 | "re-run the analysis" + calificador de snapshot cuando aplica (p. ej. lockfile que exceda límites de tamaño puede seguir sin detectarse) |
| `not_inspected` | AN-CQ-002 | "until then the strictness state remains unverified" — nunca presenta falta de información como ausencia |
| `not_verified` | AN-ARCH-002 | "this finding is not proof of a defect" — no presenta la resolución estática fallida como confirmada |
| `verified` | AN-CQ-003, AN-MAINT-001, AN-CQ-004, AN-CQ-005, AN-ARCH-001, AN-SEC-002, AN-SEC-003 | acción + "re-run the analysis" con resultado observable (umbral, count, patrón) |

Ninguna verificación usa comandos concretos (`npm test`, etc.) porque el analyzer no los ha
observado: usa "re-run the analysis", que es determinista y honesto.

## 5. Tests

| Caso | Cobertura | Resultado |
|---|---|---|
| A — actionable recommendation | analyzer: toda recomendación expone `verification` no vacío y enlaza a un finding | ✅ |
| B — verification guidance | analyzer: texto de verificación presente y determinista | ✅ |
| C — evidence-aware wording | analyzer: absence_based no produce afirmaciones definitivas ("no tests exist", "is absent" prohibidos) | ✅ |
| D — insufficient coverage | analyzer: verificación de absence_based queda acotada al snapshot inspeccionado | ✅ |
| E — not inspected | analyzer: AN-CQ-002 "remains unverified" (nunca como ausencia) | ✅ |
| F — not verified | analyzer: AN-ARCH-002 "not proof of a defect" (nunca como confirmado) | ✅ |
| G — API/UI consistency | pipeline API: `verification` y `evidenceStatus` llegan al report endpoint | ✅ |
| H — backward compatibility | domain: `verification` opcional (ausente en recomendaciones viejas); suite existente intacta | ✅ |

Counts: analyzer 21 (+2), domain 15 (+0, extendido), api 10 (+1), web 26 (+4), github 25,
scoring 4, persistence 3, ai 4.

## 6. Evaluación de actionability (STEP 7)

Muestra representativa (fixtures deterministas del analyzer):
- `verified` → AN-MAINT-001 / AN-CQ-003 (presencia observada con path)
- `absence_based` → AN-TEST-001 / AN-DEP-001
- `not_inspected` → AN-CQ-002
- `not_verified` → AN-ARCH-002

| Dimensión | Pregunta | Antes (Ph. 26) | Después (Ph. 27) | Cambio |
|---|---|---|---|---|
| Understand | ¿Puede el developer explicar el problema? | 4 | 4 | — |
| Impact | ¿Entiende por qué importa? | 4 | 4 | — |
| Action | ¿Sabe qué hacer a continuación? | 3 | 4 | +1 (verificación ata la acción a un resultado) |
| Verify | ¿Sabe cómo verificar el cambio? | 1 | 4 | +3 (nuevo campo por recomendación) |
| Trust | ¿Respeta las limitaciones de evidencia? | 4 | 5 | +1 (wording de verificación evidence-aware) |

La mejora es estructural (nuevo eslabón Verify) y no manipulada: la dimensión que sube es
exactamente la que faltaba en el modelo de datos.

## 7. E2E / validación de producto

La cuota anónima de GitHub estaba agotada (0/60, reset en ~30 min). Según STEP 9, **no se esperó**.
La cadena completa GitHub → report no pudo ejercitarse contra GitHub real en esta fase; la cadena
analyzer → scoring → persistence → API → frontend queda validada por el test G (pipeline) + tests
web deterministas. La ingesta real contra `octocat/Hello-World` ya se demostró en fases previas con
el mismo código de ingestion (sin cambios en esta fase).

## 8. Limitaciones

- La verificación guiada es determinista y honesta pero deliberadamente conservadora: "re-run the
  analysis" no reemplaza una suite de pruebas real ni comandos específicos (no inventados).
- Para findings `not_inspected`/`not_verified` la "verificación" es una inspección manual del
  repositorio, no un paso automatizable por el producto.
- No se tocó el cálculo de severity/scoring; la mejora de prioridad es de presentación.
- El eslabón GitHub real no se ejercitó en esta fase por cuota agotada (decisión explícita de no
  esperar).

## 9. Conclusión de producto

Un developer puede ahora recorrer Finding → Understanding → Action → Verification: cada
recomendación dice qué hacer y cómo comprobar que se hizo, respetando la certeza que la evidencia
permite. La acción sigue siendo guiada (no automática) y el producto sigue sin afirmar más de lo que
sabe.

## 10. Decisión

**PASS WITH LIMITATIONS.** El journey de actionability está claramente mejorado (nuevo eslabón
Verify, verificación evidence-aware en las 14 reglas) y la semántica de evidencia sigue siendo
confiable. Limitaciones conocidas: verificación conservadora sin comandos específicos, y el eslabón
GitHub real no ejercitado en esta fase.
