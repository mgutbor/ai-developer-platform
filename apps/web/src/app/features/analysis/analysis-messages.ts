/**
 * User-facing message mapping for the analysis flow.
 *
 * Pure helpers so the pages stay thin and the messaging is unit-testable.
 * Internal codes from the API are translated to plain language; the internal
 * codes may still be shown as secondary detail where useful, but never as the
 * primary explanation.
 */

/** Map a job `errorCode` to a short user-facing failure explanation. */
export function failureMessage(errorCode: string | null | undefined): string {
  switch (errorCode) {
    case 'SNAPSHOT_LIMIT_EXCEEDED':
      return (
        'This repository is too large to analyze completely within the configured limits. ' +
        'The analysis could not be completed, and the result must not be interpreted as a ' +
        'complete repository analysis. This is not necessarily a problem with the repository.'
      );
    case 'REPOSITORY_NOT_FOUND':
      return 'The repository could not be found. Check the URL — it must point to a public repository on github.com.';
    case 'REPOSITORY_NOT_PUBLIC':
      return 'Only public GitHub repositories can be analyzed. This repository is private.';
    case 'REF_NOT_FOUND':
      return 'The requested branch or tag could not be found in the repository.';
    case 'GITHUB_RATE_LIMITED':
      return 'GitHub’s API rate limit was reached. Please wait a moment and try again.';
    case 'ANALYSIS_TIMEOUT':
      return 'The analysis took too long and timed out. Please try again later.';
    default:
      return 'We could not complete this analysis. Please try again.';
  }
}

/** Map an API coverage value to a short plain-language explanation. */
export function coverageMessage(coverage: string | null | undefined): string {
  switch (coverage) {
    case 'complete':
      return 'This analysis inspected a complete snapshot of the repository.';
    case 'partial':
      return (
        'This analysis was performed on a bounded snapshot of the repository. Some files could ' +
        'not be included within the configured analysis limits.'
      );
    case 'insufficient':
      return (
        'This analysis had only a small or partial snapshot to work with. Findings and scores are ' +
        'based on limited information and do not represent an exhaustive review.'
      );
    default:
      return 'The coverage of this analysis is not known.';
  }
}

/** Map a single internal limitation code to a user-facing message (friendly first). */
export function limitationMessage(limitation: string): {
  readonly message: string;
  readonly code: string;
} {
  const code = limitation;
  if (code === 'tree_segmented_early_termination' || code === 'tree_segmented_acquisition') {
    return {
      code,
      message:
        'The repository snapshot was assembled in bounded segments, so not every file was inspected.',
    };
  }
  if (code === 'tree_truncated') {
    return {
      code,
      message:
        'A directory listing was truncated, so part of the repository could not be inspected.',
    };
  }
  if (code === 'tree_entry_limit_reached') {
    return {
      code,
      message: 'The maximum number of tracked entries was reached while assembling the snapshot.',
    };
  }
  if (code === 'file_count_limit_reached') {
    return {
      code,
      message: 'The maximum number of files for one analysis was reached.',
    };
  }
  if (code === 'total_file_bytes_limit_reached') {
    return {
      code,
      message: 'The total size of the fetched files reached the configured limit.',
    };
  }
  if (code.startsWith('file_too_large:')) {
    const path = code.slice('file_too_large:'.length);
    return {
      code,
      message: `The file “${path}” was too large to include in the analysis.`,
    };
  }
  if (code === 'import_count_limit_reached') {
    return {
      code,
      message: 'A file with a very high number of imports was only partially inspected.',
    };
  }
  if (code === 'ingestion_limit_reached') {
    return {
      code,
      message: 'The configured request limit was reached while fetching repository data.',
    };
  }
  if (code === 'Global score is intentionally not calculated in the MVP.') {
    return {
      code,
      message:
        'No overall score is calculated in this version; dimension scores are shown instead.',
    };
  }
  return { code, message: limitation };
}
