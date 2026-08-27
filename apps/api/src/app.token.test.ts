import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';

describe('API GitHub credential wiring (Phase 23 regression)', () => {
  let app: FastifyInstance;
  let previousGitHubToken: string | undefined;
  let previousGhToken: string | undefined;

  afterEach(async () => {
    await app.close();
    if (previousGitHubToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = previousGitHubToken;
    }
    if (previousGhToken === undefined) {
      delete process.env.GH_TOKEN;
    } else {
      process.env.GH_TOKEN = previousGhToken;
    }
  });

  it('passes the server-side GITHUB_TOKEN to the GitHub client', async () => {
    previousGitHubToken = process.env.GITHUB_TOKEN;
    previousGhToken = process.env.GH_TOKEN;
    process.env.GITHUB_TOKEN = 'phase23-regression-token';
    delete process.env.GH_TOKEN;

    const captured: string[] = [];
    const stubFetch: typeof fetch = (async (_input, init) => {
      const authorization = (init as RequestInit | undefined)?.headers as
        Record<string, string> | Headers | undefined;
      if (authorization !== undefined) {
        const value =
          authorization instanceof Headers
            ? authorization.get('Authorization')
            : (authorization as Record<string, string>)['Authorization'];
        if (value !== undefined && value !== null) {
          captured.push(value);
        }
      }
      // Canned valid public repository payload for the repository request.
      return new Response(
        JSON.stringify({
          default_branch: 'main',
          html_url: 'https://github.com/octocat/Hello-World',
          name: 'Hello-World',
          owner: { login: 'octocat' },
          private: false,
          size: 1,
        }),
        {
          headers: { 'content-type': 'application/json' },
          status: 200,
        },
      );
    }) as typeof fetch;

    app = buildApp({ githubFetch: stubFetch, logger: false });

    const response = await app.inject({
      method: 'POST',
      payload: { repositoryUrl: 'https://github.com/octocat/Hello-World' },
      url: '/analyses',
    });
    assert.equal(response.statusCode, 202);

    // Wait for the in-process runner to perform the first GitHub request.
    let waited = 0;
    while (captured.length === 0 && waited < 50) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      waited += 1;
    }

    assert.ok(captured.length > 0, 'GitHub client made a request');
    assert.equal(captured[0], 'Bearer phase23-regression-token');
  });

  it('falls back to GH_TOKEN when GITHUB_TOKEN is not set', async () => {
    previousGitHubToken = process.env.GITHUB_TOKEN;
    previousGhToken = process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
    process.env.GH_TOKEN = 'phase23-regression-gh-token';

    const captured: string[] = [];
    const stubFetch: typeof fetch = (async (_input, init) => {
      const authorization = (init as RequestInit | undefined)?.headers as
        Record<string, string> | Headers | undefined;
      if (authorization !== undefined) {
        const value =
          authorization instanceof Headers
            ? authorization.get('Authorization')
            : (authorization as Record<string, string>)['Authorization'];
        if (value !== undefined && value !== null) {
          captured.push(value);
        }
      }
      return new Response(
        JSON.stringify({
          default_branch: 'main',
          html_url: 'https://github.com/octocat/Hello-World',
          name: 'Hello-World',
          owner: { login: 'octocat' },
          private: false,
          size: 1,
        }),
        {
          headers: { 'content-type': 'application/json' },
          status: 200,
        },
      );
    }) as typeof fetch;

    app = buildApp({ githubFetch: stubFetch, logger: false });

    const response = await app.inject({
      method: 'POST',
      payload: { repositoryUrl: 'https://github.com/octocat/Hello-World' },
      url: '/analyses',
    });
    assert.equal(response.statusCode, 202);

    let waited = 0;
    while (captured.length === 0 && waited < 50) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      waited += 1;
    }

    assert.ok(captured.length > 0, 'GitHub client made a request');
    assert.equal(captured[0], 'Bearer phase23-regression-gh-token');
  });
});
