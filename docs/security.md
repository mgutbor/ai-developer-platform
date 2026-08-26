# Seguridad y privacidad

## Revisión de amenazas

El repository analizado es entrada no confiable y puede contener código malicioso, archivos enormes, secretos, instrucciones dirigidas al LLM, dependencias comprometidas o datos personales. La superficie incluye también la API pública, GitHub, SQLite, logs y cualquier futuro proveedor de IA.

| Riesgo | Likelihood | Impact | Mitigation | Requisito MVP | Futuro |
| --- | --- | --- | --- | --- | --- |
| SSRF | Media | Alto | `packages/github` solo acepta referencias HTTPS de `github.com`, construye endpoints fijos de `api.github.com` y usa redirects=`error` | implementado en Phase 3 | ampliar allowlist solo con threat model |
| Prompt injection | Alta | Alto | contenido delimitado como datos, system prompt explícito, contexto estructurado y validación estricta de referencias | implementado en Phase 8 | ampliar evaluación con más modelos |
| Malicious repository | Alta | Alto | nunca ejecutar contenido ni scripts; leer solo blobs seleccionados y tratar el contenido como datos | implementado en Phase 3 | sandbox solo mediante ADR nuevo |
| Secrets | Media | Alto | detectar/redactar patrones, excluir `.env` y private keys, no loggear contenido | obligatorio | secret scanning más amplio |
| API abuse | Media | Alto | validación, límites de payload, idempotency y rate limit in-memory del endpoint AI | parcial para MVP local; endurecer antes de exposición pública | identidad, cuotas y rate limit distribuido |
| GitHub rate limits | Alta | Medio | límite de requests por cliente, retry máximo de una vez y categoría `rate_limited` sin exponer cuerpos | implementado en Phase 3 | app authentication si procede |
| Denial of service | Media | Alto | límites de archivos, bytes, tree, requests, respuestas JSON y timeout de request/ingestión | implementado en Phase 3 | worker aislado y cuotas |
| Huge repositories | Alta | Medio/Alto | tree cap, file cap, byte cap y report limitado | obligatorio | procesamiento por shards |
| Zip/archive bombs | Baja en el MVP | Alto | no usar archives como transporte inicial ni descomprimir entradas no confiables | evitado por diseño | sandbox y extracción limitada si cambia transporte |
| Path traversal | Media | Alto | paths relativos normalizados, rechazo de `..`, rutas absolutas, separadores ambiguos y acceso local inexistente | implementado en Phase 3 | tests fuzzing adicionales |
| Symlinks | Media | Alto | no seguir destinos fuera del snapshot; preferiblemente excluirlos | obligatorio | política específica por adapter |
| Malicious filenames | Media | Medio | no usar nombres como comandos, logs estructurados y encoding seguro | obligatorio | fuzzing |
| Sensitive data to LLM | No aplica al vertical slice; alta después | Alto | IA desactivada inicialmente, minimización y redacción antes de transferir | no aplica todavía | consentimiento y política de provider |

## Regla crítica: no ejecutar código

La plataforma solo debe leer y parsear bytes dentro de límites definidos. No debe ejecutar scripts, hooks, tests, builds, package managers, binarios, containers ni herramientas declaradas por el repository. El analyzer inicial usa parsing propio y reglas sobre contenido recibido.

## GitHub MVP

- Solo repositories públicos.
- GitHub REST como único origen externo.
- Validar owner/name, branch y commit SHA.
- Rechazar esquemas distintos de HTTP(S), hosts no permitidos y redirecciones fuera de GitHub.
- Fijar el análisis a un commit.
- Obtener tree y blobs textuales dentro de límites.
- Excluir binarios, archivos generados, `node_modules`, secretos y contenidos fuera del alcance.
- Respetar rate limits y abortar de forma controlada.

## Secrets y logs

- No persistir tokens ni API keys en SQLite.
- La ingesta excluye nombres de credentials, private keys, `.env`, `.npmrc` y `.netrc`. El analyzer puede detectar patrones de contenido en archivos recibidos y conserva únicamente hashes en la evidence; no persiste secretos completos.
- No incluir contenido completo del repository en logs, errores ni analytics.
- No registrar URLs con credenciales ni stack traces al cliente.
- La IA recibe únicamente un `AIContext` limitado con metadata, findings y evidence minimizada; no recibe blobs completos ni secretos.
- Las respuestas AI se validan contra IDs del report antes de persistirse; no pueden introducir paths, rangos, findings ni scores nuevos.
- El provider OpenAI restringe host/protocolo y tamaño de respuesta; el endpoint AI aplica límite in-memory por analysis.

## API y abuso

La futura API debe validar input, imponer límites de payload y tamaño, aplicar rate limiting por IP, usar idempotency key para evitar jobs duplicados y devolver errores públicos seguros. CORS, headers de seguridad y CSRF se decidirán según el mecanismo de sesión elegido.

## Privacidad y retención MVP

Guardar solo request normalizada, repository, commit SHA, estado, facts, metrics, findings, evidence references, recommendations y score. SQLite tendrá una retención corta, inicialmente 24 horas, con limpieza explícita. No se guardarán blobs completos ni contexto AI por defecto.

Repositories privados requerirán consentimiento, gestión segura de tokens, política de proveedor, retención y transferencia de datos antes de habilitarse.
