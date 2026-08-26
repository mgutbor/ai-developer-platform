# Arquitectura de IA

## Estado de Phase 8

La interpretación AI es opcional y está separada del report determinista:

```text
AnalysisResult determinista
        ├── report determinista
        └── AIContext → AIProvider → interpretación validada
```

La IA no modifica facts, metrics, evidence, findings, recommendations ni dimension scores. Si no hay provider, falla o devuelve JSON inválido, el report determinista continúa disponible.

## Package y provider

`packages/ai` contiene:

- `AIContext` builder determinista y acotado;
- prompt versionado (`1.0.0`);
- `AIProvider` intercambiable;
- `FakeAIProvider` para tests;
- `OpenAIProvider` basado en `fetch` nativo, sin SDK adicional;
- validación de structured output y referencias.

La selección inicial de OpenAI se debe a su soporte de structured JSON output y a que el MVP puede usar HTTP nativo sin añadir una dependencia de SDK. No se crean cuentas ni credenciales automáticamente.

Configuración prevista para el adapter real:

```text
AI_PROVIDER=openai
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=<server-side secret>
AI_MODEL=<configured model>
```

Las API keys permanecen únicamente en el servidor. Nunca se exponen al frontend, logs o SQLite.

## Contexto

El contexto incluye repository, commit SHA, versiones, coverage, confidence, dimension scores, findings, evidence minimizada, recommendations y limitations. No incluye blobs, secretos, SQLite, datos de infraestructura ni prompts persistidos.

El contexto ordena de forma estable y limita el número de findings, evidence y recommendations. Si se reduce, añade una limitation explícita.

## Structured output

La respuesta debe contener summary, key insights, priorities, limitations y evidence references. Todas las referencias se validan contra el `AnalysisResult` original:

- finding IDs deben existir;
- evidence IDs deben existir;
- recommendation IDs deben existir;
- no se aceptan paths o rangos nuevos;
- no se aceptan scores ni findings nuevos.

## Prompt injection

El contenido del repository se introduce únicamente dentro de una sección de datos delimitada. El system prompt indica que ese contenido es untrusted data y nunca instrucciones. La salida se trata como no confiable y se valida antes de persistirla.

## API y frontend

- `POST /analyses/:id/ai`: solicita/genera interpretación opcional.
- `GET /analyses/:id/ai`: recupera el estado o `unavailable`.

El report Angular muestra una sección separada y etiquetada como AI-assisted interpretation. Usa interpolación de texto, no `innerHTML`.

## Persistencia y fallos

La tabla `ai_interpretations` guarda metadata, estado y la interpretación estructurada serializada. No guarda blobs ni prompts completos. `generatedAt` es metadata operacional; no forma parte del resultado determinista.

Estados:

- `completed`: interpretación validada disponible;
- `failed`: provider o respuesta no válida;
- `unavailable`: provider no configurado o rate-limited.

Ninguno cambia el estado del `AnalysisJob` determinista.

## Live validation

La validación live del provider queda omitida si no existe configuración segura y credenciales proporcionadas por el usuario. Los tests usan `FakeAIProvider`; no hay credenciales en el repository ni en CI.

RAG, embeddings, agents, streaming, chat, multi-provider orchestration y AI scoring permanecen fuera de alcance.
