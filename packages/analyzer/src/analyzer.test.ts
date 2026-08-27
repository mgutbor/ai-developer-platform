import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyze,
  analyzeImports,
  angularFixture,
  cleanTypeScriptFixture,
  classifyFile,
  getAnalyzerLimits,
  javascriptFixture,
  malformedAndPartialFixture,
  poorTypeScriptFixture,
  securityCalibrationFixture,
  securityFixture,
} from './index.js';
import type { AnalyzerFile } from './types.js';

function resultByName<T extends { readonly name: string }>(items: readonly T[], name: string): T {
  const item = items.find((candidate) => candidate.name === name);
  assert.ok(item, `expected item ${name}`);
  return item;
}

function factByKey(result: ReturnType<typeof analyze>, key: string) {
  const fact = result.facts.find((candidate) => candidate.key === key);
  assert.ok(fact, `expected fact ${key}`);
  return fact;
}

test('classifies source, tests, metadata, configuration, CI, and generated files', () => {
  const base: AnalyzerFile = {
    content: '',
    path: 'src/app.ts',
    sha: 'a'.repeat(40),
    size: 0,
    snapshotId: 'snapshot:test',
  };
  assert.equal(classifyFile(base).classification, 'source');
  assert.equal(classifyFile({ ...base, path: 'src/app.test.ts' }).classification, 'test');
  assert.equal(
    classifyFile({ ...base, path: 'package.json' }).classification,
    'dependency_metadata',
  );
  assert.equal(classifyFile({ ...base, path: 'tsconfig.json' }).classification, 'config');
  assert.equal(classifyFile({ ...base, path: '.github/workflows/ci.yml' }).classification, 'ci');
  assert.equal(classifyFile({ ...base, path: 'dist/app.min.js' }).classification, 'generated');
});

test('analyzes a clean TypeScript fixture into traceable deterministic output', () => {
  const input = cleanTypeScriptFixture();
  const result = analyze(input);

  assert.equal(result.snapshot.commitSha, '1111111111111111111111111111111111111111');
  assert.equal(result.coverage, 'complete');
  assert.equal(result.confidence, 'high');
  assert.equal(result.dimensionScores.length, 0);
  assert.equal(factByKey(result, 'package_json_present').status, 'observed');
  assert.deepEqual(factByKey(result, 'package_manager').value, ['pnpm@10.0.0']);
  assert.deepEqual(factByKey(result, 'test_tooling').value, ['vitest']);
  assert.deepEqual(factByKey(result, 'framework_detected').value, ['node.js']);
  assert.deepEqual(factByKey(result, 'ci_capabilities').value, [
    'build',
    'ci',
    'lint',
    'test',
    'typecheck',
  ]);
  assert.equal(factByKey(result, 'typescript_strict').value, true);
  assert.equal(result.findings.length, 0);
  assert.equal(result.recommendations.length, 0);

  assert.equal(resultByName(result.metrics, 'typescript_file_count').value, 3);
  assert.equal(resultByName(result.metrics, 'test_file_count').value, 1);
  assert.equal(resultByName(result.metrics, 'direct_dependency_count').value, 1);
  assert.equal(resultByName(result.metrics, 'dev_dependency_count').value, 4);
  assert.equal(resultByName(result.metrics, 'test_source_ratio').value, 1 / 2);
  assert.equal(result.evidence.length, 0);
});

test('produces evidence-backed findings and linked recommendations for a poor fixture', () => {
  const result = analyze(poorTypeScriptFixture());
  const findingTitles = result.findings.map((finding) => finding.title);

  assert.ok(findingTitles.includes('README was not detected'));
  assert.ok(findingTitles.includes('Test files were not detected'));
  assert.ok(findingTitles.includes('A relative import could not be resolved statically'));
  assert.ok(findingTitles.includes('TypeScript ignore directives were detected'));
  assert.ok(findingTitles.includes('Lint configuration was not detected'));
  assert.ok(result.findings.length > 0);
  assert.equal(result.findings.length, result.evidence.length);
  assert.equal(result.findings.length, result.recommendations.length);
  for (const finding of result.findings) {
    assert.ok(finding.evidenceIds.length > 0);
    assert.ok(finding.recommendationIds.length > 0);
    assert.equal(finding.source, 'deterministic');
    assert.ok(finding.ruleId);
    assert.ok(finding.ruleVersion);
  }
  for (const evidence of result.evidence) {
    assert.equal(evidence.snapshotId, result.snapshot.id);
    assert.ok(evidence.excerptHash || evidence.redactedExcerpt);
    assert.ok(!evidence.redactedExcerpt?.includes('ghp_'));
  }
});

test('detects JavaScript and React signals without deep framework claims', () => {
  const result = analyze(javascriptFixture());
  assert.equal(factByKey(result, 'javascript_file_count').value, 3);
  assert.deepEqual(factByKey(result, 'framework_detected').value, ['node.js', 'react']);
  assert.equal(factByKey(result, 'test_file_count').value, 1);
  assert.equal(factByKey(result, 'test_tooling').status, 'not_detected');
  assert.equal(resultByName(result.metrics, 'import_count').value, 2);
});

test('detects Angular, tooling, and superficial framework signals', () => {
  const result = analyze(angularFixture());
  assert.deepEqual(factByKey(result, 'framework_detected').value, ['angular', 'node.js']);
  assert.equal(factByKey(result, 'typescript_config_present').status, 'not_detected');
  assert.equal(factByKey(result, 'test_file_count').value, 0);
});

test('represents malformed and partial input explicitly without crashing', () => {
  const result = analyze(malformedAndPartialFixture());
  assert.equal(result.coverage, 'partial');
  assert.ok(result.limitations.includes('tree_truncated'));
  assert.ok(result.limitations.includes('invalid_input_files_excluded'));
  assert.equal(result.facts.length > 0, true);
  assert.equal(factByKey(result, 'package_json_present').status, 'not_detected');
  assert.equal(factByKey(result, 'dependency_count').status, 'insufficient_data');
  assert.equal(resultByName(result.metrics, 'test_source_ratio').status, 'observed');
});

test('ignores GitHub Actions secret expressions as AN-SEC-003 signals', () => {
  const result = analyze(
    securityCalibrationFixture([
      [
        '.github/workflows/ci.yml',
        "jobs:\n  build:\n    env:\n      TOKEN: '${{ secrets.GITHUB_TOKEN }}'\n",
      ],
      [
        'src/config.ts',
        "export const token = '${{ github.token }}';\nexport const key = '${{ env.API_KEY }}';\nexport const vars = '${{ vars.DEPLOY_KEY }}';\n",
      ],
    ]),
  );
  assert.equal(
    result.findings.some((finding) => finding.ruleId === 'AN-SEC-003'),
    false,
  );
});

test('classifies secret-like patterns by severity tier and file context', () => {
  const result = analyze(
    securityCalibrationFixture([
      ['src/real.ts', "export const token = 'ghp_123456789012345678901234567890';\n"],
      ['src/possible.ts', "export const apiKey = 'some-plausible-value-1234567890';\n"],
      ['src/placeholder.ts', "export const secret = 'your-api-key-here-1234567890';\n"],
      ['examples/auth/index.js', "const token = 'shhhh, very secret';\n"],
    ]),
  );
  const evidencePathByFindingId = new Map(
    result.findings
      .filter((finding) => finding.ruleId === 'AN-SEC-003')
      .map((finding) => {
        const evidence = result.evidence.find((item) => finding.evidenceIds.includes(item.id));
        return [finding.id, evidence?.location?.path];
      }),
  );
  const severityByPath = (path: string): string | undefined => {
    const finding = result.findings.find(
      (candidate) =>
        candidate.ruleId === 'AN-SEC-003' && evidencePathByFindingId.get(candidate.id) === path,
    );
    return finding?.severity;
  };
  const confidenceByPath = (path: string): string | undefined => {
    const finding = result.findings.find(
      (candidate) =>
        candidate.ruleId === 'AN-SEC-003' && evidencePathByFindingId.get(candidate.id) === path,
    );
    return finding?.confidence;
  };
  assert.equal(severityByPath('src/real.ts'), 'high');
  assert.equal(confidenceByPath('src/real.ts'), 'high');
  assert.equal(severityByPath('src/possible.ts'), 'medium');
  assert.equal(confidenceByPath('src/possible.ts'), 'medium');
  assert.equal(severityByPath('src/placeholder.ts'), 'low');
  assert.equal(confidenceByPath('src/placeholder.ts'), 'low');
  assert.equal(severityByPath('examples/auth/index.js'), 'low');
  assert.equal(confidenceByPath('examples/auth/index.js'), 'low');
  for (const evidence of result.evidence) {
    assert.ok(!JSON.stringify(evidence).includes('ghp_123456789012345678901234567890'));
  }
});

test('downgrades AN-TEST-001 to low when test tooling is detected but test files are excluded from the snapshot', () => {
  const result = analyze(
    securityCalibrationFixture([
      ['package.json', `${JSON.stringify({ devDependencies: { jest: '^29.0.0' } })}\n`],
      ['src/index.ts', 'export const value = 1;\n'],
    ]),
  );
  const testFinding = result.findings.find((finding) => finding.ruleId === 'AN-TEST-001');
  assert.ok(testFinding, 'AN-TEST-001 should fire');
  assert.equal(testFinding.severity, 'low');
  assert.ok(
    testFinding.title.includes('bounded snapshot'),
    `expected bounded snapshot title, got: ${testFinding.title}`,
  );
});

test('does not fire AN-DEP-001 when the lockfile exists but exceeds the byte limit', () => {
  const result = analyze(
    securityCalibrationFixture(
      [
        ['package.json', `${JSON.stringify({ name: 'test' })}\n`],
        ['pnpm-lock.yaml', 'lockfile: "9.0"\n'.repeat(200)],
        ['src/index.ts', 'export const value = 1;\n'],
      ],
      ['file_too_large:pnpm-lock.yaml'],
    ),
  );
  const lockfileFinding = result.findings.find((finding) => finding.ruleId === 'AN-DEP-001');
  assert.equal(
    lockfileFinding,
    undefined,
    'AN-DEP-001 should not fire when lockfile is excluded by size',
  );
});

test('AN-ARCH-002 reports medium confidence for heuristic resolution', () => {
  const result = analyze(poorTypeScriptFixture());
  const archFinding = result.findings.find((finding) => finding.ruleId === 'AN-ARCH-002');
  if (archFinding) {
    assert.equal(archFinding.confidence, 'medium');
  }
});

test('detects Angular from root metadata even when the snapshot is bounded', () => {
  const result = analyze(
    securityCalibrationFixture([
      ['angular.json', '{}\n'],
      ['package.json', `${JSON.stringify({ dependencies: { '@angular/core': '^22.0.0' } })}\n`],
      ['src/main.ts', 'export const value = 1;\n'],
    ]),
  );
  assert.deepEqual(factByKey(result, 'framework_detected').value, ['angular', 'node.js']);
});

test('does not persist sensitive source content in evidence', () => {
  const result = analyze(securityFixture());
  const secretFinding = result.findings.find((finding) => finding.title.includes('secret'));
  assert.ok(secretFinding);
  const evidence = result.evidence.find((item) => secretFinding.evidenceIds.includes(item.id));
  assert.ok(evidence);
  assert.equal(evidence.redactedExcerpt, null);
  assert.ok(evidence.excerptHash);
  assert.ok(!JSON.stringify(result).includes('ghp_123456789012345678901234567890'));
  assert.ok(result.limitations.includes('malformed_package_json'));
});

test('is deterministic for identical snapshot and analyzer versions', () => {
  const input = cleanTypeScriptFixture();
  const first = analyze(input);
  const second = analyze(input);
  assert.deepEqual(second, first);
});

test('applies analyzer limits and validates options', () => {
  assert.deepEqual(getAnalyzerLimits({ maxImportCount: 3 }), {
    maxImportCount: 3,
    maxSourceFileLines: 400,
    maxTodoCount: 10,
  });
  assert.throws(() => analyze(cleanTypeScriptFixture(), { maxImportCount: 0 }), TypeError);
  assert.throws(() => analyze(cleanTypeScriptFixture(), { analyzerVersion: ' ' }), TypeError);

  const result = analyze(poorTypeScriptFixture(), { maxImportCount: 1 });
  assert.ok(result.limitations.includes('import_count_limit_reached'));
});

test('extracts imports without executing repository content', () => {
  const input = javascriptFixture();
  const imports = analyzeImports(input.files);
  assert.deepEqual(
    imports.map((reference) => [reference.sourcePath, reference.path, reference.kind]),
    [
      ['src/index.js', './util', 'relative'],
      ['test/index.test.js', 'node:assert', 'external'],
    ],
  );
});

test('provides a small performance baseline for a bounded in-memory snapshot', () => {
  const input = cleanTypeScriptFixture();
  const extraFiles: AnalyzerFile[] = Array.from({ length: 100 }, (_, index) => {
    const content = `export const value${index} = ${index};\\n`;
    return {
      content,
      path: `src/module-${index}.ts`,
      sha: String(index).padStart(40, '0'),
      size: new TextEncoder().encode(content).byteLength,
      snapshotId: input.snapshot.id,
    };
  });
  const startedAt = performance.now();
  const result = analyze({ ...input, files: [...input.files, ...extraFiles] });
  const elapsedMs = performance.now() - startedAt;

  assert.equal(resultByName(result.metrics, 'total_file_count').value, 111);
  assert.equal(resultByName(result.metrics, 'source_file_count').value, 102);
  assert.equal(Number.isFinite(elapsedMs), true);
});
