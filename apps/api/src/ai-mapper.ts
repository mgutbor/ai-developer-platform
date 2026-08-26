import type { AiInterpretationResponse } from '@ai-developer-platform/contracts';
import type { AIReportInterpretation } from '@ai-developer-platform/ai';
import type { AIInterpretationRecord } from '@ai-developer-platform/persistence';

export function mapAIInterpretation(
  record: AIInterpretationRecord | undefined,
): AiInterpretationResponse {
  if (record === undefined) {
    return {
      contextVersion: null,
      evidenceReferences: [],
      generatedAt: null,
      keyInsights: [],
      limitations: ['AI interpretation is not available for this analysis.'],
      model: null,
      priorities: [],
      promptVersion: null,
      provider: null,
      status: 'unavailable',
      summary: null,
    };
  }
  const interpretation =
    record.interpretation === null
      ? null
      : (JSON.parse(record.interpretation) as AIReportInterpretation);
  return {
    contextVersion: interpretation?.contextVersion ?? record.contextVersion,
    evidenceReferences: interpretation?.evidenceReferences ?? [],
    generatedAt: interpretation?.generatedAt ?? record.generatedAt,
    keyInsights: interpretation?.keyInsights ?? [],
    limitations: interpretation?.limitations ?? [],
    model: record.model,
    priorities: interpretation?.priorities ?? [],
    promptVersion: record.promptVersion,
    provider: record.provider,
    status: record.status,
    summary: interpretation?.summary ?? null,
  };
}
