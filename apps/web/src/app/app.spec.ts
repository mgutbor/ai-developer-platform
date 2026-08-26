import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../environments/environment';
import { App } from './app';

describe('App', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('creates the foundation application', () => {
    const fixture = TestBed.createComponent(App);
    httpTesting.expectOne(`${environment.apiUrl}/health`).flush({
      service: 'api',
      status: 'ok',
    });

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the API as online after a successful health response', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const request = httpTesting.expectOne(`${environment.apiUrl}/health`);
    request.flush({ service: 'api', status: 'ok' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('API status: online');
  });

  it('shows the API as unavailable when the health request fails', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const request = httpTesting.expectOne(`${environment.apiUrl}/health`);
    request.error(new ProgressEvent('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('API status: unavailable');
  });
});
