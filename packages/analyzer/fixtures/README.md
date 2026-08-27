# Fixtures del analyzer

El analyzer determinista utiliza pequeños fixtures en memoria declarados en `src/fixtures.ts`.

El conjunto de fixtures cubre:

- TypeScript limpio con tests, documentación, tooling, lockfile y CI;
- JavaScript sin tests;
- señales de frameworks Angular y React;
- ausencia de lockfile y documentación;
- señales de seguridad y calidad de código;
- manifests malformados y limitaciones de ingestión parcial.

Los fixtures son solo datos. Nunca se importan, ejecutan, instalan ni envían a ningún servicio de red.
