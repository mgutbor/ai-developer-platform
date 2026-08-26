import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AnalysisCreatedResponse,
  AnalysisJobResponse,
  AnalysisRequest,
  AnalysisResultResponse,
} from '@ai-developer-platform/contracts';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  createAnalysis(request: AnalysisRequest) {
    return this.http.post<AnalysisCreatedResponse>(`${this.apiUrl}/analyses`, request);
  }

  getAnalysis(id: string) {
    return this.http.get<AnalysisJobResponse>(`${this.apiUrl}/analyses/${encodeURIComponent(id)}`);
  }

  getReport(id: string) {
    return this.http.get<AnalysisResultResponse>(
      `${this.apiUrl}/analyses/${encodeURIComponent(id)}/report`,
    );
  }
}
