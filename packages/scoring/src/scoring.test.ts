import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyze,
  cleanTypeScriptFixture,
  malformedAndPartialFixture,
} from '@ai-developer-platform/analyzer';
import { scoreAnalysis } from './index.js';

test('preserves inspected scope through scoring', () => {
  const fixture = cleanTypeScriptFixture();
  const analyzed = analyze({
    ...fixture,
    inspectedScope: { fileCount: 4, treeEntriesSeen: 40, totalBytes: 12000 },
  });
  const result = scoreAnalysis(analyzed);

  assert.deepEqual(result.inspectedScope, {
    fileCount: 4,
    treeEntriesSeen: 40,
    totalBytes: 12000,
  });
});

test('calculates reproducible nullable dimension scores without a global score', () => {
  const analyzed = analyze(cleanTypeScriptFixture());
  const first = scoreAnalysis(analyzed);
  const second = scoreAnalysis(analyzed);

  assert.deepEqual(first, second);
  assert.equal(first.dimensionScores.length, 6);
  assert.equal(
    first.dimensionScores.every((score) => score.score !== null),
    true,
  );
  assert.equal(
    first.limitations.includes('Global score is intentionally not calculated in the MVP.'),
    true,
  );
  assert.equal('score' in first, false);
});

test('keeps dimensions nullable when deterministic signals are insufficient', () => {
  const result = scoreAnalysis(analyze(malformedAndPartialFixture()));
  const dependencies = result.dimensionScores.find((score) => score.dimension === 'dependencies');

  assert.ok(dependencies);
  assert.equal(dependencies.score, null);
  assert.equal(dependencies.coverage, 'insufficient');
});

test('keeps scores honest when the snapshot coverage is partial', () => {
  const result = scoreAnalysis(analyze(malformedAndPartialFixture()));
  const architecture = result.dimensionScores.find((score) => score.dimension === 'architecture');

  assert.ok(architecture);
  assert.equal(architecture.coverage, 'partial');
  assert.equal(
    architecture.limitations.some((limitation) => limitation.includes('partial')),
    true,
  );
});
