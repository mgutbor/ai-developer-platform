import { describe, expect, it } from 'vitest';
import {
  coverageMessage,
  evidenceStatusLabel,
  failureMessage,
  limitationMessage,
  severityExplanation,
} from './analysis-messages';

describe('analysis-messages', () => {
  describe('failureMessage', () => {
    it('explains snapshot limit exceeded without blaming the repository', () => {
      const message = failureMessage('SNAPSHOT_LIMIT_EXCEEDED');
      expect(message).toContain('too large to analyze completely');
      expect(message).toContain('not necessarily a problem with the repository');
    });

    it('explains repository not found with a usable hint', () => {
      const message = failureMessage('REPOSITORY_NOT_FOUND');
      expect(message).toContain('could not be found');
      expect(message).toContain('public');
    });

    it('explains rate limiting', () => {
      expect(failureMessage('GITHUB_RATE_LIMITED')).toContain('rate limit');
    });

    it('falls back to a generic message for unknown codes', () => {
      expect(failureMessage('SOMETHING_ELSE')).toContain('could not complete');
    });

    it('falls back for null or undefined', () => {
      expect(failureMessage(null)).toContain('could not complete');
      expect(failureMessage(undefined)).toContain('could not complete');
    });
  });

  describe('coverageMessage', () => {
    it('distinguishes complete coverage', () => {
      expect(coverageMessage('complete')).toContain('complete snapshot');
    });

    it('distinguishes partial coverage with bounded-snapshot language', () => {
      const message = coverageMessage('partial');
      expect(message).toContain('bounded snapshot');
      expect(message).toContain('Some files could not be included');
    });

    it('distinguishes insufficient coverage from exhaustive analysis', () => {
      const message = coverageMessage('insufficient');
      expect(message).toContain('do not represent an exhaustive review');
    });

    it('handles unknown coverage', () => {
      expect(coverageMessage(null)).toContain('not known');
    });
  });

  describe('severityExplanation', () => {
    it('frames high severity as a deterministic in-snapshot estimate, not absolute risk', () => {
      const explanation = severityExplanation('high');
      expect(explanation).toContain('deterministic estimate');
      expect(explanation).toContain('not an absolute business risk');
    });

    it('tells the developer to check evidence before acting on medium findings', () => {
      expect(severityExplanation('medium')).toContain('evidence status');
    });

    it('frames low severity as lower priority within the inspected snapshot', () => {
      expect(severityExplanation('low')).toContain('inspected snapshot');
    });

    it('falls back for unknown or missing severity', () => {
      expect(severityExplanation(null)).toContain('deterministic estimate');
      expect(severityExplanation('nope')).toContain('deterministic estimate');
    });
  });

  describe('evidenceStatusLabel', () => {
    it('labels verified evidence as concrete', () => {
      const { label, explanation } = evidenceStatusLabel('verified');
      expect(label).toContain('Verified');
      expect(explanation).toContain('Concrete evidence');
    });

    it('explains absence-based evidence is scoped to inspected files', () => {
      const { label, explanation } = evidenceStatusLabel('absence_based');
      expect(label).toContain('inspected scope');
      expect(explanation).toContain('does not prove the element is absent');
    });

    it('explains not-inspected findings never claim absence', () => {
      const { label, explanation } = evidenceStatusLabel('not_inspected');
      expect(label).toContain('Not enough information');
      expect(explanation).toContain('cannot confirm');
    });

    it('explains not-verified findings should not be read as proven', () => {
      const { label, explanation } = evidenceStatusLabel('not_verified');
      expect(label).toContain('Not verified');
      expect(explanation).toContain('should not be read as proven');
    });

    it('handles unknown status', () => {
      const { label } = evidenceStatusLabel(null);
      expect(label).toContain('unknown');
    });
  });

  describe('limitationMessage', () => {
    it('translates segmented acquisition to plain language', () => {
      const { message, code } = limitationMessage('tree_segmented_early_termination');
      expect(message).toContain('bounded segments');
      expect(code).toBe('tree_segmented_early_termination');
    });

    it('explains file-too-large with the file path', () => {
      const { message } = limitationMessage('file_too_large:pnpm-lock.yaml');
      expect(message).toContain('pnpm-lock.yaml');
      expect(message).toContain('too large');
    });

    it('keeps the internal code as secondary detail', () => {
      const { code, message } = limitationMessage('file_count_limit_reached');
      expect(code).toBe('file_count_limit_reached');
      expect(message).not.toBe(code);
    });

    it('passes through unknown limitations unchanged', () => {
      const { message, code } = limitationMessage('some_unknown_code');
      expect(message).toBe('some_unknown_code');
      expect(code).toBe('some_unknown_code');
    });
  });
});
