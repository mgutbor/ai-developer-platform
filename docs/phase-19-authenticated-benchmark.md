# Phase 19 — Benchmark autenticado y validación de cobertura del snapshot

## 1. Resumen ejecutivo

La Phase 19 auditó el mecanismo de autenticación de GitHub configurado e intentó obtener la evidencia requerida para un benchmark autenticado y un experimento de cobertura de snapshot.

No había ningún token de GitHub disponible en el entorno. Además, la API anónima de GitHub solo tenía 2 requests restantes cuando se comprobó. Según las reglas de la fase, no se inventó ningún token, no se eludió ningún rate limit y ningún benchmark se redujo silenciosamente ni se sustituyó por fixtures.

El benchmark solicitado de al menos 15 repositorios públicos y los experimentos reales de `maxFileCount` a 10/50/100 son, por tanto:

```text
BENCHMARK = NOT VALIDATED
SNAPSHOT COVERAGE EXPERIMENT = NOT VALIDATED
```

Esto es una limitación externa de credenciales/cuota, no evidencia de que el producto fallara. La decisión de release sigue siendo:

```text
GO WITH LIMITATIONS
```

## 2. Estado de la autenticación

No estaba presente ninguna variable `GITHUB_TOKEN` ni `GH_TOKEN`. No se imprimió, persistió, solicitó ni creó ningún token.

Cuota anónima de GitHub observada en el momento de la auditoría:

- límite core: 60;
- usados: 58;
- restantes: 2.

Tampoco había credenciales de AI, pero la validación de AI no era un objetivo de esta fase.

Estado de la autenticación:

```text
NOT VALIDATED — el acceso autenticado a GitHub no estaba disponible
```

## 3. Dataset del benchmark

Los repositorios retenidos requeridos se identificaron a partir del runner existente:

- `octocat/Hello-World`;
- `sindresorhus/type-fest`;
- `expressjs/express`;
- `angular/angular`;
- `facebook/react`.

No se ejecutó un conjunto adicional diverso de al menos 10 repositorios porque la cuota autenticada no estaba disponible. No se reivindica ningún SHA de commit, tamaño, findings, duración ni valor de estado para un benchmark de la Phase 19.

Las mediciones históricas de cinco repositorios permanecen en `docs/phase-16-real-world-evaluation.md` y no son mediciones de la Phase 19.

## 4. Experimento de cobertura del snapshot

Los escenarios previstos eran:

| Escenario | `maxFileCount` | Estado |
|---|---:|---|
| A | 10 | NOT VALIDATED contra repositorios reales |
| B | 50 | NOT VALIDATED contra repositorios reales |
| C | 100 | NOT VALIDATED contra repositorios reales |

La API de ingestión existente acepta límites por ejecución y la suite de tests de GitHub ya ejercita valores acotados como 5 y 8 archivos. Esos tests validan el enforcement de límites y la priorización determinista, pero no miden la calidad en repositorios reales a 10/50/100.

No se midió:

- archivos y bytes observados por repositorio/escenario real;
- requests por escenario;
- findings por categoría;
- cambios de score;
- cambios de latencia;
- cambios de falsos positivos o falsos negativos;
- mejora en la detección de metadatos/tests/dependencias.

Todo ello está en:

```text
NOT VALIDATED
```

## 5. Ground truth

No se creó ningún ground truth manual nuevo de la Phase 19 porque no se produjeron findings de benchmark reales.

La evidencia controlada e histórica existente respalda estas conclusiones acotadas:

- las expresiones de seguridad y los patrones realistas similares a secretos tienen cobertura de regresión;
- los findings de ausencia están acotados al snapshot cuando la cobertura es parcial;
- los imports sin resolver son heurísticos y de confianza media;
- la priorización de metadatos raíz y los redirects canónicos seguros tienen cobertura de regresión;
- los valores de secretos no se persisten en la evidencia.

Las métricas globales de ground truth permanecen en:

```text
Precision = NOT VALIDATED
Recall = NOT VALIDATED
Tasa de falsos positivos = NOT VALIDATED
Número de falsos negativos = NOT VALIDATED
```

Las observaciones UNKNOWN no se reclasificaron como positivas o negativas.

## 6. Exactitud de los findings

Estado:

```text
PARTIALLY VALIDATED
```

La evidencia existente de fixtures y de los cinco repositorios históricos valida el comportamiento de reglas seleccionadas, pero la muestra autenticada ampliada de la Phase 19 no estuvo disponible. No se reivindica ningún falso positivo o falso negativo nuevo.

## 7. Rendimiento

No se ejecutó una comparación 10/50/100 de la Phase 19:

```text
NOT VALIDATED
```

Las duraciones totales históricas dependientes de la red de la Phase 16, de aproximadamente 1.08–3.79 segundos, siguen siendo el único contexto reciente disponible. Ninguna evidencia de esta fase justifica workers, colas, caché, Redis, PostgreSQL u otra infraestructura.

## 8. Regresión de seguridad

No se cambió ningún comportamiento de seguridad de producción. Los tests existentes siguen cubriendo:

- HTTPS y allowlisting de hosts de GitHub;
- redirects seguros;
- path traversal, symlinks y submódulos;
- límites de requests, archivos, bytes, árbol y timeout;
- evidencia de solo hash con redacción de secretos;
- aislamiento de AI y validación de referencias.

No se ejecutó ningún código de repositorio, no se instalaron dependencias del repositorio y no se persistió ningún contenido ni credencial del repositorio.

Estado de regresión de seguridad:

```text
VALIDATED para los controles testeados existentes
```

El comportamiento exhaustivo en el mundo real con mayor cobertura sigue en `NOT VALIDATED`.

## 9. Utilidad del producto

No había revisores humanos disponibles y no se simularon resultados de usuarios:

```text
HUMAN EVALUATION = NOT VALIDATED
```

El efecto del aumento real de cobertura del snapshot en evidencia, recomendaciones, confianza y scores también está en:

```text
NOT VALIDATED
```

## 10. Estado de AI

La AI no se ejercitó en esta fase.

```text
AI LIVE VALIDATION = NOT VALIDATED
```

Los tests existentes de FakeAIProvider siguen siendo solo evidencia técnica de integración.

## 11. Decisión de cobertura

Decisión basada en evidencia:

```text
KEEP CURRENT BOUNDED SELECTION WITH LIMITATIONS
```

Esto no es una conclusión de que `maxFileCount = 10` sea suficiente en general. Significa que en esta fase no se obtuvo evidencia que justifique aumentar el valor por defecto o introducir selección adaptativa.

La política actual sigue siendo preferible a un aumento sin límite porque preserva la ingestión determinista y acotada y ya prioriza señales de metadatos/fuente/tests. Un experimento autenticado futuro debería comparar 10/50/100 sobre los mismos SHAs de commit antes de cambiar el valor por defecto.

## 12. Cambios aplicados

Solo se añadió este archivo de documentación:

```text
docs/phase-19-authenticated-benchmark.md
```

No se cambió ningún código de analyzer, scoring, ingestion, frontend, API, AI ni infraestructura. No se necesitó ningún test de regresión porque no se estableció ningún defecto nuevo.

## 13. Quality gates

Todos los gates requeridos pasaron después de crear la documentación:

| Comando | Resultado |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm check:architecture` | PASS |
| `pnpm format:check` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS |
| `pnpm build` | PASS |
| `pnpm audit --audit-level=high` | PASS |
| `git diff --check` | PASS |

Conteo exacto de tests:

```text
75 passing
```

Desglose:

- Domain: 15;
- GitHub: 19;
- Analyzer: 17;
- Scoring: 3;
- Persistence: 2;
- AI: 4;
- API: 7;
- Frontend: 4.

Las advertencias no se ocultaron: el Node local es `25.3.0` mientras que el proyecto apunta a Node 24, y SQLite sigue siendo experimental en el runtime local.

## 14. Decisión final de release

```text
GO WITH LIMITATIONS
```

Justificación:

- los controles deterministas y de seguridad existentes siguen en verde;
- no se introdujo ningún defecto nuevo;
- el benchmark autenticado no pudo ejecutarse porque no había token disponible;
- la cuota anónima era insuficiente para la muestra requerida;
- los escenarios de cobertura 10/50/100 siguen sin medirse en repositorios reales;
- la precision, el recall, la utilidad humana y la calidad de AI en vivo siguen sin estar disponibles.

Esto no implica un estado production-ready ni enterprise-ready.

## 15. Limitaciones restantes

- benchmark autenticado de GitHub de 15+ repositorios: `NOT VALIDATED`;
- experimento de cobertura de snapshot a 10/50/100: `NOT VALIDATED`;
- ningún token autenticado disponible;
- cuota anónima de GitHub limitada a 2 requests restantes;
- precision/recall y tasa de falsos positivos no disponibles;
- sin revisores humanos independientes;
- sin validación de AI en vivo;
- los snapshots parciales y los findings de ausencia acotados al snapshot siguen siendo una limitación del producto;
- sin validación de carga de producción, multi-instancia, backup/recovery ni HA;
- sin E2E de navegador ni auditoría WCAG completa;
- el Node local 25 difiere del Node 24 del proyecto/CI;
- `node:sqlite` sigue siendo experimental.

## 16. Recomendación para el siguiente paso

Cuando un token de GitHub esté disponible de forma segura mediante la configuración de entorno server-side, ejecuta los cinco repositorios retenidos más al menos diez repositorios públicos diversos con `maxFileCount` 10, 50 y 100 usando los mismos SHAs de commit cuando sea posible. Registra requests, bytes, findings, scores, limitaciones y tiempos sin persistir contenidos ni credenciales del repositorio. Después realiza la revisión ground-truth manual antes de cambiar la política de selección por defecto.

## Conventional Commit

```text
test: validate authenticated benchmark readiness
```
