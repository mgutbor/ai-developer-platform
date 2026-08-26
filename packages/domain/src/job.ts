import { DomainValidationError } from './errors.js';

export type AnalysisJobStatus =
  'queued' | 'running' | 'completed' | 'completed_with_limitations' | 'failed' | 'cancelled';

export interface AnalysisJob {
  readonly id: string;
  readonly idempotencyKey: string;
  readonly repositoryUrl: string;
  readonly owner: string;
  readonly repository: string;
  readonly requestedRef: string;
  readonly commitSha: string | null;
  readonly status: AnalysisJobStatus;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly errorCode: string | null;
  readonly analyzerVersion: string;
  readonly ruleSetVersion: string;
  readonly resultId: string | null;
}

export interface CreateAnalysisJobInput {
  readonly id: string;
  readonly idempotencyKey: string;
  readonly repositoryUrl: string;
  readonly owner: string;
  readonly repository: string;
  readonly requestedRef: string;
  readonly analyzerVersion: string;
  readonly ruleSetVersion: string;
  readonly createdAt: string;
}

export interface TransitionAnalysisJobInput {
  readonly status: Exclude<AnalysisJobStatus, 'queued'>;
  readonly at: string;
  readonly commitSha?: string;
  readonly errorCode?: string;
  readonly resultId?: string;
}

const JOB_STATUSES: readonly AnalysisJobStatus[] = [
  'queued',
  'running',
  'completed',
  'completed_with_limitations',
  'failed',
  'cancelled',
];

function requiredText(value: string, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DomainValidationError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function isoDate(value: string, field: string): string {
  const normalized = requiredText(value, field);
  if (!normalized.includes('T') || Number.isNaN(Date.parse(normalized))) {
    throw new DomainValidationError(`${field} must be an ISO date-time`);
  }
  return normalized;
}

function repositoryPart(value: string, field: string): string {
  const normalized = requiredText(value, field);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(normalized)) {
    throw new DomainValidationError(`${field} contains unsupported characters`);
  }
  return normalized.toLowerCase();
}

function repositoryUrl(value: string, owner: string, repository: string): string {
  const normalized = requiredText(value, 'repositoryUrl');
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new DomainValidationError('repositoryUrl must be a valid URL');
  }
  const pathname = parsed.pathname.replace(/\/+$/, '');
  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname.toLowerCase() !== 'github.com' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.search !== '' ||
    parsed.hash !== '' ||
    pathname.toLowerCase() !== `/${owner}/${repository}`
  ) {
    throw new DomainValidationError('repositoryUrl must be the canonical public GitHub URL');
  }
  return `https://github.com/${owner}/${repository}`;
}

function immutable<T extends object>(value: T): T {
  return Object.freeze(value);
}

export function createAnalysisJob(input: CreateAnalysisJobInput): AnalysisJob {
  const owner = repositoryPart(input.owner, 'owner');
  const repository = repositoryPart(input.repository, 'repository');
  const requestedRef = requiredText(input.requestedRef, 'requestedRef');
  const analyzerVersion = requiredText(input.analyzerVersion, 'analyzerVersion');
  const ruleSetVersion = requiredText(input.ruleSetVersion, 'ruleSetVersion');
  const job: AnalysisJob = {
    analyzerVersion,
    commitSha: null,
    completedAt: null,
    createdAt: isoDate(input.createdAt, 'createdAt'),
    errorCode: null,
    id: requiredText(input.id, 'id'),
    idempotencyKey: requiredText(input.idempotencyKey, 'idempotencyKey'),
    owner,
    repository,
    requestedRef,
    repositoryUrl: repositoryUrl(input.repositoryUrl, owner, repository),
    resultId: null,
    ruleSetVersion,
    startedAt: null,
    status: 'queued',
  };
  return immutable(job);
}

function assertStatus(status: AnalysisJobStatus): void {
  if (!JOB_STATUSES.includes(status)) {
    throw new DomainValidationError('analysis job has an unsupported status');
  }
}

function assertTransition(current: AnalysisJobStatus, next: AnalysisJobStatus): void {
  const valid =
    (current === 'queued' && (next === 'running' || next === 'failed' || next === 'cancelled')) ||
    (current === 'running' &&
      (next === 'completed' ||
        next === 'completed_with_limitations' ||
        next === 'failed' ||
        next === 'cancelled'));
  if (!valid) {
    throw new DomainValidationError(`invalid analysis job transition: ${current} -> ${next}`);
  }
}

export function transitionAnalysisJob(
  job: AnalysisJob,
  input: TransitionAnalysisJobInput,
): AnalysisJob {
  assertStatus(job.status);
  assertStatus(input.status);
  assertTransition(job.status, input.status);
  const at = isoDate(input.at, 'transition.at');
  const commitSha = input.commitSha ?? job.commitSha;
  const resultId = input.resultId ?? job.resultId;
  const errorCode = input.errorCode ?? job.errorCode;
  if (
    (input.status === 'completed' || input.status === 'completed_with_limitations') &&
    (commitSha === null || resultId === null)
  ) {
    throw new DomainValidationError('completed analysis jobs require commitSha and resultId');
  }
  if (
    input.status === 'failed' &&
    (errorCode === null || errorCode === undefined || errorCode.trim().length === 0)
  ) {
    throw new DomainValidationError('failed analysis jobs require errorCode');
  }
  if (input.status === 'running' && job.startedAt !== null) {
    throw new DomainValidationError('analysis job cannot start twice');
  }
  const terminalStatus =
    input.status === 'completed' ||
    input.status === 'completed_with_limitations' ||
    input.status === 'failed' ||
    input.status === 'cancelled';
  if (terminalStatus && job.status === 'running' && job.startedAt === null) {
    throw new DomainValidationError('a running analysis job must have startedAt');
  }
  if (
    (input.status === 'completed' || input.status === 'completed_with_limitations') &&
    job.status !== 'running'
  ) {
    throw new DomainValidationError('only a running analysis job can complete');
  }
  return immutable({
    ...job,
    commitSha,
    completedAt:
      input.status === 'completed' ||
      input.status === 'completed_with_limitations' ||
      input.status === 'failed' ||
      input.status === 'cancelled'
        ? at
        : job.completedAt,
    errorCode: input.status === 'failed' ? requiredText(errorCode ?? '', 'errorCode') : null,
    resultId,
    startedAt: input.status === 'running' ? at : job.startedAt,
    status: input.status,
  });
}
