import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { HealthResponse } from '@ai-developer-platform/contracts';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);

  getHealth() {
    return this.http.get<HealthResponse>(`${environment.apiUrl}/health`);
  }
}
