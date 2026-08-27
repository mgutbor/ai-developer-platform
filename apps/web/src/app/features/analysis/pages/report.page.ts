import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type {
  AiInterpretationResponse,
  AnalysisResultResponse,
  ApiCoverage,
  ApiEvidence,
  ApiFinding,
  ApiRecommendation,
} from '@ai-developer-platform/contracts';
import { AnalysisService } from '../../../core/api/analysis.service';
import { coverageMessage, evidenceStatusLabel, limitationMessage } from '../analysis-messages';

@Component({
  imports: [RouterLink],
  selector: 'app-report-page',
  templateUrl: './report.page.html',
  styleUrl: './report.page.scss',
})
export class ReportPage {
  private readonly route = inject(ActivatedRoute);
  private readonly analysisService = inject(AnalysisService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly analysisId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly report = signal<AnalysisResultResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly ai = signal<AiInterpretationResponse | null>(null);
  protected readonly aiLoading = signal(false);
  protected readonly aiError = signal(false);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.analysisService
      .getReport(this.analysisId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  protected requestAI(): void {
    this.aiLoading.set(true);
    this.aiError.set(false);
    this.analysisService
      .generateAI(this.analysisId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (interpretation) => {
          this.ai.set(interpretation);
          this.aiLoading.set(false);
        },
        error: () => {
          this.aiLoading.set(false);
          this.aiError.set(true);
        },
      });
  }

  protected evidenceFor(
    finding: ApiFinding,
    report: AnalysisResultResponse,
  ): readonly ApiEvidence[] {
    return report.evidence.filter((evidence) => finding.evidenceIds.includes(evidence.id));
  }

  protected recommendationsFor(
    finding: ApiFinding,
    report: AnalysisResultResponse,
  ): readonly ApiRecommendation[] {
    return report.recommendations.filter((recommendation) =>
      finding.recommendationIds.includes(recommendation.id),
    );
  }

  protected coverageExplanation(coverage: ApiCoverage | null | undefined): string {
    return coverageMessage(coverage);
  }

  protected limitationExplanation(limitation: string): { message: string; code: string } {
    return limitationMessage(limitation);
  }

  protected evidenceStatus(status: string | null | undefined): {
    label: string;
    explanation: string;
  } {
    return evidenceStatusLabel(status);
  }

  protected scopeDescription(report: AnalysisResultResponse): string | null {
    const scope = report.inspectedScope;
    if (scope === undefined || scope === null) {
      return null;
    }
    if (report.coverage === 'complete') {
      return `Inspected ${scope.fileCount} file(s) in this snapshot.`;
    }
    return (
      `Inspected ${scope.fileCount} file(s) out of ${scope.treeEntriesSeen} tree entries. ` +
      `This is a partial snapshot, not a complete repository analysis.`
    );
  }
}
