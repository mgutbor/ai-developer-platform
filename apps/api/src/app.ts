import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import type { HealthResponse } from '@ai-developer-platform/contracts';

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify({
    ...options,
    logger: options.logger ?? { level: 'info' },
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
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    const statusCode =
      error instanceof Error &&
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      error.statusCode < 500
        ? error.statusCode
        : 500;
    const message =
      statusCode < 500 && error instanceof Error ? error.message : 'Internal server error';

    return reply.status(statusCode).send({
      message,
      status: 'error',
    });
  });

  return app;
}
