import { createRepositorySnapshot, type RepositorySnapshot } from '@ai-developer-platform/domain';
import type { AnalyzerFile, AnalyzerInput } from './types.js';

const cleanSha = '1111111111111111111111111111111111111111';
const poorSha = '2222222222222222222222222222222222222222';
const securitySha = '3333333333333333333333333333333333333333';

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function snapshot(name: string, commitSha: string): RepositorySnapshot {
  return createRepositorySnapshot({
    commitSha,
    createdAt: '2026-01-01T00:00:00.000Z',
    name,
    owner: 'fixture-owner',
    ref: 'main',
    repositoryUrl: `https://github.com/fixture-owner/${name}`,
  });
}

function file(snapshotId: string, path: string, content: string): AnalyzerFile {
  return Object.freeze({
    content,
    path,
    sha: path
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase()
      .padEnd(40, 'a')
      .slice(0, 40),
    size: utf8ByteLength(content),
    snapshotId,
  });
}

function input(
  repositorySnapshot: RepositorySnapshot,
  files: readonly (readonly [string, string])[],
  limitations: readonly string[] = [],
): AnalyzerInput {
  return Object.freeze({
    files: Object.freeze(
      files.map(([path, content]) => file(repositorySnapshot.id, path, content)),
    ),
    limitations: Object.freeze(limitations),
    snapshot: repositorySnapshot,
  });
}

export function cleanTypeScriptFixture(): AnalyzerInput {
  const repositorySnapshot = snapshot('clean-typescript', cleanSha);
  return input(repositorySnapshot, [
    ['README.md', '# Clean TypeScript\n'],
    [
      'package.json',
      `${JSON.stringify({
        dependencies: { typescript: '^5.0.0' },
        devDependencies: {
          '@types/node': '^24.0.0',
          eslint: '^9.0.0',
          prettier: '^3.0.0',
          vitest: '^3.0.0',
        },
        engines: { node: '>=24' },
        packageManager: 'pnpm@10.0.0',
        scripts: { format: 'prettier --check .', lint: 'eslint .', test: 'vitest run' },
      })}\n`,
    ],
    ['pnpm-lock.yaml', 'lockfileVersion: 9.0\n'],
    [
      'tsconfig.json',
      `${JSON.stringify({ compilerOptions: { noUncheckedIndexedAccess: true, strict: true } })}\n`,
    ],
    ['eslint.config.mjs', 'export default [];\n'],
    ['prettier.config.mjs', 'export default {};\n'],
    [
      '.github/workflows/ci.yml',
      'jobs:\n  test:\n    steps:\n      - run: pnpm lint\n      - run: pnpm test\n      - run: pnpm build\n      - run: pnpm typecheck\n',
    ],
    ['src/main.ts', "import { helper } from './helper.js';\nexport const main = helper();\n"],
    ['src/helper.ts', "export function helper(): string {\n  return 'ok';\n}\n"],
    [
      'src/main.test.ts',
      "import { describe } from 'vitest';\ndescribe('main', () => undefined);\n",
    ],
    ['docs/architecture.md', '# Architecture\n'],
  ]);
}

export function poorTypeScriptFixture(): AnalyzerInput {
  const repositorySnapshot = snapshot('poor-typescript', poorSha);
  return input(repositorySnapshot, [
    [
      'src/main.ts',
      "// TODO: split this module\n// FIXME: add tests\nconsole.log('debug');\nexport const value: any = 1;\n// @ts-ignore\nexport const ignored = value;\n",
    ],
    ['src/missing.ts', "import './does-not-exist';\n"],
  ]);
}

export function javascriptFixture(): AnalyzerInput {
  const repositorySnapshot = snapshot(
    'javascript-project',
    '4444444444444444444444444444444444444444',
  );
  return input(repositorySnapshot, [
    ['README.txt', 'JavaScript project\n'],
    [
      'package.json',
      `${JSON.stringify({ dependencies: { react: '^19.0.0' }, scripts: { test: 'node test.js' } })}\n`,
    ],
    ['src/index.js', "const util = require('./util');\nmodule.exports = util;\n"],
    ['src/util.js', 'module.exports = () => true;\n'],
    ['test/index.test.js', "const assert = require('node:assert');\n"],
  ]);
}

export function angularFixture(): AnalyzerInput {
  const repositorySnapshot = snapshot(
    'angular-project',
    '5555555555555555555555555555555555555555',
  );
  return input(repositorySnapshot, [
    ['angular.json', '{}\n'],
    [
      'package.json',
      `${JSON.stringify({
        dependencies: { '@angular/core': '^22.0.0' },
        devDependencies: { '@angular/cli': '^22.0.0' },
      })}\n`,
    ],
    ['src/app.component.ts', 'export class AppComponent {}\n'],
  ]);
}

export function securityFixture(): AnalyzerInput {
  const repositorySnapshot = snapshot('security-signal-project', securitySha);
  return input(
    repositorySnapshot,
    [
      ['README.md', '# Security fixture\n'],
      ['src/config.ts', "export const token = 'ghp_123456789012345678901234567890';\n"],
      ['.env.example', 'TOKEN=example\n'],
      ['credentials/config.json', '{}\n'],
      ['package.json', '{ malformed\n'],
      ['tsconfig.json', '{ malformed\n'],
    ],
    ['tree_truncated'],
  );
}

export function securityCalibrationFixture(
  files: readonly (readonly [string, string])[],
  limitations: readonly string[] = [],
): AnalyzerInput {
  const repositorySnapshot = snapshot(
    'security-calibration',
    '7777777777777777777777777777777777777777',
  );
  return input(repositorySnapshot, files, limitations);
}

export function malformedAndPartialFixture(): AnalyzerInput {
  const repositorySnapshot = snapshot(
    'partial-project',
    '6666666666666666666666666666666666666666',
  );
  return input(
    repositorySnapshot,
    [
      ['src/main.ts', 'export const value = 1;\n'],
      ['../outside.ts', 'export const escaped = true;\n'],
      ['wrong-snapshot.ts', 'export const ignored = true;\n'],
    ],
    ['tree_truncated'],
  );
}
