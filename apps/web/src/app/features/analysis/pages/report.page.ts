import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type {
  AnalysisResultResponse,
  ApiEvidence,
  ApiFinding,
  ApiRecommendation,
} from '@ai-developer-platform/contracts';
import { AnalysisService } from '../../../core/api/analysis.service';

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
}
