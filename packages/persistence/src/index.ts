import {
  createAnalysisJob,
  createAnalysisResult,
  transitionAnalysisJob,
  type AnalysisJob,
  type AnalysisResult,
  type RepositorySnapshot,
} from '@ai-developer-platform/domain';
import { DatabaseSync } from 'node:sqlite';

export interface AnalysisJobRepository {
  findJobById(id: string): AnalysisJob | undefined;
  findJobByIdempotencyKey(key: string): AnalysisJob | undefined;
  saveJob(job: AnalysisJob): void;
  deleteOlderThan(cutoffIso: string): number;
}

export interface AnalysisResultRepository {
  findResultById(id: string): AnalysisResult | undefined;
  saveResult(result: AnalysisResult): void;
  deleteOlderThan(cutoffIso: string): number;
}

export interface AIInterpretationRecord {
  readonly analysisId: string;
  readonly provider: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly contextVersion: string;
  readonly status: 'completed' | 'failed' | 'unavailable';
  readonly interpretation: string | null;
  readonly generatedAt: string;
}

export interface AIInterpretationRepository {
  findAIInterpretationByAnalysisId(analysisId: string): AIInterpretationRecord | undefined;
  saveAIInterpretation(record: AIInterpretationRecord): void;
}

export interface PersistenceStore
  extends AnalysisJobRepository, AnalysisResultRepository, AIInterpretationRepository {
  close(): void;
}

interface JobRow {
  readonly id: string;
  readonly idempotency_key: string;
  readonly repository_url: string;
  readonly owner: string;
  readonly repository: string;
  readonly requested_ref: string;
  readonly commit_sha: string | null;
  readonly status: string;
  readonly created_at: string;
  readonly started_at: string | null;
  readonly completed_at: string | null;
  readonly error_code: string | null;
  readonly analyzer_version: string;
  readonly rule_set_version: string;
  readonly result_id: string | null;
}

interface ResultRow {
  readonly id: string;
  readonly snapshot_id: string;
  readonly analyzer_version: string;
  readonly rule_set_version: string;
  readonly created_at: string;
  readonly payload: string;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`SQLite row field ${field} is invalid`);
  }
  return value;
}

function asNullableString(value: unknown, field: string): string | null {
  if (value === null) {
    return null;
  }
  return asString(value, field);
}

function parseJson<T>(value: string, field: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`SQLite ${field} payload is invalid JSON`);
  }
}

function snapshotFromResult(result: AnalysisResult): RepositorySnapshot {
  return result.snapshot;
}

function hydrateJob(row: JobRow): AnalysisJob {
  const initial = createAnalysisJob({
    analyzerVersion: row.analyzer_version,
    createdAt: row.created_at,
    id: row.id,
    idempotencyKey: row.idempotency_key,
    owner: row.owner,
    repository: row.repository,
    repositoryUrl: row.repository_url,
    requestedRef: row.requested_ref,
    ruleSetVersion: row.rule_set_version,
  });
  if (row.status === 'queued') {
    return initial;
  }
  if (row.status === 'running') {
    if (row.started_at === null) {
      throw new Error('SQLite running job has no startedAt');
    }
    return transitionAnalysisJob(initial, { at: row.started_at, status: 'running' });
  }
  if (row.status === 'failed' || row.status === 'cancelled') {
    if (row.started_at === null) {
      return transitionAnalysisJob(initial, {
        at: row.completed_at ?? row.created_at,
        ...(row.status === 'failed' ? { errorCode: row.error_code ?? 'UNKNOWN_ERROR' } : {}),
        status: row.status,
      });
    }
    const running = transitionAnalysisJob(initial, { at: row.started_at, status: 'running' });
    return transitionAnalysisJob(running, {
      at: row.completed_at ?? row.created_at,
      ...(row.status === 'failed' ? { errorCode: row.error_code ?? 'UNKNOWN_ERROR' } : {}),
      status: row.status,
    });
  }
  const running =
    row.started_at === null
      ? transitionAnalysisJob(initial, { at: row.created_at, status: 'running' })
      : transitionAnalysisJob(initial, { at: row.started_at, status: 'running' });
  if (row.commit_sha === null || row.result_id === null) {
    throw new Error('SQLite completed job has no result reference');
  }
  return transitionAnalysisJob(running, {
    at: row.completed_at ?? row.created_at,
    commitSha: row.commit_sha,
    resultId: row.result_id,
    status: row.status === 'completed' ? 'completed' : 'completed_with_limitations',
  });
}

function rowFromUnknown(value: Record<string, unknown> | undefined): JobRow | undefined {
  if (value === undefined) {
    return undefined;
  }
  return {
    analyzer_version: asString(value['analyzer_version'], 'analyzer_version'),
    commit_sha: asNullableString(value['commit_sha'], 'commit_sha'),
    completed_at: asNullableString(value['completed_at'], 'completed_at'),
    created_at: asString(value['created_at'], 'created_at'),
    error_code: asNullableString(value['error_code'], 'error_code'),
    id: asString(value['id'], 'id'),
    idempotency_key: asString(value['idempotency_key'], 'idempotency_key'),
    owner: asString(value['owner'], 'owner'),
    repository: asString(value['repository'], 'repository'),
    repository_url: asString(value['repository_url'], 'repository_url'),
    requested_ref: asString(value['requested_ref'], 'requested_ref'),
    result_id: asNullableString(value['result_id'], 'result_id'),
    rule_set_version: asString(value['rule_set_version'], 'rule_set_version'),
    started_at: asNullableString(value['started_at'], 'started_at'),
    status: asString(value['status'], 'status'),
  };
}

function resultFromRow(value: Record<string, unknown> | undefined): ResultRow | undefined {
  if (value === undefined) {
    return undefined;
  }
  return {
    analyzer_version: asString(value['analyzer_version'], 'analyzer_version'),
    created_at: asString(value['created_at'], 'created_at'),
    id: asString(value['id'], 'id'),
    payload: asString(value['payload'], 'payload'),
    rule_set_version: asString(value['rule_set_version'], 'rule_set_version'),
    snapshot_id: asString(value['snapshot_id'], 'snapshot_id'),
  };
}

export class SqlitePersistence implements PersistenceStore {
  private readonly database: DatabaseSync;

  constructor(path = ':memory:') {
    this.database = new DatabaseSync(path, {
      defensive: true,
      enableForeignKeyConstraints: true,
      timeout: 1_000,
    });
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS analysis_jobs (
        id TEXT PRIMARY KEY,
        idempotency_key TEXT NOT NULL UNIQUE,
        repository_url TEXT NOT NULL,
        owner TEXT NOT NULL,
        repository TEXT NOT NULL,
        requested_ref TEXT NOT NULL,
        commit_sha TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        error_code TEXT,
        analyzer_version TEXT NOT NULL,
        rule_set_version TEXT NOT NULL,
        result_id TEXT
      ) STRICT;
      CREATE TABLE IF NOT EXISTS analysis_results (
        id TEXT PRIMARY KEY,
        snapshot_id TEXT NOT NULL,
        analyzer_version TEXT NOT NULL,
        rule_set_version TEXT NOT NULL,
        created_at TEXT NOT NULL,
        payload TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at ON analysis_jobs(created_at);
      CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON analysis_results(created_at);
      CREATE TABLE IF NOT EXISTS ai_interpretations (
        analysis_id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt_version TEXT NOT NULL,
        context_version TEXT NOT NULL,
        status TEXT NOT NULL,
        interpretation TEXT,
        generated_at TEXT NOT NULL
      ) STRICT;
    `);
  }

  findJobById(id: string): AnalysisJob | undefined {
    const row = rowFromUnknown(
      this.database.prepare('SELECT * FROM analysis_jobs WHERE id = ?').get(id),
    );
    return row === undefined ? undefined : hydrateJob(row);
  }

  findJobByIdempotencyKey(key: string): AnalysisJob | undefined {
    const row = rowFromUnknown(
      this.database.prepare('SELECT * FROM analysis_jobs WHERE idempotency_key = ?').get(key),
    );
    return row === undefined ? undefined : hydrateJob(row);
  }

  saveJob(job: AnalysisJob): void {
    this.database
      .prepare(
        `
        INSERT INTO analysis_jobs (
          id, idempotency_key, repository_url, owner, repository, requested_ref,
          commit_sha, status, created_at, started_at, completed_at, error_code,
          analyzer_version, rule_set_version, result_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          idempotency_key = excluded.idempotency_key,
          repository_url = excluded.repository_url,
          owner = excluded.owner,
          repository = excluded.repository,
          requested_ref = excluded.requested_ref,
          commit_sha = excluded.commit_sha,
          status = excluded.status,
          created_at = excluded.created_at,
          started_at = excluded.started_at,
          completed_at = excluded.completed_at,
          error_code = excluded.error_code,
          analyzer_version = excluded.analyzer_version,
          rule_set_version = excluded.rule_set_version,
          result_id = excluded.result_id
      `,
      )
      .run(
        job.id,
        job.idempotencyKey,
        job.repositoryUrl,
        job.owner,
        job.repository,
        job.requestedRef,
        job.commitSha,
        job.status,
        job.createdAt,
        job.startedAt,
        job.completedAt,
        job.errorCode,
        job.analyzerVersion,
        job.ruleSetVersion,
        job.resultId,
      );
  }

  saveResult(result: AnalysisResult): void {
    const snapshot = snapshotFromResult(result);
    this.database
      .prepare(
        `
        INSERT INTO analysis_results (
          id, snapshot_id, analyzer_version, rule_set_version, created_at, payload
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          snapshot_id = excluded.snapshot_id,
          analyzer_version = excluded.analyzer_version,
          rule_set_version = excluded.rule_set_version,
          created_at = excluded.created_at,
          payload = excluded.payload
      `,
      )
      .run(
        result.id,
        snapshot.id,
        result.analyzerVersion,
        result.ruleSetVersion,
        result.createdAt,
        JSON.stringify(result),
      );
  }

  findResultById(resultId: string): AnalysisResult | undefined {
    const row = resultFromRow(
      this.database.prepare('SELECT * FROM analysis_results WHERE id = ?').get(resultId),
    );
    if (row === undefined) {
      return undefined;
    }
    const payload = parseJson<AnalysisResult>(row.payload, 'analysis result');
    return createAnalysisResult({
      analyzerVersion: payload.analyzerVersion,
      confidence: payload.confidence,
      coverage: payload.coverage,
      createdAt: payload.createdAt,
      dimensionScores: payload.dimensionScores,
      evidence: payload.evidence,
      facts: payload.facts,
      findings: payload.findings,
      id: payload.id,
      limitations: payload.limitations,
      metrics: payload.metrics,
      recommendations: payload.recommendations,
      ruleSetVersion: payload.ruleSetVersion,
      snapshot: payload.snapshot,
      ...(payload.inspectedScope === undefined ? {} : { inspectedScope: payload.inspectedScope }),
    });
  }

  findAIInterpretationByAnalysisId(analysisId: string): AIInterpretationRecord | undefined {
    const row = this.database
      .prepare('SELECT * FROM ai_interpretations WHERE analysis_id = ?')
      .get(analysisId) as Record<string, unknown> | undefined;
    if (row === undefined) return undefined;
    return {
      analysisId: asString(row['analysis_id'], 'analysis_id'),
      contextVersion: asString(row['context_version'], 'context_version'),
      generatedAt: asString(row['generated_at'], 'generated_at'),
      interpretation:
        row['interpretation'] === null ? null : asString(row['interpretation'], 'interpretation'),
      model: asString(row['model'], 'model'),
      promptVersion: asString(row['prompt_version'], 'prompt_version'),
      provider: asString(row['provider'], 'provider'),
      status: asString(row['status'], 'status') as AIInterpretationRecord['status'],
    };
  }

  saveAIInterpretation(record: AIInterpretationRecord): void {
    this.database
      .prepare(
        `INSERT INTO ai_interpretations (analysis_id, provider, model, prompt_version, context_version, status, interpretation, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(analysis_id) DO UPDATE SET provider=excluded.provider, model=excluded.model, prompt_version=excluded.prompt_version, context_version=excluded.context_version, status=excluded.status, interpretation=excluded.interpretation, generated_at=excluded.generated_at`,
      )
      .run(
        record.analysisId,
        record.provider,
        record.model,
        record.promptVersion,
        record.contextVersion,
        record.status,
        record.interpretation,
        record.generatedAt,
      );
  }

  deleteOlderThan(cutoffIso: string): number {
    const resultChanges = this.database
      .prepare('DELETE FROM analysis_results WHERE created_at < ?')
      .run(cutoffIso);
    const jobChanges = this.database
      .prepare('DELETE FROM analysis_jobs WHERE created_at < ?')
      .run(cutoffIso);
    const aiChanges = this.database
      .prepare('DELETE FROM ai_interpretations WHERE generated_at < ?')
      .run(cutoffIso);
    return Number(resultChanges.changes) + Number(jobChanges.changes) + Number(aiChanges.changes);
  }

  close(): void {
    if (this.database.isOpen) {
      this.database.close();
    }
  }
}
