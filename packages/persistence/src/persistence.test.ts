import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createAnalysisJob, transitionAnalysisJob } from '@ai-developer-platform/domain';
import { analyze, cleanTypeScriptFixture } from '@ai-developer-platform/analyzer';
import { scoreAnalysis } from '@ai-developer-platform/scoring';
import { SqlitePersistence } from './index.js';

function queuedJob(createdAt = '2026-08-26T10:00:00.000Z') {
  return createAnalysisJob({
    analyzerVersion: '0.1.0',
    createdAt,
    id: `job:${createdAt}`,
    idempotencyKey: `key:${createdAt}`,
    owner: 'example',
    repository: 'repo',
    repositoryUrl: 'https://github.com/example/repo',
    requestedRef: 'main',
    ruleSetVersion: '0.1.0',
  });
}

test('persists and rehydrates jobs and complete analysis results', () => {
  const store = new SqlitePersistence();
  try {
    const queued = queuedJob();
    const running = transitionAnalysisJob(queued, {
      at: '2026-08-26T10:00:01.000Z',
      status: 'running',
    });
    const result = scoreAnalysis(analyze(cleanTypeScriptFixture()));
    const completed = transitionAnalysisJob(running, {
      at: '2026-08-26T10:00:02.000Z',
      commitSha: result.snapshot.commitSha,
      resultId: result.id,
      status: 'completed',
    });

    store.saveJob(completed);
    store.saveResult(result);

    assert.deepEqual(store.findJobById(completed.id), completed);
    assert.deepEqual(store.findJobByIdempotencyKey(completed.idempotencyKey), completed);
    assert.deepEqual(store.findResultById(result.id), result);
  } finally {
    store.close();
  }
});

test('survives a file-backed persistence restart and cleanup is idempotent', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ai-developer-platform-'));
  const databasePath = join(directory, 'analysis.db');
  const oldJob = queuedJob('2026-01-01T00:00:00.000Z');
  const first = new SqlitePersistence(databasePath);
  first.saveJob(oldJob);
  first.close();

  const second = new SqlitePersistence(databasePath);
  try {
    assert.deepEqual(second.findJobById(oldJob.id), oldJob);
    assert.equal(second.deleteOlderThan('2026-02-01T00:00:00.000Z'), 1);
    assert.equal(second.findJobById(oldJob.id), undefined);
    assert.equal(second.deleteOlderThan('2026-02-01T00:00:00.000Z'), 0);
  } finally {
    second.close();
    await rm(directory, { force: true, recursive: true });
  }
});
