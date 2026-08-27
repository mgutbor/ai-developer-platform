import { performance } from 'node:perf_hooks';
import { GitHubRestClient, ingestRepository } from '@ai-developer-platform/github';
import { analyze } from '@ai-developer-platform/analyzer';
import { scoreAnalysis } from '@ai-developer-platform/scoring';

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
if (token === undefined || token.trim().length === 0) {
  process.stdout.write('BENCHMARK BLOCKED — GITHUB_TOKEN/GH_TOKEN required\n');
  process.exit(1);
}

const repositories = [
  'microsoft/TypeScript',
  'nodejs/node',
  'nestjs/nest',
  'angular/angular',
  'facebook/react',
] as const;
const fileCounts = [10, 50, 100] as const;

for (const repository of repositories) {
  for (const maxFileCount of fileCounts) {
    const client = new GitHubRestClient({ token });
    const started = performance.now();
    try {
      const result = await ingestRepository(`https://github.com/${repository}`, client, {
        limits: { maxFileCount },
      });
      const analyzed = analyze(result);
      const scored = scoreAnalysis(analyzed);
      process.stdout.write(
        JSON.stringify({
          repository,
          branch: result.snapshot.ref,
          commitSha: result.snapshot.commitSha,
          maxFileCount,
          status: 'ok',
          requests: client.requestsMade,
          selectedFiles: result.metadata.selectedFileCount,
          processedBytes: result.metadata.totalBytes,
          findings: scored.findings.length,
          coverage: scored.coverage,
          limitations: result.limitations,
          latencyMs: performance.now() - started,
        }) + '\n',
      );
    } catch (error) {
      process.stdout.write(
        JSON.stringify({
          repository,
          maxFileCount,
          status: 'failed',
          error:
            error !== null && typeof error === 'object' && 'category' in error
              ? String(error.category)
              : error instanceof Error
                ? error.name
                : 'unknown',
          requests: client.requestsMade,
          latencyMs: performance.now() - started,
        }) + '\n',
      );
    }
  }
}
