import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Anime } from '../models/anime.model';
import { firstValueFrom } from 'rxjs';

interface JikanResponse {
  data: {
    mal_id: number;
    images: {
      jpg: {
        image_url: string;
        small_image_url: string;
        large_image_url: string;
      };
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class JikanService {
  private http = inject(HttpClient);
  private cacheData = signal<Map<number, string>>(new Map());
  private requestQueue: Array<{ id: number; priority: boolean; type: 'anime' | 'manga' }> = [];
  private isProcessing = false;
  private readonly RATE_LIMIT_DELAY = 400;
  private readonly API_BASE = 'https://api.jikan.moe/v4';

  loadingProgress = signal(0);
  imageCache = this.cacheData.asReadonly();

  async fetchImage(id: number, type: 'anime' | 'manga' = 'anime', priority: boolean = false): Promise<string | undefined> {
    const cache = this.cacheData();
    if (cache.has(id)) {
      return cache.get(id);
    }

    return new Promise((resolve) => {
      if (priority) {
        this.requestQueue.unshift({ id, priority, type });
      } else {
        this.requestQueue.push({ id, priority, type });
      }

      this.processQueue().then(() => {
        resolve(this.cacheData().get(id));
      });
    });
  }

  async loadImagesForList(itemList: Anime[], type: 'anime' | 'manga' = 'anime', priorityIds: number[] = []): Promise<void> {
    const cache = this.cacheData();
    const idsToLoad = itemList
      .filter(item => !cache.has(item.id))
      .map(item => ({
        id: item.id,
        priority: priorityIds.includes(item.id),
        type
      }))
      .sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));

    this.requestQueue.push(...idsToLoad);
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const totalRequests = this.requestQueue.length;
    let completed = 0;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      const cache = this.cacheData();

      if (!request || cache.has(request.id)) {
        completed++;
        continue;
      }

      try {
        const imageUrl = await this.fetchFromApi(request.id, request.type);
        if (imageUrl) {
          const newCache = new Map(cache);
          newCache.set(request.id, imageUrl);
          this.cacheData.set(newCache);
        }
      } catch (error) {
        console.warn(`Failed to fetch image for ${request.type} ${request.id}:`, error);
      }

      completed++;
      this.loadingProgress.set(Math.round((completed / totalRequests) * 100));

      await this.delay(this.RATE_LIMIT_DELAY);
    }

    this.isProcessing = false;
    this.loadingProgress.set(100);
  }

  private async fetchFromApi(id: number, type: 'anime' | 'manga'): Promise<string | undefined> {
    try {
      const response = await firstValueFrom(
        this.http.get<JikanResponse>(`${this.API_BASE}/${type}/${id}`)
      );

      return response?.data?.images?.jpg?.large_image_url;
    } catch (error) {
      return undefined;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getImageUrl(id: number): string | undefined {
    return this.cacheData().get(id);
  }

  clearCache(): void {
    this.cacheData.set(new Map());
    this.requestQueue = [];
    this.loadingProgress.set(0);
  }
}
