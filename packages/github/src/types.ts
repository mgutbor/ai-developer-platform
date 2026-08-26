import type { RepositorySnapshot } from '@ai-developer-platform/domain';

export interface GitHubClientRequestOptions {
  readonly signal?: AbortSignal;
}

export interface GitHubClient {
  getRepository(
    owner: string,
    repository: string,
    options?: GitHubClientRequestOptions,
  ): Promise<GitHubRepository>;
  resolveRef(
    owner: string,
    repository: string,
    ref: string,
    options?: GitHubClientRequestOptions,
  ): Promise<string>;
  getTree(
    owner: string,
    repository: string,
    commitSha: string,
    options?: GitHubClientRequestOptions,
  ): Promise<GitHubTreeResponse>;
  getBlob(
    owner: string,
    repository: string,
    blobSha: string,
    options?: GitHubClientRequestOptions,
  ): Promise<GitHubBlobResponse>;
}

export interface GitHubRepository {
  readonly owner: string;
  readonly name: string;
  readonly htmlUrl: string;
  readonly defaultBranch: string;
  readonly isPrivate: boolean;
  readonly sizeKb: number;
}

export interface GitHubTreeEntry {
  readonly path: string;
  readonly mode: string;
  readonly type: 'blob' | 'tree' | 'commit' | string;
  readonly sha: string;
  readonly size?: number;
  readonly url?: string;
}

export interface GitHubTreeResponse {
  readonly sha: string;
  readonly truncated: boolean;
  readonly entries: readonly GitHubTreeEntry[];
}

export interface GitHubBlobResponse {
  readonly sha: string;
  readonly size: number;
  readonly encoding: string;
  readonly content: string;
}

export interface RepositoryFile {
  readonly snapshotId: string;
  readonly path: string;
  readonly sha: string;
  readonly size: number;
  readonly content: string;
}

export interface IngestionLimits {
  readonly maxFileCount: number;
  readonly maxFileBytes: number;
  readonly maxTotalBytes: number;
  readonly maxTreeEntries: number;
  readonly maxApiRequests: number;
  readonly requestTimeoutMs: number;
  readonly ingestionTimeoutMs: number;
  readonly maxJsonResponseBytes: number;
}

export interface FileSelectionPolicy {
  readonly allowedExtensions: readonly string[];
  readonly metadataFileNames: readonly string[];
  readonly excludedDirectories: readonly string[];
  readonly excludedFilePatterns: readonly RegExp[];
}

export interface IngestionResult {
  readonly snapshot: RepositorySnapshot;
  readonly files: readonly RepositoryFile[];
  readonly metadata: {
    readonly treeEntriesSeen: number;
    readonly selectedFileCount: number;
    readonly totalBytes: number;
    readonly treeTruncated: boolean;
  };
  readonly limitations: readonly string[];
}
