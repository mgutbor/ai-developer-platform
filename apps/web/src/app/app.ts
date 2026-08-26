import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HealthService } from './core/api/health.service';

type ApiStatus = 'loading' | 'online' | 'unavailable';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly healthService = inject(HealthService);

  protected readonly apiStatus = signal<ApiStatus>('loading');
  protected readonly apiStatusLabel = computed(() => {
    switch (this.apiStatus()) {
      case 'loading':
        return 'Checking API availability…';
      case 'online':
        return 'API status: online';
      case 'unavailable':
        return 'API status: unavailable';
    }
  });

  constructor() {
    this.checkApiHealth();
  }

  protected checkApiHealth(): void {
    this.apiStatus.set('loading');
    this.healthService.getHealth().subscribe({
      next: () => this.apiStatus.set('online'),
      error: () => this.apiStatus.set('unavailable'),
    });
  }
}
