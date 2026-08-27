import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_FILE_SELECTION_POLICY,
  GitHubIngestionError,
  GitHubRestClient,
  decodeBase64Text,
  ingestRepository,
  isSelectableFile,
  parseRepositoryReference,
  type GitHubClient,
  type GitHubRepository,
  type GitHubTreeResponse,
} from './index.js';

const commitSha = 'abcdef1234567890abcdef1234567890abcdef12';
const repository: GitHubRepository = {
  owner: 'octocat',
  name: 'hello-world',
  htmlUrl: 'https://github.com/octocat/hello-world',
  defaultBranch: 'main',
  isPrivate: false,
  sizeKb: 12,
};

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...headers },
    status,
  });
}

function base64(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

class FixtureClient implements GitHubClient {
  readonly blobs = new Map<
    string,
    { sha: string; size: number; encoding: string; content: string }
  >();
  tree: GitHubTreeResponse = { sha: commitSha, truncated: false, entries: [] };
  refCalls = 0;

  async getRepository(): Promise<GitHubRepository> {
    return repository;
  }

  async resolveRef(): Promise<string> {
    this.refCalls += 1;
    return commitSha;
  }

  async getTree(): Promise<GitHubTreeResponse> {
    return this.tree;
  }

  async getBlob(_owner: string, _repository: string, sha: string) {
    const blob = this.blobs.get(sha);
    if (blob === undefined) {
      throw new GitHubIngestionError('file_unavailable', 'missing fixture blob');
    }
    return blob;
  }
}

describe('repository references', () => {
  it('accepts public HTTPS URLs and normalizes repository identity', () => {
    assert.deepEqual(parseRepositoryReference('https://github.com/OctoCat/Hello-World.git/'), {
      canonicalUrl: 'https://github.com/octocat/hello-world',
      owner: 'octocat',
      repository: 'hello-world',
    });
    assert.deepEqual(parseRepositoryReference('https://github.com/octocat/hello-world/tree/main'), {
      canonicalUrl: 'https://github.com/octocat/hello-world',
      owner: 'octocat',
      ref: 'main',
      repository: 'hello-world',
    });
    assert.deepEqual(parseRepositoryReference('https://github.com/%6fctocat/hello-world'), {
      canonicalUrl: 'https://github.com/octocat/hello-world',
      owner: 'octocat',
      repository: 'hello-world',
    });
    assert.deepEqual(
      parseRepositoryReference('https://github.com/octocat/hello-world', 'feature/api'),
      {
        canonicalUrl: 'https://github.com/octocat/hello-world',
        owner: 'octocat',
        ref: 'feature/api',
        repository: 'hello-world',
      },
    );
  });

  it('rejects non-GitHub hosts, unsafe schemes, malformed paths, and conflicting refs', () => {
    const invalid = [
      'http://github.com/octocat/hello-world',
      'https://evil.example/octocat/hello-world',
      'git@github.com:octocat/hello-world.git',
      'ssh://git@github.com/octocat/hello-world.git',
      'file:///tmp/repository',
      'javascript:alert(1)',
      'data:text/plain,hello',
      'https://github.com/octocat',
      'https://github.com/octocat/hello-world/issues',
      'https://github.com/octocat//hello-world',
      'https://github.com/octocat/hello-world/tree/',
    ];
    for (const value of invalid) {
      assert.throws(() => parseRepositoryReference(value), GitHubIngestionError);
    }
    assert.throws(
      () => parseRepositoryReference('https://github.com/octocat/hello-world/tree/main', 'develop'),
      GitHubIngestionError,
    );
    assert.throws(
      () => parseRepositoryReference('https://github.com/octocat/hello-world', '../secret'),
      GitHubIngestionError,
    );
    assert.throws(
      () => parseRepositoryReference('https://github.com/octocat/hello-world', 'feature name'),
      GitHubIngestionError,
    );
  });
});

describe('GitHubRestClient', () => {
  it('uses only the GitHub API host and sends bounded REST requests', async () => {
    const requests: Request[] = [];
    const client = new GitHubRestClient({
      token: 'secret-token',
      fetch: async (input, init) => {
        const request = new Request(input, init);
        requests.push(request);
        if (request.url.endsWith('/repos/octocat/hello-world')) {
          return jsonResponse({
            owner: { login: 'octocat' },
            name: 'hello-world',
            html_url: 'https://github.com/octocat/hello-world',
            default_branch: 'main',
            private: false,
            size: 12,
          });
        }
        if (request.url.includes('/commits/main')) {
          return jsonResponse({ sha: commitSha });
        }
        if (request.url.includes('/git/trees/')) {
          return jsonResponse({ sha: commitSha, truncated: false, tree: [] });
        }
        return jsonResponse({ sha: 'blobsha', size: 0, encoding: 'base64', content: '' });
      },
    });

    await client.getRepository('octocat', 'hello-world');
    await client.resolveRef('octocat', 'hello-world', 'main');
    await client.getTree('octocat', 'hello-world', commitSha);

    assert.equal(requests.length, 3);
    assert.equal(new URL(requests[0]!.url).hostname, 'api.github.com');
    assert.equal(requests[0]!.redirect, 'manual');
    assert.equal(requests[0]!.headers.get('accept'), 'application/vnd.github+json');
    assert.equal(requests[0]!.headers.get('x-github-api-version'), '2022-11-28');
    assert.equal(requests[0]!.headers.get('authorization'), 'Bearer secret-token');
  });

  it('classifies private repositories and rate limits without exposing response content', async () => {
    const privateClient = new GitHubRestClient({
      fetch: async () =>
        jsonResponse({
          owner: { login: 'octocat' },
          name: 'private',
          html_url: 'https://github.com/octocat/private',
          default_branch: 'main',
          private: true,
          size: 1,
        }),
    });
    await assert.rejects(
      () => privateClient.getRepository('octocat', 'private'),
      (error: unknown) => {
        assert.equal(
          error instanceof GitHubIngestionError && error.category,
          'repository_not_public',
        );
        return true;
      },
    );

    const rateLimitedClient = new GitHubRestClient({
      fetch: async () =>
        jsonResponse({ message: 'sensitive server detail' }, 403, { 'x-ratelimit-remaining': '0' }),
    });
    await assert.rejects(
      () => rateLimitedClient.getRepository('octocat', 'hello-world'),
      (error: unknown) => {
        assert.equal(error instanceof GitHubIngestionError && error.category, 'rate_limited');
        assert.equal(error instanceof Error && error.message.includes('sensitive'), false);
        return true;
      },
    );
  });

  it('retries a rate-limited request at most once when configured', async () => {
    let calls = 0;
    const client = new GitHubRestClient({
      maxRateLimitRetries: 1,
      fetch: async () => {
        calls += 1;
        if (calls === 1) {
          return jsonResponse({ message: 'do not expose this' }, 429, {
            'x-ratelimit-remaining': '0',
          });
        }
        return jsonResponse({
          owner: { login: 'octocat' },
          name: 'hello-world',
          html_url: 'https://github.com/octocat/hello-world',
          default_branch: 'main',
          private: false,
          size: 12,
        });
      },
    });

    const result = await client.getRepository('octocat', 'hello-world');
    assert.equal(result.name, 'hello-world');
    assert.equal(calls, 2);
    assert.equal(client.requestsMade, 2);
  });

  it('classifies transport timeout and request exhaustion', async () => {
    const timeoutClient = new GitHubRestClient({
      limits: { requestTimeoutMs: 5 },
      fetch: async (_input, init) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        }),
    });
    await assert.rejects(
      () => timeoutClient.getRepository('octocat', 'hello-world'),
      (error: unknown) => {
        assert.equal(error instanceof GitHubIngestionError && error.category, 'request_timeout');
        return true;
      },
    );

    const limitedClient = new GitHubRestClient({
      limits: { maxApiRequests: 1 },
      fetch: async () =>
        jsonResponse({
          owner: { login: 'octocat' },
          name: 'hello-world',
          html_url: 'https://github.com/octocat/hello-world',
          default_branch: 'main',
          private: false,
          size: 12,
        }),
    });
    await limitedClient.getRepository('octocat', 'hello-world');
    await assert.rejects(
      () => limitedClient.getRepository('octocat', 'hello-world'),
      (error: unknown) => {
        assert.equal(
          error instanceof GitHubIngestionError && error.category,
          'ingestion_limit_reached',
        );
        return true;
      },
    );
  });

  it('rejects malformed, oversized, and redirected responses', async () => {
    const malformedClient = new GitHubRestClient({
      fetch: async () => new Response('{', { status: 200 }),
    });
    await assert.rejects(
      () => malformedClient.getRepository('octocat', 'hello-world'),
      GitHubIngestionError,
    );

    const oversizedClient = new GitHubRestClient({
      limits: { maxJsonResponseBytes: 4 },
      fetch: async () => jsonResponse({ hello: 'world' }),
    });
    await assert.rejects(
      () => oversizedClient.getRepository('octocat', 'hello-world'),
      GitHubIngestionError,
    );
  });

  it('follows only safe canonical GitHub redirects', async () => {
    let calls = 0;
    const client = new GitHubRestClient({
      fetch: async (input) => {
        calls += 1;
        const request = new Request(input);
        if (calls === 1 && request.url.endsWith('/repos/facebook/react')) {
          return new Response(null, {
            status: 301,
            headers: { location: 'https://api.github.com/repositories/10270250' },
          });
        }
        return jsonResponse({
          owner: { login: 'facebook' },
          name: 'react',
          html_url: 'https://github.com/facebook/react',
          default_branch: 'main',
          private: false,
          size: 100,
        });
      },
    });

    const result = await client.getRepository('facebook', 'react');
    assert.equal(result.name, 'react');
    assert.equal(calls, 2);
    assert.equal(client.requestsMade, 2);
  });

  it('rejects external-host and non-HTTPS redirect targets', async () => {
    for (const location of [
      'https://evil.example/repositories/1',
      'http://api.github.com/repositories/1',
      'https://api.github.com:8443/repositories/1',
    ]) {
      const client = new GitHubRestClient({
        fetch: async () => new Response(null, { status: 301, headers: { location } }),
      });
      await assert.rejects(
        () => client.getRepository('facebook', 'react'),
        (error: unknown) => {
          assert.equal(
            error instanceof GitHubIngestionError && error.category,
            'security_rejected',
          );
          return true;
        },
      );
    }
  });

  it('limits redirect chains and rejects redirects without a location header', async () => {
    let calls = 0;
    const chainClient = new GitHubRestClient({
      maxRedirects: 1,
      fetch: async () => {
        calls += 1;
        return new Response(null, {
          status: 301,
          headers: { location: `https://api.github.com/redirect/${calls}` },
        });
      },
    });
    await assert.rejects(
      () => chainClient.getRepository('facebook', 'react'),
      (error: unknown) => {
        assert.equal(error instanceof GitHubIngestionError && error.category, 'security_rejected');
        return true;
      },
    );
    assert.equal(calls, 2);

    const missingLocationClient = new GitHubRestClient({
      fetch: async () => new Response(null, { status: 301 }),
    });
    await assert.rejects(
      () => missingLocationClient.getRepository('facebook', 'react'),
      (error: unknown) => {
        assert.equal(error instanceof GitHubIngestionError && error.category, 'security_rejected');
        return true;
      },
    );
  });
});

describe('file policy and content decoding', () => {
  it('selects source and metadata files but excludes dependency, generated, binary, and unsafe paths', () => {
    assert.equal(
      isSelectableFile({ path: 'src/app.ts', mode: '100644', type: 'blob', sha: 'a' }),
      true,
    );
    assert.equal(
      isSelectableFile({ path: 'package.json', mode: '100644', type: 'blob', sha: 'b' }),
      true,
    );
    assert.equal(
      isSelectableFile({
        path: 'node_modules/pkg/index.js',
        mode: '100644',
        type: 'blob',
        sha: 'c',
      }),
      false,
    );
    assert.equal(
      isSelectableFile({ path: 'dist/app.js', mode: '100644', type: 'blob', sha: 'd' }),
      false,
    );
    assert.equal(
      isSelectableFile({ path: 'src/app.js.map', mode: '100644', type: 'blob', sha: 'e' }),
      false,
    );
    assert.equal(
      isSelectableFile({ path: 'assets/logo.png', mode: '100644', type: 'blob', sha: 'f' }),
      false,
    );
    assert.equal(
      isSelectableFile({ path: 'link.ts', mode: '120000', type: 'blob', sha: 'g' }),
      false,
    );
    assert.throws(
      () => isSelectableFile({ path: '../secret.ts', mode: '100644', type: 'blob', sha: 'h' }),
      GitHubIngestionError,
    );
    assert.equal(DEFAULT_FILE_SELECTION_POLICY.excludedDirectories.includes('node_modules'), true);
    assert.equal(
      isSelectableFile({ path: 'credentials/config.json', mode: '100644', type: 'blob', sha: 'i' }),
      false,
    );
    assert.equal(
      isSelectableFile({ path: '.env.production', mode: '100644', type: 'blob', sha: 'j' }),
      false,
    );
  });

  it('decodes valid, empty, and rejects malformed or binary content', () => {
    assert.equal(
      decodeBase64Text({ sha: 'a', size: 5, encoding: 'base64', content: base64('hello') }, 10),
      'hello',
    );
    assert.equal(decodeBase64Text({ sha: 'b', size: 0, encoding: 'base64', content: '' }, 10), '');
    assert.throws(
      () => decodeBase64Text({ sha: 'c', size: 1, encoding: 'base64', content: '%%%=' }, 10),
      GitHubIngestionError,
    );
    assert.throws(
      () => decodeBase64Text({ sha: 'd', size: 2, encoding: 'base64', content: base64('\0x') }, 10),
      GitHubIngestionError,
    );
  });
});

describe('bounded repository ingestion', () => {
  it('creates a commit-anchored snapshot and retrieves only bounded text files', async () => {
    const client = new FixtureClient();
    client.tree = {
      sha: commitSha,
      truncated: false,
      entries: [
        { path: 'src/app.ts', mode: '100644', type: 'blob', sha: 'source', size: 5 },
        {
          path: 'node_modules/pkg/index.js',
          mode: '100644',
          type: 'blob',
          sha: 'excluded',
          size: 5,
        },
        { path: 'README.md', mode: '100644', type: 'blob', sha: 'readme', size: 7 },
        { path: 'link.ts', mode: '120000', type: 'blob', sha: 'link', size: 5 },
      ],
    };
    client.blobs.set('source', {
      sha: 'source',
      size: 5,
      encoding: 'base64',
      content: base64('hello'),
    });
    client.blobs.set('readme', {
      sha: 'readme',
      size: 7,
      encoding: 'base64',
      content: base64('# Hello'),
    });

    const result = await ingestRepository('https://github.com/octocat/hello-world', client);
    assert.equal(result.snapshot.commitSha, commitSha);
    assert.equal(result.snapshot.id, `snapshot:octocat/hello-world@${commitSha}`);
    assert.deepEqual(
      result.files.map((file) => file.path),
      ['README.md', 'src/app.ts'],
    );
    assert.ok(result.files.every((file) => file.snapshotId === result.snapshot.id));
    assert.equal(result.metadata.treeTruncated, false);
  });

  it('prioritizes root metadata and source over CI, examples, and docs when the file limit is small', async () => {
    const client = new FixtureClient();
    client.tree = {
      sha: commitSha,
      truncated: false,
      entries: [
        { path: '.github/workflows/ci.yml', mode: '100644', type: 'blob', sha: 'ci', size: 5 },
        { path: 'examples/demo.ts', mode: '100644', type: 'blob', sha: 'demo', size: 5 },
        { path: 'package.json', mode: '100644', type: 'blob', sha: 'manifest', size: 5 },
        { path: 'README.md', mode: '100644', type: 'blob', sha: 'readme', size: 5 },
        { path: 'tsconfig.json', mode: '100644', type: 'blob', sha: 'tsconfig', size: 5 },
        { path: 'src/app.ts', mode: '100644', type: 'blob', sha: 'app', size: 5 },
        { path: 'src/app.test.ts', mode: '100644', type: 'blob', sha: 'apptest', size: 5 },
        { path: 'docs/architecture.md', mode: '100644', type: 'blob', sha: 'docs', size: 5 },
        {
          path: '.devcontainer/devcontainer.json',
          mode: '100644',
          type: 'blob',
          sha: 'devcontainer',
          size: 5,
        },
      ],
    };
    const blobContents: readonly (readonly [string, string])[] = [
      ['ci', 'jobs:\n'],
      ['demo', 'demo();\n'],
      ['manifest', '{}\n'],
      ['readme', '# hi\n'],
      ['tsconfig', '{}\n'],
      ['app', 'app();\n'],
      ['apptest', 'test();\n'],
      ['docs', '# docs\n'],
      ['devcontainer', '{}\n'],
    ];
    for (const [sha, content] of blobContents) {
      client.blobs.set(sha, {
        sha,
        size: content.length,
        encoding: 'base64',
        content: base64(content),
      });
    }

    const result = await ingestRepository('https://github.com/octocat/hello-world', client, {
      limits: { maxFileCount: 5 },
    });
    const paths = result.files.map((file) => file.path);
    assert.ok(paths.includes('package.json'));
    assert.ok(paths.includes('README.md'));
    assert.ok(paths.includes('tsconfig.json'));
    assert.ok(paths.includes('.github/workflows/ci.yml'));
    assert.ok(paths.includes('src/app.ts'));
    assert.equal(paths.includes('examples/demo.ts'), false);
    assert.equal(paths.includes('src/app.test.ts'), false);
    assert.equal(paths.includes('docs/architecture.md'), false);
    const index = (path: string): number => {
      const position = paths.indexOf(path);
      assert.ok(position >= 0, `expected ${path} in ${paths.join(', ')}`);
      return position;
    };
    assert.ok(index('package.json') < index('.github/workflows/ci.yml'));
    assert.ok(index('.github/workflows/ci.yml') < index('src/app.ts'));
    assert.ok(result.limitations.includes('file_count_limit_reached'));

    const second = await ingestRepository('https://github.com/octocat/hello-world', client, {
      limits: { maxFileCount: 5 },
    });
    assert.deepEqual(
      second.files.map((file) => file.path),
      paths,
    );
  });

  it('keeps source files in the selection even when CI workflows dominate the tree', async () => {
    const client = new FixtureClient();
    const entries: { path: string; mode: string; type: 'blob'; sha: string; size: number }[] = [];
    for (let index = 0; index < 12; index += 1) {
      entries.push({
        path: `.github/workflows/wf-${index}.yml`,
        mode: '100644',
        type: 'blob',
        sha: `wf${index}`,
        size: 5,
      });
    }
    entries.push(
      { path: 'package.json', mode: '100644', type: 'blob', sha: 'pkg', size: 5 },
      { path: 'angular.json', mode: '100644', type: 'blob', sha: 'ng', size: 5 },
      { path: 'tsconfig.json', mode: '100644', type: 'blob', sha: 'tsc', size: 5 },
      { path: 'src/app.component.ts', mode: '100644', type: 'blob', sha: 'app', size: 5 },
      { path: 'src/main.ts', mode: '100644', type: 'blob', sha: 'main', size: 5 },
    );
    client.tree = { sha: commitSha, truncated: false, entries };
    const contents: (readonly [string, string])[] = [
      ['pkg', '{}\n'],
      ['ng', '{}\n'],
      ['tsc', '{}\n'],
      ['app', 'component();\n'],
      ['main', 'main();\n'],
    ];
    for (let index = 0; index < 12; index += 1) {
      contents.push([`wf${index}`, 'jobs:\n']);
    }
    for (const [sha, content] of contents) {
      client.blobs.set(sha, {
        sha,
        size: content.length,
        encoding: 'base64',
        content: base64(content),
      });
    }

    const result = await ingestRepository('https://github.com/octocat/hello-world', client, {
      limits: { maxFileCount: 8 },
    });
    const paths = result.files.map((file) => file.path);
    assert.ok(paths.includes('package.json'));
    assert.ok(paths.includes('angular.json'));
    assert.ok(paths.includes('tsconfig.json'));
    assert.ok(paths.includes('src/app.component.ts'));
    assert.ok(paths.includes('src/main.ts'));
    assert.equal(paths.filter((path) => path.startsWith('.github/workflows/')).length, 2);
  });

  it('preserves explicit limitations for truncated trees, large files, binary data, and limits', async () => {
    const client = new FixtureClient();
    client.tree = {
      sha: commitSha,
      truncated: true,
      entries: [
        { path: 'large.ts', mode: '100644', type: 'blob', sha: 'large', size: 20 },
        { path: 'binary.json', mode: '100644', type: 'blob', sha: 'binary', size: 2 },
        { path: 'src/one.ts', mode: '100644', type: 'blob', sha: 'one', size: 3 },
        { path: 'src/two.ts', mode: '100644', type: 'blob', sha: 'two', size: 3 },
      ],
    };
    client.blobs.set('binary', {
      sha: 'binary',
      size: 2,
      encoding: 'base64',
      content: base64('\0x'),
    });
    client.blobs.set('one', { sha: 'one', size: 3, encoding: 'base64', content: base64('one') });
    client.blobs.set('two', { sha: 'two', size: 3, encoding: 'base64', content: base64('two') });

    const result = await ingestRepository('https://github.com/octocat/hello-world', client, {
      limits: { maxFileBytes: 10, maxTotalBytes: 3, maxFileCount: 2 },
    });
    assert.equal(result.files.length, 1);
    assert.equal(result.metadata.treeTruncated, true);
    assert.ok(result.limitations.includes('tree_truncated'));
    assert.ok(result.limitations.includes('file_too_large:large.ts'));
    assert.ok(result.limitations.includes('total_file_bytes_limit_reached'));
  });

  it('enforces the request limit with an injected client', async () => {
    const client = new FixtureClient();
    client.tree = {
      sha: commitSha,
      truncated: false,
      entries: [{ path: 'src/app.ts', mode: '100644', type: 'blob', sha: 'source', size: 5 }],
    };
    client.blobs.set('source', {
      sha: 'source',
      size: 5,
      encoding: 'base64',
      content: base64('hello'),
    });

    await assert.rejects(
      () =>
        ingestRepository('https://github.com/octocat/hello-world', client, {
          limits: { maxApiRequests: 3 },
        }),
      (error: unknown) => {
        assert.equal(
          error instanceof GitHubIngestionError && error.category,
          'ingestion_limit_reached',
        );
        return true;
      },
    );
  });

  it('enforces the ingestion timeout even when an injected client ignores cancellation', async () => {
    const client: GitHubClient = {
      getRepository: () => new Promise<GitHubRepository>(() => undefined),
      resolveRef: () => new Promise<string>(() => undefined),
      getTree: () => new Promise<GitHubTreeResponse>(() => undefined),
      getBlob: () => new Promise(() => undefined),
    };

    await assert.rejects(
      () =>
        ingestRepository('https://github.com/octocat/hello-world', client, {
          limits: { ingestionTimeoutMs: 5 },
        }),
      (error: unknown) => {
        assert.equal(error instanceof GitHubIngestionError && error.category, 'request_timeout');
        return true;
      },
    );
  });

  it('produces the same logical snapshot for the same commit', async () => {
    const client = new FixtureClient();
    client.tree = { sha: commitSha, truncated: false, entries: [] };
    const first = await ingestRepository('https://github.com/octocat/hello-world', client);
    const second = await ingestRepository('https://github.com/octocat/hello-world', client);
    assert.deepEqual(
      {
        owner: first.snapshot.owner,
        name: first.snapshot.name,
        commitSha: first.snapshot.commitSha,
        id: first.snapshot.id,
      },
      {
        owner: second.snapshot.owner,
        name: second.snapshot.name,
        commitSha: second.snapshot.commitSha,
        id: second.snapshot.id,
      },
    );
    assert.equal(client.refCalls, 2);
  });
});
