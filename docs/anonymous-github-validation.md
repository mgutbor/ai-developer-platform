# Validación anónima de GitHub — resultados consolidados

> Documento de **evidencia de producto**, no una nueva fase ni una propuesta de implementación.
> Registra el experimento de validación anónima del MVP v1.0.0 (acceso a GitHub sin `GITHUB_TOKEN`),
> cerrado deliberadamente sin esperar resets de cuota.

## 1. Objetivo del experimento

Responder empíricamente a la pregunta de producto:

> ¿Puede un desarrollador introducir la URL de un repositorio público de GitHub en ai-developer-platform,
> sin configurar credenciales, y obtener un informe útil?

El experimento se ejecutó contra la release **v1.0.0** publicada, con el producto sin modificar y sin token
(`env -u GITHUB_TOKEN -u GH_TOKEN`), a través del flujo HTTP/producto real (servidor Fastify + pipeline real).

## 2. Evidencia observada

| Repositorio | Tamaño aprox. | Job status | Requests GitHub | Duración | Resultado |
|---|---|---|---|---|---|
| `octocat/Hello-World` | diminuto (~4 archivos) | `completed_with_limitations` | 5 | ~2 s | Report 200; coverage `insufficient`; confidence `low`; 3 findings |
| `sindresorhus/camelcase` | pequeño (7 archivos en snapshot) | `completed_with_limitations` | 13 | ~3 s | Report 200; coverage `partial`; confidence `medium`; 6 findings |
| `sindresorhus/type-fest` | pequeño-medio (cientos de archivos) | `failed` — `GITHUB_RATE_LIMITED` | 60 de 60 | ~15 s | Report 404 `RESULT_NOT_AVAILABLE`; sin hang ni fugas |
| `expressjs/express` | medio-grande | `failed` — `GITHUB_RATE_LIMITED` | 0 (cuota ya agotada) | <1 s | Report 404 `RESULT_NOT_AVAILABLE`; estado controlado |

### Detalles de las ejecuciones completadas

- **`octocat/Hello-World`** — commit `7fd1a60b01f9` (ref `master`), 1 archivo ingerido de ~4,
  métricas `total_file_count=1`, `source_file_count=0`, `test_file_count=0`; 3 findings absence-based
  (`AN-TEST-001` medium, `AN-TEST-002` low, `AN-TOOL-001` low); 3 recomendaciones; dimension scores
  `{architecture:10, maintainability:10, testing:8.5, documentation:10, dependencies:null, code_quality:9.5}`;
  limitation `tree_segmented_acquisition`; **ninguna evidencia con excerpt real** (solo `excerptHash`).
- **`sindresorhus/camelcase`** — commit `3146708d5ffc`, 7 archivos ingeridos; 6 findings
  (`AN-TEST-001`, `AN-TEST-002`, `AN-TOOL-001`, `AN-DEP-001`, `AN-CQ-002`, `AN-MAINT-001`);
  dimension scores `{architecture:10, maintainability:9, testing:8.5, documentation:10, dependencies:9, code_quality:9}`;
  2 evidencias con `location` (path `package.json`; path `test.js` línea 444) y 4 de tipo `metadata`;
  **ninguna evidencia con `redactedExcerpt`** (solo hash).

### Observaciones del entorno de prueba

- **Deduplicación/caché SQLite:** al re-ejecutar `sindresorhus/type-fest` sobre la misma base de datos,
  el servidor devolvió el job ya existente (mismo `analysis-job` id y estado fallido) en lugar de crear
  uno nuevo. Tras eliminar la base de datos, la ejecución volvió a consumir la cuota completa.
  Esto es **comportamiento del entorno de prueba (persistencia local), no un defecto del producto**:
  cada arranque limpio del servidor crea jobs nuevos.

## 3. Interpretación

1. **El MVP puede analizar repositorios públicos sin credenciales** cuando el análisis cabe dentro de
   la cuota anónima disponible (~60 requests/hora por IP). Lo demostraron `Hello-World` (5 requests)
   y `camelcase` (13 requests), ambos con reportes completos y coherentes.
2. **La cuota anónima de GitHub es la limitación operativa dominante del modo sin token.** El pipeline
   con `maxFileCount=50` necesita más de 60 requests para repositorios con árboles medianos:
   `type-fest` agotó las 60 requests disponibles y terminó en `GITHUB_RATE_LIMITED` sin reporte.
3. **El producto responde de forma controlada a la limitación:** el job pasa a `failed` con
   `errorCode=GITHUB_RATE_LIMITED`, queda persistido, el report devuelve `RESULT_NOT_AVAILABLE`,
   no hay hang ni fuga de credenciales. El fallo ocurre antes de que exista un snapshot utilizable.
4. **La deduplicación de SQLite** observada es un artefacto del entorno de prueba (misma base de datos
   entre ejecuciones), no un defecto.

## 4. Limitaciones

- **La conclusión NO es "el producto funciona para cualquier repositorio público sin token".**
- Sin credenciales, solo los repositorios diminutos/pequeños con pocos requests de ingestión
  completan de forma fiable dentro de una ventana de cuota.
- La cobertura de los análisis completados fue **parcial o insuficiente** (`partial`/`insufficient`),
  incluso para repositorios diminutos: `Hello-World` ingirió 1 de ~4 archivos.
- Todos los findings de las ejecuciones completadas fueron **absence-based** y su evidencia se limita
  a un `excerptHash` (sin contenido redactado visible): el usuario puede saber *qué métrica* disparó
  el finding, pero no ver el fragmento que lo respalda.
- Con cuota agotada, la espera entre resets (~1 hora) hace inviable el uso interactivo sin token para
  repositorios que requieren más requests; por eso el experimento se cerró sin continuar esperando.

## 5. Conclusiones de producto

Respondiendo a las preguntas de evaluación:

1. **¿Qué puede obtener realmente un desarrollador con `ai-developer-platform`?**
   Un reporte determinista con dimension scores, findings, recomendaciones, coverage y limitations
   para repositorios cuyo análisis cabe en la cuota disponible. El valor real se observa en repositorios
   pequeños; para repositorios grandes o cuando la cuota anónima se agota, el resultado es un estado de
   error controlado y honesto, no un informe.

2. **¿Qué funciona sin `GITHUB_TOKEN`?**
   Todo el flujo: URL → job → GitHub API anónima → ingestion → analyzer → scoring → persistencia →
   report. Funciona end-to-end mientras GitHub permita las requests necesarias (cuota anónima de 60/h).
   Los repositorios diminutos se analizan en segundos sin credenciales.

3. **¿Cuándo aparece la limitación de GitHub?**
   Cuando la ingestión necesita más requests de las que quedan en la ventana horaria de la IP.
   Con `maxFileCount=50` esto ocurre incluso con repositorios pequeños-medios (`type-fest` necesitó >60).
   También aparece cuando otra actividad de la IP ya ha consumido la cuota compartida.

4. **¿Qué aporta utilizar `GITHUB_TOKEN`?**
   Una cuota mucho mayor (~5.000 requests/hora con autenticación), lo que permite completar la ingestión
   de repositorios medianos y grandes y evita el `GITHUB_RATE_LIMITED` como causa de fallo habitual.
   El token es server-side, se lee solo de variables de entorno y nunca se expone al frontend ni se
   persiste en resultados.

5. **¿Qué limitaciones siguen existiendo incluso con autenticación?**
   La cobertura sigue siendo **parcial/insuficiente** para repositorios grandes por diseño
   (ingestion acotada: `maxFileCount=50`, `maxApiRequests=125`, `SNAPSHOT_LIMIT_EXCEEDED` para árboles
   muy grandes como `react/react` o `angular/angular`). Los findings absence-based y la evidencia con
   solo hash (sin excerpt visible) son limitaciones independientes de la autenticación. No existe
   validación de precisión/recall (Phase 22: sample insuficiente).

6. **¿Qué debería probarse en una futura evolución del producto?**
   - Comunicación de la cobertura en la UI ya implementada en Phase 24 (banner de cobertura y
     limitaciones en lenguaje claro) — validar su efecto en usuarios reales.
   - Evolución de la evidencia para incluir excerpt redactado (no solo hash) en findings de archivo.
   - Separar "no detectado" (absence en snapshot completo) de "no inspeccionado" (absence en snapshot
     parcial) en la semántica de findings absence-based.
   - Ingestion adaptativa para repositorios grandes (evaluación de Phase 21 como base, no como promesa).
   - Validación de valor con desarrolladores reales sobre sus propios repositorios.

## 6. Cuidado con los claims

Cualquier afirmación de "análisis completo", "precisión", "calidad del código" o "coverage" debe
matizarse cuando la ingestión sea parcial o insuficiente:

- Un reporte con coverage `insufficient`/`partial` **no es** una evaluación exhaustiva del repositorio.
- Un finding absence-based ("no se detectaron tests") **no prueba** que el repositorio no tenga tests;
  prueba que no se detectaron en la porción del snapshot inspeccionada.
- Las dimension scores se acompañan de confidence y limitations por dimensión; los scores nulos
  (`dependencies:null`) indican señales insuficientes, no un cero.

## 7. Trabajo futuro (no iniciado)

- Validación con desarrolladores reales sobre repositorios propios (fuera del alcance del MVP).
- Mejora de evidencia con excerpt redactado (candidata a fase posterior, no implementada).
- Semántica absence-based con estado "no inspeccionado" (candidata a fase posterior, no implementada).
- Ninguna de estas ideas se implementó; este documento solo las registra como evaluación.

---

*Estado: experimento cerrado deliberadamente sin esperar resets de cuota. Evidencia consolidada:
2 análisis completados (`Hello-World`, `camelcase`), 2 fallos controlados por cuota (`type-fest`, `express`),
0 cambios de código de producto.*
