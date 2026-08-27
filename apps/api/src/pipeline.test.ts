import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { cleanTypeScriptFixture } from '@ai-developer-platform/analyzer';
import type { AnalysisRequest } from '@ai-developer-platform/contracts';
import { SqlitePersistence } from '@ai-developer-platform/persistence';
import { analyze } from '@ai-developer-platform/analyzer';
import { scoreAnalysis } from '@ai-developer-platform/scoring';
import { AnalysisApplication } from './application.js';
import { buildApp } from './app.js';

async function waitForCompletion(
  app: FastifyInstance,
  id: string,
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const response = await app.inject({ method: 'GET', url: `/analyses/${id}` });
    const body = response.json() as Record<string, unknown>;
    if (
      body['status'] === 'completed' ||
      body['status'] === 'completed_with_limitations' ||
      body['status'] === 'failed'
    ) {
      return body;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('analysis did not reach a terminal state');
}

describe('analysis pipeline API', () => {
  let app: FastifyInstance | undefined;
  let persistence: SqlitePersistence | undefined;

  afterEach(async () => {
    await app?.close();
    if (persistence !== undefined) {
      persistence.close();
    }
  });

  it('runs ingestion, analyzer, scoring, persistence, and report mapping', async () => {
    const fixture = cleanTypeScriptFixture();
    persistence = new SqlitePersistence();
    const request: AnalysisRequest = {
      ref: 'main',
      repositoryUrl: 'https://github.com/fixture-owner/clean-typescript',
    };
    const application = new AnalysisApplication({
      analyze: (ingestion) =>
        analyze({
          files: ingestion.files,
          ...(ingestion.metadata === undefined
            ? {}
            : {
                inspectedScope: {
                  fileCount: ingestion.metadata.selectedFileCount,
                  totalBytes: ingestion.metadata.totalBytes,
                  treeEntriesSeen: ingestion.metadata.treeEntriesSeen,
                },
              }),
          limitations: ingestion.limitations,
          snapshot: ingestion.snapshot,
        }),
      createId: () => 'fixed-id',
      ingest: async () => ({
        files: fixture.files,
        limitations: [],
        metadata: {
          repository: { defaultBranch: 'main', sizeKb: 1 },
          selectedFileCount: fixture.files.length,
          totalBytes: fixture.files.reduce((total, file) => total + file.size, 0),
          treeEntriesSeen: fixture.files.length,
          treeTruncated: false,
        },
        snapshot: fixture.snapshot,
      }),
      now: (() => {
        let call = 0;
        return () => `2026-08-26T10:00:0${call++}.000Z`;
      })(),
      persistence,
      score: scoreAnalysis,
    });
    app = buildApp({ analysisApplication: application, logger: false, persistence });

    const created = await app.inject({
      method: 'POST',
      payload: request,
      url: '/analyses',
    });
    assert.equal(created.statusCode, 202);
    const createdBody = created.json() as { id: string; status: string };
    assert.equal(createdBody.status, 'queued');

    const status = await waitForCompletion(app, createdBody.id);
    assert.equal(status['status'], 'completed');
    assert.equal(status['commitSha'], fixture.snapshot.commitSha);
    assert.equal(status['resultAvailable'], true);

    const report = await app.inject({
      method: 'GET',
      url: `/analyses/${createdBody.id}/report`,
    });
    assert.equal(report.statusCode, 200);
    const reportBody = report.json() as {
      findings: readonly unknown[];
      metrics: readonly unknown[];
      dimensionScores: readonly unknown[];
      inspectedScope?: { fileCount: number; treeEntriesSeen: number; totalBytes: number };
    };
    assert.equal(reportBody.findings.length, 0);
    assert.equal(reportBody.metrics.length > 0, true);
    assert.equal(reportBody.dimensionScores.length, 6);
    assert.deepEqual(reportBody.inspectedScope, {
      fileCount: fixture.files.length,
      totalBytes: fixture.files.reduce((total, file) => total + file.size, 0),
      treeEntriesSeen: fixture.files.length,
    });

    const facts = await app.inject({ method: 'GET', url: `/analyses/${createdBody.id}/facts` });
    assert.equal(facts.statusCode, 200);
    assert.equal(Array.isArray(facts.json()), true);

    const duplicate = await app.inject({
      method: 'POST',
      payload: request,
      url: '/analyses',
    });
    assert.equal(duplicate.statusCode, 200);
    assert.equal(duplicate.json().id, createdBody.id);
  });
  it('marks GitHub failures and runner timeouts as failed jobs', async () => {
    persistence = new SqlitePersistence();
    const application = new AnalysisApplication({
      analyze,
      createId: (() => {
        let value = 0;
        return () => `failure-${value++}`;
      })(),
      ingest: async (repositoryUrl) => {
        if (repositoryUrl.endsWith('/timeout-project')) {
          return await new Promise(() => undefined);
        }
        throw { category: 'repository_not_found' };
      },
      now: () => '2026-08-26T10:00:00.000Z',
      persistence,
      score: scoreAnalysis,
      analysisTimeoutMs: 5,
    });
    app = buildApp({ analysisApplication: application, logger: false, persistence });

    const failedResponse = await app.inject({
      method: 'POST',
      payload: { repositoryUrl: 'https://github.com/example/missing', ref: 'main' },
      url: '/analyses',
    });
    const failedId = (failedResponse.json() as { id: string }).id;
    const failed = await waitForCompletion(app, failedId);
    assert.equal(failed['status'], 'failed');
    assert.equal(failed['errorCode'], 'REPOSITORY_NOT_FOUND');

    const timeoutResponse = await app.inject({
      method: 'POST',
      payload: { repositoryUrl: 'https://github.com/example/timeout-project', ref: 'main' },
      url: '/analyses',
    });
    const timeoutId = (timeoutResponse.json() as { id: string }).id;
    const timedOut = await waitForCompletion(app, timeoutId);
    assert.equal(timedOut['status'], 'failed');
    assert.equal(timedOut['errorCode'], 'ANALYSIS_TIMEOUT');
  });

  it('returns sanitized validation and not-found errors', async () => {
    persistence = new SqlitePersistence();
    app = buildApp({ logger: false, persistence });

    const invalid = await app.inject({
      method: 'POST',
      payload: { repositoryUrl: 'https://evil.example/repo' },
      url: '/analyses',
    });
    assert.equal(invalid.statusCode, 400);
    assert.deepEqual(invalid.json(), {
      code: 'INVALID_REPOSITORY_URL',
      message: 'repositoryUrl or ref is invalid',
      status: 'error',
    });

    const missing = await app.inject({ method: 'GET', url: '/analyses/unknown' });
    assert.equal(missing.statusCode, 404);
    assert.deepEqual(missing.json(), {
      code: 'ANALYSIS_NOT_FOUND',
      message: 'Analysis was not found',
      status: 'error',
    });
  });
});
