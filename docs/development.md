# Guía de desarrollo

## Estado

La Fase 0.1 no instala dependencias ni define comandos ejecutables. Esta guía describe el primer stack y los gates que deberá materializar la implementación.

## Orden de implementación

1. Foundation del monorepo con Angular web y API TypeScript.
2. Contracts y entidades mínimas del dominio.
3. GitHub REST ingestion segura.
4. Analyzer determinista TypeScript/JavaScript.
5. SQLite, `AnalysisJob` y runner dentro de API.
6. Report y score determinista.
7. Flujo Angular completo.
8. Hardening, métricas, accesibilidad y validación del MVP.
9. IA solo como fase condicional posterior.

## Principios

- Mantener los cambios pequeños y orientados al vertical slice.
- Preferir tipos y contracts explícitos.
- Mantener dominio independiente de Angular, HTTP, GitHub y SQLite.
- No ejecutar código procedente del repository analizado.
- No crear packages vacíos para anticipar una arquitectura futura.
- Documentar decisiones difíciles de revertir en ADRs.
- Tratar seguridad, coste, privacidad y límites como requisitos funcionales.

## Toolchain inicial

Angular + TypeScript se utilizará para `apps/web`. La API y los packages de dominio usarán TypeScript. El package manager y las librerías concretas de API, schemas y testing se decidirán durante Foundation según soporte estable y necesidades observadas; no se instalan en esta fase.

## Contratos y versionado

Los contratos públicos se versionan ante breaking changes. Los DTOs de API no se reutilizan automáticamente como entidades internas. Findings, evidence y recommendations mantienen referencias estables dentro de un snapshot.

## Jobs y persistencia

El MVP mantiene un `AnalysisJob`, pero el runner se ejecuta dentro de la API con concurrencia limitada. SQLite es un adapter de persistencia temporal. La interfaz debe permitir extraer el runner o migrar a PostgreSQL solo cuando existan señales medibles.

## Fixtures

Los tests usarán repositories sintéticos y pequeños, sin secretos ni contenido de terceros innecesario. Deben cubrir TypeScript/JavaScript, manifests, tests, docs, CI, linting, formatting, dependencias, archivos generados, symlinks y paths maliciosos.

## Configuración y seguridad

La configuración se valida al iniciar. Los secretos no se guardan en el repository ni en SQLite. No se ejecutan scripts del snapshot y no se envía contenido a un proveedor de IA en el MVP.

## Calidad local

La implementación deberá proporcionar comandos para:

```text
install
lint
format check
typecheck
unit tests
integration tests
build
```

Los comandos reales se documentarán cuando exista package manager y toolchain.
