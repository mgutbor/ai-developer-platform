import { Routes } from '@angular/router';

export const analysisRoutes: Routes = [
  {
    path: 'analyses/:id/report',
    loadComponent: () => import('./pages/report.page').then((module) => module.ReportPage),
  },
  {
    path: 'analyses/:id',
    loadComponent: () => import('./pages/progress.page').then((module) => module.ProgressPage),
  },
];
