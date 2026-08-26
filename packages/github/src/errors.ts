export type GitHubErrorCategory =
  | 'invalid_repository'
  | 'repository_not_found'
  | 'repository_not_public'
  | 'invalid_ref'
  | 'commit_resolution_failed'
  | 'tree_unavailable'
  | 'tree_truncated'
  | 'file_unavailable'
  | 'file_too_large'
  | 'unsupported_file'
  | 'rate_limited'
  | 'github_unavailable'
  | 'request_timeout'
  | 'invalid_response'
  | 'content_decode_failed'
  | 'security_rejected'
  | 'ingestion_limit_reached';

export class GitHubIngestionError extends Error {
  readonly category: GitHubErrorCategory;
  readonly statusCode: number | undefined;
  readonly retryAfterSeconds: number | undefined;

  constructor(
    category: GitHubErrorCategory,
    message: string,
    options: { statusCode?: number; retryAfterSeconds?: number } = {},
  ) {
    super(message);
    this.name = 'GitHubIngestionError';
    this.category = category;
    this.statusCode = options.statusCode;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
