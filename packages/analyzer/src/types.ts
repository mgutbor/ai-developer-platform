import type { RepositorySnapshot } from '@ai-developer-platform/domain';

export interface AnalyzerFile {
  readonly path: string;
  readonly sha: string;
  readonly size: number;
  readonly content: string;
  readonly snapshotId: string;
}

export interface AnalyzerInput {
  readonly snapshot: RepositorySnapshot;
  readonly files: readonly AnalyzerFile[];
  readonly limitations?: readonly string[];
}

export interface AnalyzerOptions {
  readonly analyzerVersion?: string;
  readonly ruleSetVersion?: string;
  readonly maxSourceFileLines?: number;
  readonly maxTodoCount?: number;
  readonly maxImportCount?: number;
}

export type FileClassification =
  | 'source'
  | 'test'
  | 'config'
  | 'documentation'
  | 'generated'
  | 'dependency_metadata'
  | 'ci'
  | 'unknown';

export interface ClassifiedFile extends AnalyzerFile {
  readonly classification: FileClassification;
  readonly language?: 'typescript' | 'javascript';
}

export interface ImportReference {
  readonly path: string;
  readonly sourcePath: string;
  readonly line: number;
  readonly column: number;
  readonly kind: 'relative' | 'external';
}

export interface AnalyzerLimits {
  readonly maxSourceFileLines: number;
  readonly maxTodoCount: number;
  readonly maxImportCount: number;
}

export const DEFAULT_ANALYZER_OPTIONS: Required<AnalyzerLimits> & {
  readonly analyzerVersion: string;
  readonly ruleSetVersion: string;
} = Object.freeze({
  analyzerVersion: '0.1.0',
  maxImportCount: 40,
  maxSourceFileLines: 400,
  maxTodoCount: 10,
  ruleSetVersion: '0.1.0',
});
