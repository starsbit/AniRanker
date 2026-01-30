import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/pages/home/home').then((m) => m.HomeComponent),
    data: { animation: 'HomePage' },
    title: 'MAL Ranker - Anime Ranking',
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./components/pages/about/about').then((m) => m.AboutComponent),
    data: { animation: 'AboutPage' },
    title: 'MAL Ranker - About',
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./components/pages/contact/contact').then((m) => m.ContactComponent),
    data: { animation: 'ContactPage' },
    title: 'MAL Ranker - Contact',
  },
  {
    path: 'import',
    loadComponent: () =>
      import('./components/pages/import/import').then((m) => m.ImportComponent),
    data: { animation: 'ImportPage' },
    title: 'MAL Ranker - Import',
  },
  {
    path: 'rank',
    loadComponent: () =>
      import('./components/pages/ranker/ranker').then((m) => m.RankerComponent),
    data: { animation: 'RankPage' },
    title: 'MAL Ranker - Rank',
  },
  {
    path: 'results',
    loadComponent: () =>
      import('./components/pages/results/results').then((m) => m.ResultsComponent),
    data: { animation: 'ResultsPage' },
    title: 'MAL Ranker - Results',
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
