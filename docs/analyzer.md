# Analyzer determinista

## Responsabilidad

`packages/analyzer` es un paquete TypeScript puro que consume una entrada con forma de snapshot acotado y produce el `AnalysisResult` de dominio. No tiene dependencias de HTTP, GitHub, Fastify, Angular, SQLite, filesystem, red, entorno, ejecución de procesos ni AI.

El analyzer trata los archivos del repositorio como datos no confiables. Nunca importa, evalúa, instala, ejecuta ni compila el contenido del repositorio.

## Entrada y salida

La API pública es:

```ts
analyze(input, options?): AnalysisResult
```

La entrada contiene un `RepositorySnapshot` validado, archivos textuales acotados y limitaciones de ingestión opcionales. El analyzer acepta la forma estructural del `IngestionResult` de la Fase 3 sin importar el adapter de GitHub, preservando la frontera:

```text
GitHub adapter
      |
      v
datos de ingestión acotada
      |
      v
packages/analyzer
      |
      v
AnalysisResult
```

El resultado contiene facts, metrics, findings respaldados por evidencia, recomendaciones vinculadas, versiones, cobertura, confianza, limitaciones y ninguna puntuación de dimensión. La puntuación global queda diferida deliberadamente.

## Pipeline

```text
validación de entrada
  -> clasificación estable de archivos
  -> detección de manifest/config
  -> señales de lenguaje/framework
  -> señales de tests, documentación, tooling y CI
  -> extracción acotada de imports
  -> facts
  -> metrics
  -> reglas deterministas
  -> evidencia, findings y recomendaciones
  -> validación de AnalysisResult
```

La implementación usa parseo JSON para manifests/configuration JSON y expresiones regulares acotadas para imports y señales textuales. No usa un AST ni el programa del compilador TypeScript en esta fase.

## Clasificación y alcance

TypeScript y JavaScript son Tier 1: `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs` y `.cjs` se clasifican como fuente o tests según su path. `package.json`, lockfiles, configuración, documentación, workflows de CI, paths con apariencia generada y archivos desconocidos tienen clasificaciones separadas.

Angular, React y Node.js se detectan solo como señales verificables del ecosistema. El analyzer no hace afirmaciones de calidad de frameworks. Otros lenguajes quedan fuera del alcance de análisis profundo y permanecen como unknown o limitados.

## Facts y metrics

Los facts son observaciones directas como `package_json_present`, `test_tooling`, `framework_detected`, `ci_capabilities`, `typescript_strict` y recuentos de archivos. Las metrics son valores derivados como:

- recuentos de archivos totales, fuente, tests, documentación, configuración, TypeScript y JavaScript;
- bytes de fuente, tamaño medio de fuente y tamaño máximo de fuente;
- recuento de imports y recuento de TODO/FIXME;
- recuentos de señales `any`, `console` y `@ts-ignore`;
- recuentos de dependencias totales, directas, dev, peer y opcionales;
- ratio test-to-source.

Los manifests ausentes producen `insufficient_data`; las capacidades detectables ausentes usan `not_detected`. Los datos desconocidos e insuficientes nunca se convierten en cero ni en una afirmación negativa fuerte.

El ratio test-to-source es `recuento de archivos de tests / recuento de archivos fuente no-test`. Es `insufficient_data` cuando no hay archivos fuente no-test disponibles.

## Reglas implementadas actualmente

El conjunto inicial de reglas es intencionadamente pequeño y conservador:

- `AN-DOC-001`: README no detectado.
- `AN-TEST-001`: archivos de tests no detectados.
- `AN-TEST-002`: test tooling no detectado.
- `AN-TOOL-001`: lint tooling no detectado.
- `AN-DEP-001`: manifest sin lockfile soportado.
- `AN-CQ-002` / `AN-CQ-003`: estricto de TypeScript no verificado o explícitamente deshabilitado.
- `AN-MAINT-001`: archivo fuente por encima del umbral de líneas configurable.
- `AN-CQ-004`: recuento de TODO/FIXME por encima del umbral configurable.
- `AN-CQ-005`: directivas de ignore de TypeScript detectadas.
- `AN-ARCH-002`: import relativo no coincidente con la resolución estática acotada.
- `AN-ARCH-001`: path fuente más profundo de seis segmentos.
- `AN-SEC-002`: nombre de archivo potencialmente sensible.
- `AN-SEC-003`: contenido tipo credencial, calibrado por tier de severidad (abajo).

Cada finding tiene un ID/versión de regla determinista, una severidad conservadora, una referencia de origen, evidencia y una recomendación recíproca. La ausencia de tooling de accesibilidad o seguridad se expone como un fact; no se convierte automáticamente en un finding de vulnerabilidad.

## Calibración de AN-SEC-003

AN-SEC-003 está calibrado para precisión sobre recall: una falsa alarma de severidad alta puede destruir la confianza en todo el reporte, por lo que la regla es deliberadamente conservadora.

Las expresiones de secretos de GitHub Actions nunca se marcan. `${{ secrets.X }}`, `${{ github.token }}`, `${{ env.X }}` y `${{ vars.X }}` referencian secretos gestionados por la plataforma y se eliminan antes del matching de patrones, de modo que `token: '${{ secrets.GITHUB_TOKEN }}'` en un workflow no produce un finding.

Los valores detectados se clasifican en tiers explícitos:

| Tier | Kind | Severity | Confidence | Ejemplo |
| --- | --- | --- | --- | --- |
| Credencial de alta confianza | `committed` | high | high | `ghp_…`, `AKIA…`, `-----BEGIN … PRIVATE KEY-----` |
| Valor genérico tipo secreto | `possible` | medium | medium | `apiKey: 'some-plausible-value-…'` |
| Placeholder evidente | `placeholder` | low | low | `secret: 'your-api-key-here-…'`, `changeme`, `<…>` |
| Contenido demo/ejemplo/test | `demo` | low | low | cualquier patrón bajo `examples/`, `fixtures/`, `test/`, `spec/` |

Los archivos bajo paths de demo, example, fixture, sample, test, `__tests__` o spec se rebajan a severidad `low` — se reportan como contenido demo/test, no como credenciales commiteadas. Esto es conservador: no excluye los archivos de tests del análisis de seguridad por completo, y el mecanismo de evidencia sigue almacenando solo un hash, nunca el secreto. Se emiten hasta cinco findings de AN-SEC-003 (deterministas, ordenados por path).

## Umbrales y límites

Los valores por defecto están centralizados en `DEFAULT_ANALYZER_OPTIONS`:

- heurística de tamaño de fuente: 400 líneas;
- heurística de TODO/FIXME: 10 marcadores;
- límite de referencias importadas: 40 referencias.

Son heurísticas del MVP, no estándares universales. Son configurables para tests y calibración futura. La resolución de imports solo comprueba paths acotados del snapshot y extensiones comunes de TypeScript/JavaScript; no emula todos los resolvers de runtime ni de bundlers.

## Evidencia y seguridad

La evidencia se crea mediante las factories de dominio y está acotada al snapshot. Apunta a un path relativo normalizado al repositorio cuando existe una ubicación de origen; en caso contrario, a metadatos, y almacena solo un hash estable. Los archivos completos y los secretos detectados nunca se persisten en el resultado.

Los archivos de entrada con otro ID de snapshot, paths inseguros, tamaños inválidos o metadatos de contenido ausentes se excluyen y se registran mediante `invalid_input_files_excluded`. El JSON malformado se aísla en el manifest/config afectado y produce una limitación en lugar de abortar todo el análisis.

## Determinismo

Para el mismo snapshot, archivos de entrada, `analyzerVersion`, `ruleSetVersion` y opciones, el orden de salida, los IDs, los hashes, los timestamps y los valores son estables. El timestamp del resultado se hereda de `RepositorySnapshot`; el analyzer no lee el reloj actual, valores aleatorios, locale, red ni filesystem local.

## Fixtures y tests

Los fixtures de `src/fixtures.ts` son conjuntos de datos inmutables en memoria que cubren TypeScript limpio, TypeScript deficiente, JavaScript/React, señales de Angular, entrada parcial/malformada, señales de seguridad y casos de calibración de AN-SEC-003 (expresiones de GitHub, tiers committed/possible/placeholder/demo). Son solo datos y nunca se ejecutan ni se envían por la red.

Los tests del analyzer cubren clasificación, manifests, lockfiles, frameworks, tooling, CI, metrics, findings, recomendaciones, relaciones de evidencia, entrada malformada, paths de entrada inseguros, redacción de secretos, calibración de tiers de AN-SEC-003, exclusión de expresiones de GitHub Actions, extracción de imports, límites, determinismo y una comprobación acotada de rendimiento.

## Trabajo diferido

Esta fase no implementa análisis AST, resolución completa de módulos, análisis completo de dependencias circulares, escaneo de vulnerabilidades, SAST, puntuación, SQLite, orquestación de jobs, endpoints de API, pantallas de reporte en el frontend ni evaluación de AI. Esas funcionalidades requieren validación y contratos separados en fases posteriores.
