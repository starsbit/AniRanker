import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Anime, MalData } from '../models/anime';

@Injectable({
  providedIn: 'root'
})
export class AnimeService {
  private animeList = new BehaviorSubject<Anime[]>([]);
  public animeList$ = this.animeList.asObservable();

  setAnimeList(anime: Anime[]): void {
    this.animeList.next(anime);
  }

  getAnimeList(): Anime[] {
    return this.animeList.value;
  }

  parseMalJson(jsonData: MalData): Anime[] {
    if (!jsonData?.data || !Array.isArray(jsonData.data)) {
      throw new Error('Invalid MAL data format');
    }
    
    return jsonData.data
      .filter(item => item.node?.id && item.node?.title)
      .map(item => ({
        ...item.node,
        elo: 1500,
        comparisons: 0
      }));
  }

  loadFromFile(file: File): Promise<Anime[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as MalData;
          const anime = this.parseMalJson(data);
          this.setAnimeList(anime);
          resolve(anime);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}
