# Arquitectura de IA

## Decisión de alcance

La IA **no forma parte del primer vertical slice**. El producto puede demostrar valor con snapshots reproducibles, facts, métricas, findings y score determinista. Añadir IA antes de validar la calidad de esas bases dificultaría atribuir los resultados y aumentaría coste, privacidad y superficie de ataque.

La arquitectura futura debe abstraer correctamente, pero implementar solo lo necesario cuando exista una tarea semántica validada.

## Puerto mínimo futuro

Se reservará conceptualmente un puerto pequeño:

```text
AIProvider
- analyze(request, options) -> structured response
```

El puerto no se añadirá como package vacío ni obligará a implementar varios providers. En la primera fase AI se implementará un único adapter seleccionado por requisitos de privacidad, coste y disponibilidad, junto con un provider de test para pruebas. NVIDIA, OpenAI y Ollama son alternativas futuras, no entregables iniciales.

## Límites de responsabilidades

Cuando llegue la fase AI, se separarán estas responsabilidades solo si el caso lo necesita:

- orchestration: deadline, presupuesto, contexto y retries;
- prompt management: prompts versionados;
- response validation: schema y reglas de dominio;
- provider adapter: transporte y formato externo;
- analysis domain: claims, evidence, assessment y limitaciones.

No se utilizarán AI frameworks, agent frameworks, RAG, embeddings ni vector database en el alcance previsto. El pipeline es conocido, el contexto es acotado y no existe una base documental externa que recuperar.

## AI output

La IA futura producirá una `aiAssessment` separada del score determinista:

- claims o findings candidatos;
- evidence references existentes;
- rationale breve;
- confidence acotada;
- limitaciones;
- prompt/model metadata no sensible.

La respuesta tendrá structured output validado primero por schema y después por reglas de dominio. Un finding AI sin evidence existente, con location inexistente o con severidad fuera de rango se rechaza.

## Fiabilidad

- timeout por request y deadline total;
- límite de tokens y contexto;
- retries limitados solo para errores transitorios;
- fallback a resultado determinista;
- feature flag para activar/desactivar IA;
- métricas agregadas de latencia, validación y fallback;
- ninguna dependencia de un provider real en CI.

## Evolución

La decisión de incorporar IA se tomará después de que el analyzer determinista tenga fixtures, métricas de false positives y feedback de usuarios. La primera tarea candidata es interpretar relaciones arquitectónicas ya respaldadas por facts y evidence, no generar un reporte completo desde cero.
