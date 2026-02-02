import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface MetaConfig {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MetaService {
  private readonly meta = inject(Meta);
  private readonly titleService = inject(Title);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly defaultConfig: MetaConfig = {
    title: 'AniRanker - Rank your anime and manga lists',
    description: 'Rank your anime and manga lists using pairwise comparisons. Import your MyAnimeList and create personalized rankings.',
    keywords: 'anime, manga, ranking, MyAnimeList, anime ranking, manga ranking, anime comparison',
    image: 'https://aniranker.starsbit.space/assets/images/og-image.png',
    url: 'https://aniranker.starsbit.space',
    type: 'website'
  };

  constructor() {
    if (this.isBrowser) {
      this.initializeRouteListener();
    }
  }

  private initializeRouteListener(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const route = this.router.routerState.root;
        let child = route;
        while (child.firstChild) {
          child = child.firstChild;
        }

        const metaData = child.snapshot.data['meta'];
        if (metaData) {
          this.updateMetaTags(metaData);
        }
      });
  }

  updateMetaTags(config: Partial<MetaConfig>): void {
    const metaConfig = { ...this.defaultConfig, ...config };
    const url = metaConfig.url || `https://aniranker.starsbit.space${this.router.url}`;

    // Update title
    this.titleService.setTitle(metaConfig.title);

    // Update standard meta tags
    this.meta.updateTag({ name: 'description', content: metaConfig.description });
    if (metaConfig.keywords) {
      this.meta.updateTag({ name: 'keywords', content: metaConfig.keywords });
    }

    // Update canonical URL
    this.meta.updateTag({ name: 'canonical', content: url });

    // Update Open Graph tags
    this.meta.updateTag({ property: 'og:title', content: metaConfig.title });
    this.meta.updateTag({ property: 'og:description', content: metaConfig.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: metaConfig.type || 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'AniRanker' });
    if (metaConfig.image) {
      this.meta.updateTag({ property: 'og:image', content: metaConfig.image });
      this.meta.updateTag({ property: 'og:image:alt', content: metaConfig.title });
    }

    // Update Twitter Card tags
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: metaConfig.title });
    this.meta.updateTag({ name: 'twitter:description', content: metaConfig.description });
    if (metaConfig.image) {
      this.meta.updateTag({ name: 'twitter:image', content: metaConfig.image });
      this.meta.updateTag({ name: 'twitter:image:alt', content: metaConfig.title });
    }
  }

  setDefaultMeta(): void {
    this.updateMetaTags(this.defaultConfig);
  }
}
