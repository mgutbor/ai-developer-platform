import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';

describe('API', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await app.close();
  });

  it('returns the API health status', async () => {
    app = buildApp({ logger: false });

    const response = await app.inject({
      headers: {
        origin: 'http://127.0.0.1:4200',
      },
      method: 'GET',
      url: '/health',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['access-control-allow-origin'], 'http://127.0.0.1:4200');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.deepEqual(response.json(), {
      service: 'api',
      status: 'ok',
    });
  });
});
