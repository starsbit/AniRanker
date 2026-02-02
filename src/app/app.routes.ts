import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
    data: {
      animation: 'HomePage',
      meta: {
        title: 'AniRanker - Rank your anime and manga lists',
        description: 'Rank your anime and manga lists using pairwise comparisons. Import your MyAnimeList and create personalized rankings.',
        keywords: 'anime, manga, ranking, MyAnimeList, anime ranking, manga ranking, anime comparison'
      }
    },
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./pages/about/about.component').then((m) => m.AboutComponent),
    data: {
      animation: 'AboutPage',
      meta: {
        title: 'About AniRanker - Anime and Manga Ranking Tool',
        description: 'Learn about AniRanker, the pairwise comparison tool for ranking your anime and manga lists from MyAnimeList.',
        keywords: 'anime ranking tool, manga ranking, about aniranker'
      }
    },
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./pages/contact/contact.component').then(
        (m) => m.ContactComponent
      ),
    data: {
      animation: 'ContactPage',
      meta: {
        title: 'Contact AniRanker',
        description: 'Get in touch with AniRanker. Send feedback, report bugs, or suggest new features for our anime and manga ranking tool.',
        keywords: 'contact aniranker, feedback, support'
      }
    },
  },
];
