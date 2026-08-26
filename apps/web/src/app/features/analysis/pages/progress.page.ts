import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, exhaustMap, interval, startWith } from 'rxjs';
import type { AnalysisJobResponse, AnalysisJobStatus } from '@ai-developer-platform/contracts';
import { AnalysisService } from '../../../core/api/analysis.service';

const terminalStatuses: readonly AnalysisJobStatus[] = [
  'completed',
  'completed_with_limitations',
  'failed',
  'cancelled',
];

@Component({
  imports: [RouterLink],
  selector: 'app-progress-page',
  templateUrl: './progress.page.html',
  styleUrl: './progress.page.scss',
})
export class ProgressPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly analysisService = inject(AnalysisService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly analysisId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly job = signal<AnalysisJobResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  constructor() {
    interval(4000)
      .pipe(
        startWith(0),
        exhaustMap(() =>
          this.analysisService.getAnalysis(this.analysisId).pipe(
            catchError(() => {
              this.loading.set(false);
              this.error.set(true);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((job) => {
        this.job.set(job);
        this.loading.set(false);
        this.error.set(false);
        if (terminalStatuses.includes(job.status) && job.resultAvailable) {
          void this.router.navigate(['/analyses', this.analysisId, 'report']);
        }
      });
  }

  protected retry(): void {
    this.error.set(false);
    this.loading.set(true);
    this.analysisService.getAnalysis(this.analysisId).subscribe({
      next: (job) => {
        this.job.set(job);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  protected statusMessage(status: AnalysisJobStatus | undefined): string {
    switch (status) {
      case 'queued':
        return 'Your analysis is queued.';
      case 'running':
        return 'We are analyzing the repository…';
      case 'completed':
        return 'Analysis completed.';
      case 'completed_with_limitations':
        return 'Analysis completed with limitations.';
      case 'failed':
        return 'The analysis failed.';
      case 'cancelled':
        return 'The analysis was cancelled.';
      default:
        return 'Loading analysis status…';
    }
  }
}
