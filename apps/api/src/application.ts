import { randomUUID } from 'node:crypto';
import {
  createAnalysisJob,
  transitionAnalysisJob,
  type AnalysisJob,
  type AnalysisResult,
} from '@ai-developer-platform/domain';
import { parseRepositoryReference } from '@ai-developer-platform/github';
import type { IngestionResult } from '@ai-developer-platform/github';
import type { AnalysisRequest } from '@ai-developer-platform/contracts';
import { DEFAULT_ANALYZER_OPTIONS } from '@ai-developer-platform/analyzer';
import { SCORING_RULE_SET_VERSION } from '@ai-developer-platform/scoring';
import type { PersistenceStore } from '@ai-developer-platform/persistence';

export interface AnalysisApplicationDependencies {
  readonly persistence: PersistenceStore;
  readonly ingest: (repositoryUrl: string, ref: string | undefined) => Promise<IngestionResult>;
  readonly analyze: (input: IngestionResult) => AnalysisResult;
  readonly score: (result: AnalysisResult) => AnalysisResult;
  readonly now?: () => string;
  readonly createId?: () => string;
  readonly maxConcurrentJobs?: number;
  readonly analysisTimeoutMs?: number;
}

export interface AnalysisCreated {
  readonly job: AnalysisJob;
  readonly existing: boolean;
}

export class ApplicationError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 500) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function nowIso(dependencies: AnalysisApplicationDependencies): string {
  return dependencies.now?.() ?? new Date().toISOString();
}

function id(dependencies: AnalysisApplicationDependencies): string {
  return dependencies.createId?.() ?? randomUUID();
}

function idempotencyKey(
  repositoryUrl: string,
  requestedRef: string,
  analyzerVersion: string,
  ruleSetVersion: string,
): string {
  return [repositoryUrl, requestedRef, analyzerVersion, ruleSetVersion].join('|');
}

async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError('analysisTimeoutMs must be a positive integer');
  }
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new ApplicationError('ANALYSIS_TIMEOUT', 'Analysis timed out'));
    }, timeoutMs);
  });
  const operationPromise = operation(controller.signal);
  void operationPromise.catch(() => undefined);
  try {
    return await Promise.race([operationPromise, timeout]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    controller.abort();
  }
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new ApplicationError('ANALYSIS_TIMEOUT', 'Analysis timed out');
  }
}

function classifyError(error: unknown): { readonly code: string; readonly message: string } {
  if (error instanceof ApplicationError) {
    return { code: error.code, message: error.message };
  }
  if (
    error !== null &&
    typeof error === 'object' &&
    'category' in error &&
    typeof error.category === 'string'
  ) {
    const category = error.category;
    const mapping: Readonly<Record<string, string>> = {
      invalid_repository: 'INVALID_REPOSITORY_URL',
      invalid_ref: 'REF_NOT_FOUND',
      rate_limited: 'GITHUB_RATE_LIMITED',
      repository_not_found: 'REPOSITORY_NOT_FOUND',
      repository_not_public: 'REPOSITORY_NOT_PUBLIC',
      request_timeout: 'ANALYSIS_TIMEOUT',
      ingestion_limit_reached: 'SNAPSHOT_LIMIT_EXCEEDED',
    };
    return {
      code: mapping[category] ?? 'GITHUB_UNAVAILABLE',
      message: 'Repository ingestion failed',
    };
  }
  return { code: 'UNKNOWN_ERROR', message: 'Analysis failed' };
}

export class AnalysisRunner {
  private readonly queue: string[] = [];
  private readonly maxConcurrentJobs: number;
  private activeJobs = 0;

  constructor(private readonly dependencies: AnalysisApplicationDependencies) {
    this.maxConcurrentJobs = dependencies.maxConcurrentJobs ?? 1;
    if (!Number.isInteger(this.maxConcurrentJobs) || this.maxConcurrentJobs < 1) {
      throw new TypeError('maxConcurrentJobs must be a positive integer');
    }
    if (
      dependencies.analysisTimeoutMs !== undefined &&
      (!Number.isInteger(dependencies.analysisTimeoutMs) || dependencies.analysisTimeoutMs <= 0)
    ) {
      throw new TypeError('analysisTimeoutMs must be a positive integer');
    }
  }

  enqueue(jobId: string): void {
    if (!this.queue.includes(jobId)) {
      this.queue.push(jobId);
    }
    this.pump();
  }

  get queuedCount(): number {
    return this.queue.length;
  }

  get runningCount(): number {
    return this.activeJobs;
  }

  private pump(): void {
    while (this.activeJobs < this.maxConcurrentJobs && this.queue.length > 0) {
      const jobId = this.queue.shift();
      if (jobId === undefined) {
        return;
      }
      this.activeJobs += 1;
      void this.execute(jobId).finally(() => {
        this.activeJobs -= 1;
        this.pump();
      });
    }
  }

  private async execute(jobId: string): Promise<void> {
    const job = this.dependencies.persistence.findJobById(jobId);
    if (job === undefined || job.status !== 'queued') {
      return;
    }
    const started = transitionAnalysisJob(job, {
      at: nowIso(this.dependencies),
      status: 'running',
    });
    this.dependencies.persistence.saveJob(started);

    try {
      await withTimeout(async (signal) => {
        const ingestion = await this.dependencies.ingest(
          started.repositoryUrl,
          started.requestedRef === 'default' ? undefined : started.requestedRef,
        );
        throwIfAborted(signal);
        const analyzed = this.dependencies.analyze(ingestion);
        throwIfAborted(signal);
        const result = this.dependencies.score(analyzed);
        throwIfAborted(signal);
        this.dependencies.persistence.saveResult(result);
        throwIfAborted(signal);
        const completed = transitionAnalysisJob(started, {
          at: nowIso(this.dependencies),
          commitSha: result.snapshot.commitSha,
          resultId: result.id,
          status:
            ingestion.limitations.length > 0 || result.coverage !== 'complete'
              ? 'completed_with_limitations'
              : 'completed',
        });
        this.dependencies.persistence.saveJob(completed);
      }, this.dependencies.analysisTimeoutMs ?? 75_000);
    } catch (error) {
      const classified = classifyError(error);
      const failed = transitionAnalysisJob(started, {
        at: nowIso(this.dependencies),
        errorCode: classified.code,
        status: 'failed',
      });
      this.dependencies.persistence.saveJob(failed);
    }
  }
}

export class AnalysisApplication {
  readonly runner: AnalysisRunner;

  constructor(private readonly dependencies: AnalysisApplicationDependencies) {
    this.runner = new AnalysisRunner(dependencies);
  }

  createAnalysis(request: AnalysisRequest): AnalysisCreated {
    let reference;
    try {
      reference = parseRepositoryReference(request.repositoryUrl, request.ref);
    } catch {
      throw new ApplicationError('INVALID_REPOSITORY_URL', 'repositoryUrl or ref is invalid', 400);
    }
    const requestedRef = reference.ref ?? 'default';
    const analyzerVersion = DEFAULT_ANALYZER_OPTIONS.analyzerVersion;
    const ruleSetVersion = SCORING_RULE_SET_VERSION;
    const key = idempotencyKey(
      reference.canonicalUrl,
      requestedRef,
      analyzerVersion,
      ruleSetVersion,
    );
    const existing = this.dependencies.persistence.findJobByIdempotencyKey(key);
    if (existing !== undefined) {
      return { existing: true, job: existing };
    }
    const createdAt = nowIso(this.dependencies);
    const job = createAnalysisJob({
      analyzerVersion,
      createdAt,
      id: `analysis-job:${id(this.dependencies)}`,
      idempotencyKey: key,
      owner: reference.owner,
      repository: reference.repository,
      repositoryUrl: reference.canonicalUrl,
      requestedRef,
      ruleSetVersion,
    });
    this.dependencies.persistence.saveJob(job);
    this.runner.enqueue(job.id);
    return { existing: false, job };
  }

  getJob(id: string): AnalysisJob {
    const job = this.dependencies.persistence.findJobById(id);
    if (job === undefined) {
      throw new ApplicationError('ANALYSIS_NOT_FOUND', 'Analysis was not found', 404);
    }
    return job;
  }

  getResult(id: string): AnalysisResult {
    const job = this.getJob(id);
    if (job.resultId === null) {
      throw new ApplicationError('RESULT_NOT_AVAILABLE', 'Analysis result is not available', 404);
    }
    const result = this.dependencies.persistence.findResultById(job.resultId);
    if (result === undefined) {
      throw new ApplicationError('RESULT_NOT_AVAILABLE', 'Analysis result is not available', 404);
    }
    return result;
  }

  getFindings(id: string): AnalysisResult['findings'] {
    return this.getResult(id).findings;
  }

  getRecommendations(id: string): AnalysisResult['recommendations'] {
    return this.getResult(id).recommendations;
  }

  getFacts(id: string): AnalysisResult['facts'] {
    return this.getResult(id).facts;
  }

  cleanupExpired(cutoffIso: string): number {
    return this.dependencies.persistence.deleteOlderThan(cutoffIso);
  }
}
