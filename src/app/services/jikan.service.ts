import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Anime } from '../models/anime.model';
import { firstValueFrom, timer } from 'rxjs';

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

interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfter: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class JikanService {
  private http = inject(HttpClient);
  private cacheData = signal<Map<number, string>>(new Map());
  private requestQueue: Array<{ 
    id: number; 
    priority: boolean; 
    type: 'anime' | 'manga';
    retryCount: number;
  }> = [];
  private isProcessing = false;
  private rateLimitInfo = signal<RateLimitInfo | null>(null);
  
  private readonly BASE_RATE_LIMIT_DELAY = 400;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly INITIAL_RETRY_DELAY = 1000;
  private readonly API_BASE = 'https://api.jikan.moe/v4';

  loadingProgress = signal(0);
  imageCache = this.cacheData.asReadonly();
  rateLimitStatus = this.rateLimitInfo.asReadonly();

  /**
   * Fetch a single image on-demand (lazy loading)
   * Only call this when the image is actually needed for display
   */
  async fetchImage(id: number, type: 'anime' | 'manga' = 'anime', priority: boolean = false): Promise<string | undefined> {
    const cache = this.cacheData();
    if (cache.has(id)) {
      return cache.get(id);
    }

    // Add to queue and process
    return new Promise((resolve) => {
      const request = { id, priority, type, retryCount: 0 };
      
      if (priority) {
        this.requestQueue.unshift(request);
      } else {
        this.requestQueue.push(request);
      }

      this.processQueue().then(() => {
        resolve(this.cacheData().get(id));
      });
    });
  }

  /**
   * Fetch images only for currently visible/needed anime
   * Instead of loading all images upfront, only load what's needed now
   */
  async fetchImagesForVisible(
    visibleIds: number[], 
    type: 'anime' | 'manga' = 'anime'
  ): Promise<void> {
    const cache = this.cacheData();
    
    // Only fetch images that are not cached and are currently visible
    const idsToLoad = visibleIds
      .filter(id => !cache.has(id))
      .map(id => ({ id, priority: true, type, retryCount: 0 }));

    if (idsToLoad.length === 0) return;

    this.requestQueue.unshift(...idsToLoad);
    await this.processQueue();
  }

  /**
   * Preload images for the next comparison pair (optimistic loading)
   * Call this after a comparison is made to preload the next pair
   */
  async preloadNextPair(ids: number[], type: 'anime' | 'manga'): Promise<void> {
    const cache = this.cacheData();
    
    const idsToLoad = ids
      .filter(id => !cache.has(id))
      .map(id => ({ id, priority: false, type, retryCount: 0 }));

    if (idsToLoad.length === 0) return;

    this.requestQueue.push(...idsToLoad);
    // Don't await - let this happen in background
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const totalRequests = this.requestQueue.length;
    let completed = 0;

    while (this.requestQueue.length > 0) {
      // Check if we're rate limited
      const rateLimit = this.rateLimitInfo();
      if (rateLimit?.isRateLimited) {
        const waitTime = rateLimit.retryAfter;
        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
        await this.delay(waitTime);
        this.rateLimitInfo.set(null); // Clear rate limit after waiting
        continue;
      }

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
        if (this.isRateLimitError(error)) {
          // Put request back in queue for retry
          if (request.retryCount < this.MAX_RETRY_ATTEMPTS) {
            request.retryCount++;
            const retryDelay = this.INITIAL_RETRY_DELAY * Math.pow(2, request.retryCount - 1);
            
            this.rateLimitInfo.set({
              isRateLimited: true,
              retryAfter: retryDelay,
              message: `Rate limited by Jikan API. Retrying in ${retryDelay / 1000} seconds...`
            });

            // Put back at front of queue if high priority, otherwise back
            if (request.priority) {
              this.requestQueue.unshift(request);
            } else {
              this.requestQueue.push(request);
            }
          } else {
            console.warn(`Max retry attempts reached for ${request.type} ${request.id}`);
          }
        } else {
          console.warn(`Failed to fetch image for ${request.type} ${request.id}:`, error);
        }
      }

      completed++;
      this.loadingProgress.set(Math.round((completed / totalRequests) * 100));

      // Adaptive delay based on rate limit status
      const delay = this.rateLimitInfo()?.isRateLimited 
        ? this.rateLimitInfo()!.retryAfter 
        : this.BASE_RATE_LIMIT_DELAY;
      
      if (!this.rateLimitInfo()?.isRateLimited) {
        await this.delay(this.BASE_RATE_LIMIT_DELAY);
      }
    }

    this.isProcessing = false;
    this.loadingProgress.set(100);
  }

  private async fetchFromApi(id: number, type: 'anime' | 'manga'): Promise<string | undefined> {
    try {
      const response = await firstValueFrom(
        this.http.get<JikanResponse>(`${this.API_BASE}/${type}/${id}`)
      );

      return response?.data?.images?.jpg?.large_image_url 
        || response?.data?.images?.jpg?.image_url;
    } catch (error) {
      throw error;
    }
  }

  private isRateLimitError(error: unknown): boolean {
    if (error instanceof HttpErrorResponse) {
      // Check for 429 status or rate limit message
      if (error.status === 429) return true;
      
      const errorBody = error.error;
      if (typeof errorBody === 'object' && errorBody !== null) {
        const status = errorBody.status || errorBody.type;
        const message = errorBody.message || '';
        
        return status === '429' 
          || status === 'RateLimitException'
          || message.toLowerCase().includes('rate limit')
          || message.toLowerCase().includes('rate-limit');
      }
    }
    return false;
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
    this.rateLimitInfo.set(null);
  }

  /**
   * Get current rate limit status for UI display
   */
  getRateLimitMessage(): string | null {
    const info = this.rateLimitInfo();
    return info?.message || null;
  }

  /**
   * Check if currently rate limited
   */
  isRateLimited(): boolean {
    return this.rateLimitInfo()?.isRateLimited || false;
  }
}
