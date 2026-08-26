import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { environment } from '../../../../environments/environment';
import { routes } from '../../../app.routes';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('does not submit an invalid repository URL', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.componentInstance.form.controls.repositoryUrl.setValue('https://example.com/repo');
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.form.invalid).toBe(true);
  });

  it('creates an analysis and navigates to its progress page', async () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.componentInstance.form.controls.repositoryUrl.setValue(
      'https://github.com/octocat/Hello-World',
    );
    fixture.componentInstance.submit();
    const request = http.expectOne(`${environment.apiUrl}/analyses`);
    expect(request.request.method).toBe('POST');
    request.flush({ id: 'analysis-job:test', status: 'queued' });
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('/analyses/analysis-job:test');
  });

  it('shows a useful error when creation fails', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.componentInstance.form.controls.repositoryUrl.setValue(
      'https://github.com/octocat/Hello-World',
    );
    fixture.componentInstance.submit();
    http
      .expectOne(`${environment.apiUrl}/analyses`)
      .flush({}, { status: 500, statusText: 'Server error' });
    expect(fixture.componentInstance.errorMessage()).toContain('could not start');
  });
});
