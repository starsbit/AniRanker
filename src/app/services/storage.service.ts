import { Injectable } from '@angular/core';
import { Anime, ComparisonState } from '../models/anime.model';

interface RankingProgress {
  animeList: Anime[];
  originalXml: string;
  listType: 'anime' | 'manga';
  comparisonState: ComparisonState;
  viewState: 'comparing' | 'results';
  rankedAnime?: Anime[];
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_KEY = 'aniranker_progress';
  private readonly MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  saveProgress(progress: RankingProgress): void {
    try {
      const data = {
        ...progress,
        timestamp: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save progress to localStorage:', error);
    }
  }

  loadProgress(): RankingProgress | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const data: RankingProgress = JSON.parse(stored);

      if (Date.now() - data.timestamp > this.MAX_AGE_MS) {
        this.clearProgress();
        return null;
      }

      console.log("Loaded data", data);

      return data;
    } catch (error) {
      console.warn('Failed to load progress from localStorage:', error);
      return null;
    }
  }

  clearProgress(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear progress from localStorage:', error);
    }
  }

  hasProgress(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }
}
