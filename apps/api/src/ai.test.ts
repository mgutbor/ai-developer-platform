import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { analyze, cleanTypeScriptFixture } from '@ai-developer-platform/analyzer';
import { FakeAIProvider } from '@ai-developer-platform/ai';
import { SqlitePersistence } from '@ai-developer-platform/persistence';
import { scoreAnalysis } from '@ai-developer-platform/scoring';
import { AnalysisApplication } from './application.js';
import { buildApp } from './app.js';

describe('optional AI interpretation', () => {
  let app: FastifyInstance | undefined;
  let persistence: SqlitePersistence | undefined;

  afterEach(async () => {
    await app?.close();
    persistence?.close();
  });

  it('returns an AI interpretation without changing the deterministic report', async () => {
    const fixture = cleanTypeScriptFixture();
    const deterministic = scoreAnalysis(analyze(fixture));
    const finding = deterministic.findings[0];
    persistence = new SqlitePersistence();
    const provider = new FakeAIProvider({
      summary: 'The deterministic report is healthy.',
      keyInsights:
        finding === undefined
          ? []
          : [
              {
                id: 'insight-1',
                title: 'No finding',
                description: 'No deterministic finding requires action.',
                severity: 'info',
                findingIds: [finding.id],
                evidenceIds: [...finding.evidenceIds],
                recommendationIds: [...finding.recommendationIds],
              },
            ],
      priorities: [],
      limitations: ['AI output is assistive.'],
      evidenceReferences: finding === undefined ? [] : [...finding.evidenceIds],
    });
    const application = new AnalysisApplication({
      analyze,
      aiProvider: provider,
      ingest: async () => ({
        files: fixture.files,
        limitations: [],
        metadata: {
          repository: { defaultBranch: 'main', sizeKb: 1 },
          selectedFileCount: fixture.files.length,
          totalBytes: 1,
          treeEntriesSeen: fixture.files.length,
          treeTruncated: false,
        },
        snapshot: fixture.snapshot,
      }),
      persistence,
      score: scoreAnalysis,
      createId: () => 'ai-id',
      now: () => '2026-08-26T10:00:00.000Z',
    });
    app = buildApp({ analysisApplication: application, logger: false, persistence });
    const created = await app.inject({
      method: 'POST',
      url: '/analyses',
      payload: { repositoryUrl: 'https://github.com/fixture-owner/clean-typescript', ref: 'main' },
    });
    const id = (created.json() as { id: string }).id;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const status = await app.inject({ method: 'GET', url: `/analyses/${id}` });
      if ((status.json() as { resultAvailable: boolean }).resultAvailable) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const before = await app.inject({ method: 'GET', url: `/analyses/${id}/report` });
    const ai = await app.inject({ method: 'POST', url: `/analyses/${id}/ai`, payload: {} });
    assert.equal(ai.statusCode, 200);
    assert.equal(ai.json().status, 'completed');
    const after = await app.inject({ method: 'GET', url: `/analyses/${id}/report` });
    assert.deepEqual(after.json(), before.json());
    assert.equal(
      (after.json() as { snapshot: { commitSha: string } }).snapshot.commitSha,
      fixture.snapshot.commitSha,
    );
  });

  it('limits repeated AI generation requests without affecting the report', async () => {
    const fixture = cleanTypeScriptFixture();
    persistence = new SqlitePersistence();
    const application = new AnalysisApplication({
      persistence,
      aiProvider: new FakeAIProvider({
        summary: 'summary',
        keyInsights: [],
        priorities: [],
        limitations: [],
        evidenceReferences: [],
      }),
      analyze,
      score: scoreAnalysis,
      ingest: async () => ({
        files: fixture.files,
        limitations: [],
        metadata: {
          repository: { defaultBranch: 'main', sizeKb: 1 },
          selectedFileCount: fixture.files.length,
          totalBytes: 1,
          treeEntriesSeen: fixture.files.length,
          treeTruncated: false,
        },
        snapshot: fixture.snapshot,
      }),
      createId: () => 'rate-id',
    });
    app = buildApp({ analysisApplication: application, logger: false, persistence });
    const created = await app.inject({
      method: 'POST',
      url: '/analyses',
      payload: { repositoryUrl: 'https://github.com/fixture-owner/rate-test' },
    });
    const id = (created.json() as { id: string }).id;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const status = await app.inject({ method: 'GET', url: `/analyses/${id}` });
      if ((status.json() as { resultAvailable: boolean }).resultAvailable) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal(
        (await app.inject({ method: 'POST', url: `/analyses/${id}/ai`, payload: {} })).statusCode,
        200,
      );
    }
    assert.equal(
      (await app.inject({ method: 'POST', url: `/analyses/${id}/ai`, payload: {} })).statusCode,
      429,
    );
    assert.equal(
      (await app.inject({ method: 'GET', url: `/analyses/${id}/report` })).statusCode,
      200,
    );
  });

  it('reports unavailable when no provider is configured', async () => {
    persistence = new SqlitePersistence();
    const application = new AnalysisApplication({
      persistence,
      analyze,
      score: scoreAnalysis,
      ingest: async () => {
        throw new Error('not used');
      },
    });
    app = buildApp({ analysisApplication: application, logger: false, persistence });
    const response = await app.inject({ method: 'GET', url: '/analyses/missing/ai' });
    assert.equal(response.statusCode, 404);
  });
});
