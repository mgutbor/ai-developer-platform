import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/analysis/pages/home.page').then((module) => module.HomePage),
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/analysis/analysis.routes').then((module) => module.analysisRoutes),
  },
  { path: '**', redirectTo: '' },
];
