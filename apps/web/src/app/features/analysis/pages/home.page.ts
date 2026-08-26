import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AnalysisService } from '../../../core/api/analysis.service';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-home-page',
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly analysisService = inject(AnalysisService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly form = this.formBuilder.group({
    repositoryUrl: [
      '',
      [Validators.required, Validators.pattern(/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/)],
    ],
    ref: [''],
  });

  submit(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue();
    const request =
      value.ref.trim() === ''
        ? { repositoryUrl: value.repositoryUrl }
        : { repositoryUrl: value.repositoryUrl, ref: value.ref.trim() };
    this.analysisService.createAnalysis(request).subscribe({
      next: (response) => {
        this.submitting.set(false);
        void this.router.navigate(['/analyses', response.id]);
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set(
          'We could not start this analysis. Check the repository URL and try again.',
        );
      },
    });
  }
}
