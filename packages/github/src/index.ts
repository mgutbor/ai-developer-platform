export { GitHubIngestionError } from './errors.js';
export type { GitHubErrorCategory } from './errors.js';
export { GitHubRestClient } from './rest-client.js';
export type { GitHubRestClientOptions } from './rest-client.js';
export { ingestRepository, decodeBase64Text } from './ingestion.js';
export type { IngestRepositoryOptions } from './ingestion.js';
export type { RepositoryReference } from './reference.js';
export { parseRepositoryReference, validateRef } from './reference.js';
export {
  DEFAULT_FILE_SELECTION_POLICY,
  DEFAULT_INGESTION_LIMITS,
  isSelectableFile,
  normalizeSelectedPath,
} from './policy.js';
export type {
  FileSelectionPolicy,
  GitHubBlobResponse,
  GitHubClient,
  GitHubClientRequestOptions,
  GitHubRepository,
  GitHubTreeEntry,
  GitHubTreeResponse,
  IngestionLimits,
  IngestionResult,
  RepositoryFile,
} from './types.js';
