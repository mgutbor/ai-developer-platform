# Frontend

## Alcance de la Fase 6

La aplicación Angular expone ahora el primer corte vertical orientado al usuario:

```text
repository URL → POST /analyses → polling → report
```

El frontend no contiene lógica de analyzer, scoring, persistencia ni GitHub. Consume los DTO de `packages/contracts` a través de `AnalysisService`.

## Estructura

- `core/api/analysis.service.ts`: llamadas HTTP tipadas para la creación del análisis, el estado y la recuperación del reporte.
- `features/analysis/pages/home.page.*`: formulario de URL del repositorio y validación en cliente.
- `features/analysis/pages/progress.page.*`: visualización del estado y polling acotado.
- `features/analysis/pages/report.page.*`: findings, evidencia, recomendaciones, puntuaciones por dimensión y limitaciones.

## Routing

- `/`: entrada del repositorio.
- `/analyses/:id`: estado del job queued/running/terminal.
- `/analyses/:id/report`: reporte persistido cargado desde la API, por lo que el refresco del navegador está soportado.

El polling se ejecuta cada cuatro segundos con `exhaustMap`, se detiene en los estados terminales y se limpia con `takeUntilDestroyed`. WebSockets y estado global quedan deliberadamente diferidos.

## Accesibilidad y seguridad

Las páginas usan headings semánticos, labels, errores asociados, anuncios de estado, controles enfocables por teclado, estilos de foco visibles, layouts responsive e interpolación de texto. Los paths del repositorio, nombres de archivo, descripciones y hashes de evidencia se tratan como texto no confiable; la UI no usa `innerHTML`.

Los tests actuales validan el comportamiento de los componentes y las interacciones HTTP. La Fase 7 confirmó la línea base contra el flujo real de la API; esto no es una auditoría completa de WCAG 2.2 AA. El test automático con axe y el E2E a nivel de navegador siguen siendo candidatos para un endurecimiento posterior.
