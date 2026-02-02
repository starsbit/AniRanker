import { Injectable } from '@angular/core';
import { Anime } from '../models/anime.model';

@Injectable({
  providedIn: 'root'
})
export class MalParserService {
  private readonly INITIAL_ELO = 1500;

  parseXml(xmlContent: string): { anime: Anime[], originalXml: string, type: 'anime' | 'manga' } {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid XML format');
    }

    const exportType = xmlDoc.querySelector('user_export_type')?.textContent || '1';
    const type: 'anime' | 'manga' = exportType === '2' ? 'manga' : 'anime';

    const itemList: Anime[] = [];

    if (type === 'anime') {
      const animeNodes = xmlDoc.querySelectorAll('anime');
      animeNodes.forEach(node => {
        const status = node.querySelector('my_status')?.textContent || '';

        if (status === 'Completed' || status === 'Watching') {
          const id = parseInt(node.querySelector('series_animedb_id')?.textContent || '0');
          const title = node.querySelector('series_title')?.textContent || 'Unknown';
          const scoreText = node.querySelector('my_score')?.textContent || '0';
          const score = parseInt(scoreText);
          const rating = score > 0 ? score : undefined;

          if (id > 0) {
            itemList.push({
              id,
              title,
              elo: this.INITIAL_ELO,
              comparisons: 0,
              type: 'anime',
              rating
            });
          }
        }
      });
    } else {
      const mangaNodes = xmlDoc.querySelectorAll('manga');
      mangaNodes.forEach(node => {
        const status = node.querySelector('my_status')?.textContent || '';

        if (status === 'Completed' || status === 'Reading') {
          const id = parseInt(node.querySelector('manga_mangadb_id')?.textContent || '0');
          const title = node.querySelector('manga_title')?.textContent || 'Unknown';
          const scoreText = node.querySelector('my_score')?.textContent || '0';
          const score = parseInt(scoreText);
          const rating = score > 0 ? score : undefined;

          if (id > 0) {
            itemList.push({
              id,
              title,
              elo: this.INITIAL_ELO,
              comparisons: 0,
              type: 'manga',
              rating
            });
          }
        }
      });
    }

    return {
      anime: itemList,
      originalXml: xmlContent,
      type
    };
  }

  exportToXml(originalXml: string, rankedItems: Anime[], type: 'anime' | 'manga'): string {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(originalXml, 'text/xml');

    if (type === 'anime') {
      const animeNodes = xmlDoc.querySelectorAll('anime');
      animeNodes.forEach(node => {
        const id = parseInt(node.querySelector('series_animedb_id')?.textContent || '0');
        const rankedEntry = rankedItems.find(a => a.id === id);

        if (rankedEntry && rankedEntry.rating) {
          const scoreNode = node.querySelector('my_score');
          if (scoreNode) {
            scoreNode.textContent = Math.round(rankedEntry.rating).toString();
          }

          // Set update_on_import to 1 so MyAnimeList will apply the new rating
          const updateNode = node.querySelector('update_on_import');
          if (updateNode) {
            updateNode.textContent = '1';
          }
        }
      });
    } else {
      const mangaNodes = xmlDoc.querySelectorAll('manga');
      mangaNodes.forEach(node => {
        const id = parseInt(node.querySelector('manga_mangadb_id')?.textContent || '0');
        const rankedEntry = rankedItems.find(m => m.id === id);

        if (rankedEntry && rankedEntry.rating) {
          const scoreNode = node.querySelector('my_score');
          if (scoreNode) {
            scoreNode.textContent = Math.round(rankedEntry.rating).toString();
          }

          // Set update_on_import to 1 so MyAnimeList will apply the new rating
          const updateNode = node.querySelector('update_on_import');
          if (updateNode) {
            updateNode.textContent = '1';
          }
        }
      });
    }

    const serializer = new XMLSerializer();
    return serializer.serializeToString(xmlDoc);
  }

  async loadFromFile(file: File): Promise<{ anime: Anime[], originalXml: string, type: 'anime' | 'manga' }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const xmlContent = e.target?.result as string;
          const result = this.parseXml(xmlContent);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}
