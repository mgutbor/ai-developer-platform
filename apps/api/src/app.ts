import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import type {
  AnalysisCreatedResponse,
  AnalysisJobResponse,
  AnalysisRequest,
  AnalysisResultResponse,
  ApiErrorResponse,
  HealthResponse,
} from '@ai-developer-platform/contracts';
import { analyze } from '@ai-developer-platform/analyzer';
import { GitHubRestClient, ingestRepository } from '@ai-developer-platform/github';
import { scoreAnalysis } from '@ai-developer-platform/scoring';
import { SqlitePersistence, type PersistenceStore } from '@ai-developer-platform/persistence';
import { AnalysisApplication, ApplicationError } from './application.js';
import { mapAIInterpretation } from './ai-mapper.js';
import { mapAnalysisResult, mapFacts, mapFindings, mapJob, mapRecommendations } from './mapper.js';

export interface BuildAppOptions extends FastifyServerOptions {
  readonly persistence?: PersistenceStore;
  readonly analysisApplication?: AnalysisApplication;
  readonly databasePath?: string;
  /**
   * Injectable fetch for tests. When omitted, the global fetch is used and
   * the GitHub client authenticates with the server-side credential resolved
   * from GITHUB_TOKEN ?? GH_TOKEN (never logged or persisted).
   */
  readonly githubFetch?: typeof fetch;
}

function isAnalysisRequest(value: unknown): value is AnalysisRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['repositoryUrl'] === 'string' &&
    (candidate['ref'] === undefined || typeof candidate['ref'] === 'string')
  );
}

function applicationFrom(
  options: BuildAppOptions,
  persistence: PersistenceStore,
): AnalysisApplication {
  if (options.analysisApplication !== undefined) {
    return options.analysisApplication;
  }
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const client = new GitHubRestClient({
    ...(options.githubFetch === undefined ? {} : { fetch: options.githubFetch }),
    ...(token === undefined || token.trim().length === 0 ? {} : { token: token.trim() }),
  });
  return new AnalysisApplication({
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
    ingest: (repositoryUrl, ref) =>
      ingestRepository(repositoryUrl, client, ref === undefined ? {} : { ref }),
    persistence,
    score: scoreAnalysis,
  });
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const aiRequests = new Map<string, { count: number; startedAt: number }>();
  const aiRequestLimit = 5;
  const aiWindowMs = 60 * 60 * 1000;
  const {
    analysisApplication: suppliedApplication,
    databasePath,
    persistence: suppliedPersistence,
    ...fastifyOptions
  } = options;
  const persistence =
    suppliedPersistence ??
    (suppliedApplication === undefined
      ? new SqlitePersistence(databasePath ?? ':memory:')
      : undefined);
  const analysisApplication =
    suppliedApplication ?? applicationFrom(fastifyOptions, persistence as PersistenceStore);
  const ownsPersistence = suppliedPersistence === undefined && persistence !== undefined;
  const app = Fastify({
    ...fastifyOptions,
    logger: fastifyOptions.logger ?? { level: 'info' },
  });

  app.register(cors, {
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  });

  app.addHook('onSend', async (_request, reply) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('x-frame-options', 'DENY');
    reply.header('referrer-policy', 'no-referrer');
  });

  app.get<{ Reply: HealthResponse }>('/health', async () => ({
    service: 'api',
    status: 'ok',
  }));

  app.post<{ Body: unknown; Reply: AnalysisCreatedResponse | ApiErrorResponse }>(
    '/analyses',
    async (request, reply) => {
      if (!isAnalysisRequest(request.body)) {
        return reply.status(400).send({
          code: 'INVALID_REQUEST',
          message: 'repositoryUrl and optional ref are required',
          status: 'error',
        });
      }
      const created = analysisApplication.createAnalysis(request.body);
      return reply.status(created.existing ? 200 : 202).send({
        id: created.job.id,
        status: created.job.status,
      });
    },
  );

  app.get<{ Params: { id: string }; Reply: AnalysisJobResponse | ApiErrorResponse }>(
    '/analyses/:id',
    async (request) => mapJob(analysisApplication.getJob(request.params.id)),
  );

  app.get<{ Params: { id: string }; Reply: AnalysisResultResponse | ApiErrorResponse }>(
    '/analyses/:id/report',
    async (request) => mapAnalysisResult(analysisApplication.getResult(request.params.id)),
  );

  app.post<{ Params: { id: string }; Reply: unknown }>(
    '/analyses/:id/ai',
    async (request, reply) => {
      const now = Date.now();
      const previous = aiRequests.get(request.params.id);
      const current =
        previous === undefined || now - previous.startedAt >= aiWindowMs
          ? { count: 0, startedAt: now }
          : previous;
      if (current.count >= aiRequestLimit) {
        return reply.status(429).send({
          status: 'error',
          code: 'AI_RATE_LIMITED',
          message: 'AI interpretation request limit reached',
        });
      }
      aiRequests.set(request.params.id, { count: current.count + 1, startedAt: current.startedAt });
      await analysisApplication.generateAIInterpretation(request.params.id);
      return mapAIInterpretation(analysisApplication.getAIInterpretation(request.params.id));
    },
  );

  app.get<{ Params: { id: string }; Reply: unknown }>('/analyses/:id/ai', async (request) =>
    mapAIInterpretation(analysisApplication.getAIInterpretation(request.params.id)),
  );

  app.get<{ Params: { id: string }; Reply: unknown }>('/analyses/:id/findings', async (request) =>
    mapFindings(analysisApplication.getResult(request.params.id)),
  );
  app.get<{ Params: { id: string }; Reply: unknown }>(
    '/analyses/:id/recommendations',
    async (request) => mapRecommendations(analysisApplication.getResult(request.params.id)),
  );
  app.get<{ Params: { id: string }; Reply: unknown }>('/analyses/:id/facts', async (request) =>
    mapFacts(analysisApplication.getResult(request.params.id)),
  );

  app.addHook('onClose', async () => {
    if (ownsPersistence && persistence !== undefined) {
      persistence.close();
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApplicationError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        status: 'error',
      });
    }
    app.log.error(error);
    const statusCode =
      error instanceof Error &&
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      error.statusCode < 500
        ? error.statusCode
        : 500;
    const response: ApiErrorResponse = {
      code: statusCode < 500 ? 'INVALID_REQUEST' : 'INTERNAL_ERROR',
      message: statusCode < 500 && error instanceof Error ? error.message : 'Internal server error',
      status: 'error',
    };
    return reply.status(statusCode).send(response);
  });

  return app;
}
