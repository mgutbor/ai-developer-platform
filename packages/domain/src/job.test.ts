import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createAnalysisJob, DomainValidationError, transitionAnalysisJob } from './index.js';

const input = {
  analyzerVersion: '0.1.0',
  createdAt: '2026-08-26T10:00:00.000Z',
  id: 'job:test',
  idempotencyKey: 'https://github.com/example/repo|main|0.1.0|0.1.0',
  owner: 'Example',
  repository: 'Repo',
  repositoryUrl: 'https://github.com/example/repo',
  requestedRef: 'main',
  ruleSetVersion: '0.1.0',
};

function job() {
  return createAnalysisJob(input);
}

describe('AnalysisJob', () => {
  it('supports valid queued, running, and completed transitions', () => {
    const queued = job();
    const running = transitionAnalysisJob(queued, {
      at: '2026-08-26T10:00:01.000Z',
      status: 'running',
    });
    const completed = transitionAnalysisJob(running, {
      at: '2026-08-26T10:00:02.000Z',
      commitSha: 'abcdef1234567890abcdef1234567890abcdef12',
      resultId: 'analysis:test',
      status: 'completed',
    });

    assert.equal(queued.status, 'queued');
    assert.equal(running.startedAt, '2026-08-26T10:00:01.000Z');
    assert.equal(completed.status, 'completed');
    assert.equal(completed.commitSha, 'abcdef1234567890abcdef1234567890abcdef12');
    assert.equal(completed.resultId, 'analysis:test');
  });

  it('allows queued cancellation/failure and running completion with limitations', () => {
    const failed = transitionAnalysisJob(job(), {
      at: '2026-08-26T10:00:01.000Z',
      errorCode: 'REPOSITORY_NOT_FOUND',
      status: 'failed',
    });
    const cancelled = transitionAnalysisJob(job(), {
      at: '2026-08-26T10:00:01.000Z',
      status: 'cancelled',
    });
    const limited = transitionAnalysisJob(
      transitionAnalysisJob(job(), { at: '2026-08-26T10:00:01.000Z', status: 'running' }),
      {
        at: '2026-08-26T10:00:02.000Z',
        commitSha: 'abcdef1234567890abcdef1234567890abcdef12',
        resultId: 'analysis:limited',
        status: 'completed_with_limitations',
      },
    );

    assert.equal(failed.status, 'failed');
    assert.equal(cancelled.status, 'cancelled');
    assert.equal(limited.status, 'completed_with_limitations');
  });

  it('rejects invalid transitions and incomplete terminal states', () => {
    assert.throws(
      () => transitionAnalysisJob(job(), { at: '2026-08-26T10:00:01.000Z', status: 'completed' }),
      DomainValidationError,
    );
    assert.throws(
      () =>
        transitionAnalysisJob(
          transitionAnalysisJob(job(), { at: '2026-08-26T10:00:01.000Z', status: 'running' }),
          { at: '2026-08-26T10:00:02.000Z', status: 'completed' },
        ),
      DomainValidationError,
    );
    assert.throws(
      () => transitionAnalysisJob(job(), { at: '2026-08-26T10:00:01.000Z', status: 'failed' }),
      DomainValidationError,
    );
  });
});
