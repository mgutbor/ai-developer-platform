# Phase 9 — Evaluación de AI

## Estado

La evaluación se ejecutó el 2026-08-26 con Node `v25.3.0`; el target del proyecto sigue siendo Node 24. No había credenciales de AI presentes en el entorno.

## Dataset y metodología

El dataset reproducible usa los fixtures deterministas existentes:

- TypeScript limpio;
- señales deficientes de mantenibilidad/testing/calidad de código;
- JavaScript/React;
- Angular;
- contenido tipo seguridad;
- entrada malformada y parcial;
- datos de repositorio tipo inyección de prompts;
- reportes vacíos/pequeños.

Cada caso se convierte en un `AnalysisResult`, se pasa por `buildAIContext` y se evalúa con `FakeAIProvider`. El harness verifica el determinismo del contexto, la selección acotada, la ausencia de blobs fuente, las referencias válidas, el rechazo de referencias malformadas, los delimitadores de prompt y la igualdad determinista del reporte antes/después de AI.

## Criterios

| Criterion | Result |
| --- | --- |
| frontera de factualidad | PASS para referencias validadas; la factualidad semántica requiere revisión humana |
| trazabilidad | PASS para IDs de finding/evidence/recommendation |
| protección contra alucinaciones | PASS para referencias desconocidas; las afirmaciones de texto libre requieren revisión humana |
| utilidad | REVISIÓN HUMANA REQUERIDA |
| limitaciones respetadas | PASS para las limitaciones de contexto; la interpretación semántica requiere revisión humana |
| integridad determinista | PASS; el reporte determinista no cambia |

## Resultados del proveedor fake

Medido:

- 4 tests del paquete de AI aprobados;
- 2 tests de integración de la API de AI aprobados;
- la serialización del contexto es determinista;
- las referencias de findings inválidas se rechazan;
- la interpretación fake con referencias existentes se acepta;
- el reporte determinista antes/después de AI es idéntico;
- el round-trip de persistencia y el estado no disponible están cubiertos.

El proveedor fake no demuestra que un modelo real sea útil o factualmente preciso. Solo valida el contrato de aplicación y la frontera de seguridad.

## Proveedor en vivo

```text
EVALUACIÓN EN VIVO DE AI — NO VALIDADA
```

Motivo: no había credenciales de proveedor configuradas. No se hizo ninguna request en vivo ni se inventaron credenciales.

## Latencia

Medida localmente para la vía fake:

- construcción y validación del contexto: escala sub-milisegundo a pocos milisegundos en los tests unitarios;
- vía fake de la API: por debajo de 0,2 segundos en el proceso del test de integración.

La latencia del proveedor real **NO ESTÁ VALIDADA**. El análisis determinista sigue siendo independiente de la latencia de AI porque AI se invoca mediante un endpoint separado después de que el reporte determinista exista.

## Modelo de coste

```text
MODELO DE COSTE — NO VALIDADO
```

No se midió ningún precio actual de proveedor ni uso de tokens. La implementación no reivindica un coste por análisis, por 100 análisis ni por 1.000 análisis. Una evaluación en vivo futura debe registrar el uso reportado por el proveedor sin registrar prompts ni contenido sensible.

## Modos de fallo

El contrato del proveedor clasifica:

- proveedor no disponible;
- timeout;
- rate limit;
- respuesta malformada;
- referencias estructuradas inválidas.

La aplicación registra `failed` o `unavailable` en `ai_interpretations` y deja intactos el reporte determinista y el job. Las respuestas de OpenAI están acotadas a 512 KiB y el adapter restringe las requests al host HTTPS `api.openai.com`.

## Inyección de prompts

El system prompt establece explícitamente que el contenido del repositorio son datos no confiables. El contexto de usuario está delimitado y contiene solo metadatos y referencias de reporte acotados. Los tests cubren datos tipo inyección y verifican que la aplicación no ejecuta instrucciones, no crea referencias nuevas ni modifica la salida determinista.

## Rate limiting

El endpoint de generación de AI aplica un límite en memoria de cinco requests por análisis por hora. Esto es apropiado para el MVP actual de un solo proceso, pero no es suficiente para un despliegue público multi-instancia. Un limitador distribuido queda diferido hasta que los requisitos de despliegue lo justifiquen.

## Puerta de decisión

### KEEP WITH LIMITATIONS

La capa de AI debe permanecer disponible como un experimento opcional porque:

- el reporte determinista sigue siendo autoritativo;
- la frontera está aislada;
- las referencias se validan;
- el contexto está acotado;
- el comportamiento del proveedor fake es reproducible;
- el fallo no invalida el análisis determinista.

Limitaciones:

- la calidad, latencia y coste del proveedor real no están validadas;
- la utilidad requiere revisión humana;
- el limitador de rate es local al proceso;
- no existe observabilidad del proveedor a nivel de producción;
- aún no existe un dataset de evaluación semántica automatizada.

La evidencia no justifica llamar a la funcionalidad lista para producción ni reivindicar precisión del modelo.
