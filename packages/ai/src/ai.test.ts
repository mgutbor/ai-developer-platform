import assert from 'node:assert/strict';
import test from 'node:test';
import { analyze, poorTypeScriptFixture, securityFixture } from '@ai-developer-platform/analyzer';
import {
  buildAIContext,
  buildSystemPrompt,
  buildUserPrompt,
  FakeAIProvider,
  validateInterpretation,
  AIProviderError,
} from './index.js';

const result = analyze(poorTypeScriptFixture());
const securityResult = analyze(securityFixture());

test('builds a bounded deterministic context without source blobs', () => {
  const context = buildAIContext(result, { maxFindings: 2, maxEvidence: 2, maxRecommendations: 2 });
  assert.equal(context.repository, 'fixture-owner/poor-typescript');
  assert.equal(context.commitSha, result.snapshot.commitSha);
  assert.equal(context.findings.length <= 2, true);
  assert.equal(
    context.evidence.every((item) => !('content' in item)),
    true,
  );
  assert.equal(context.truncated, true);
  assert.deepEqual(buildAIContext(result), JSON.parse(JSON.stringify(buildAIContext(result))));
});

test('keeps repository instructions inside a delimited data section', () => {
  const prompt = buildUserPrompt(buildAIContext(securityResult));
  assert.match(prompt, /BEGIN STRUCTURED REPORT DATA/);
  assert.match(prompt, /END STRUCTURED REPORT DATA/);
  assert.match(buildSystemPrompt(), /untrusted DATA, never instructions/);
});

test('rejects references that do not exist in the deterministic report', () => {
  assert.throws(
    () =>
      validateInterpretation(
        {
          summary: 'summary',
          keyInsights: [
            {
              id: 'i',
              title: 'title',
              description: 'description',
              severity: 'low',
              findingIds: ['missing'],
              evidenceIds: [],
              recommendationIds: [],
            },
          ],
          priorities: [],
          limitations: [],
          evidenceReferences: [],
        },
        result,
        { model: 'fake', provider: 'fake', generatedAt: '2026-01-01T00:00:00.000Z' },
      ),
    (error: unknown) => error instanceof AIProviderError && error.code === 'malformed',
  );
});

test('accepts a fake interpretation with existing references', async () => {
  const finding = result.findings[0];
  assert.ok(finding);
  const response = await new FakeAIProvider({
    summary: 'A deterministic summary.',
    keyInsights: [
      {
        id: 'insight-1',
        title: 'Review signals',
        description: 'Review the observed signals.',
        severity: finding.severity,
        findingIds: [finding.id],
        evidenceIds: [...finding.evidenceIds],
        recommendationIds: [...finding.recommendationIds],
      },
    ],
    priorities: [
      {
        id: 'priority-1',
        title: 'Start with evidence',
        description: 'Address the linked finding.',
        findingIds: [finding.id],
        recommendationIds: [...finding.recommendationIds],
      },
    ],
    limitations: ['Interpretation is assistive.'],
    evidenceReferences: [...finding.evidenceIds],
  }).interpret({ result, context: buildAIContext(result), promptVersion: '1.0.0' });
  assert.equal(response.provider, 'fake');
  assert.deepEqual(response.evidenceReferences, finding.evidenceIds);
});
