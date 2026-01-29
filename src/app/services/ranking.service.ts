import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Anime } from '../models/anime';

export interface ComparisonState {
  animeList: Anime[];
  currentPair: [Anime, Anime] | null;
  comparisonsDone: number;
  totalComparisons: number;
  isComplete: boolean;
}

interface Match {
  left: number;
  right: number;
  leftWins: number;
}

@Injectable({
  providedIn: 'root'
})
export class RankingService {
  private readonly K_FACTOR = 32;
  private readonly INITIAL_ELO = 1500;
  
  private state = new BehaviorSubject<ComparisonState>({
    animeList: [],
    currentPair: null,
    comparisonsDone: 0,
    totalComparisons: 0,
    isComplete: false
  });
  public state$ = this.state.asObservable();

  private matches: Match[] = [];
  private shuffledIndices: number[] = [];
  private currentMatchIndex = 0;

  initializeRanking(animeList: Anime[]): void {
    const initialized = animeList.map(a => ({
      ...a,
      elo: this.INITIAL_ELO,
      comparisons: 0
    }));
    
    this.matches = this.generateMergeSortMatches(initialized.length);
    this.shuffledIndices = this.shuffleArray([...Array(initialized.length).keys()]);
    this.currentMatchIndex = 0;
    
    const total = Math.min(this.matches.length, Math.ceil(initialized.length * Math.log2(initialized.length + 1) * 2));
    
    this.state.next({
      animeList: initialized,
      currentPair: this.getNextPair(initialized),
      comparisonsDone: 0,
      totalComparisons: total,
      isComplete: false
    });
  }

  private generateMergeSortMatches(n: number): Match[] {
    const matches: Match[] = [];
    const generate = (left: number, right: number) => {
      if (right - left <= 1) return;
      const mid = Math.floor((left + right) / 2);
      generate(left, mid);
      generate(mid, right);
      
      for (let i = left; i < mid; i++) {
        for (let j = mid; j < right && j < mid + 2; j++) {
          matches.push({ left: i, right: j, leftWins: 0 });
        }
      }
    };
    generate(0, n);
    return this.shuffleArray(matches);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private getNextPair(animeList: Anime[]): [Anime, Anime] | null {
    if (this.currentMatchIndex >= this.matches.length) {
      return this.getRandomPair(animeList);
    }
    
    const match = this.matches[this.currentMatchIndex++];
    const left = animeList[this.shuffledIndices[match.left]];
    const right = animeList[this.shuffledIndices[match.right]];
    
    if (!left || !right) {
      return this.getRandomPair(animeList);
    }
    
    return [left, right];
  }

  private getRandomPair(animeList: Anime[]): [Anime, Anime] | null {
    if (animeList.length < 2) return null;
    
    const sortedByComparisons = [...animeList].sort((a, b) => (a.comparisons || 0) - (b.comparisons || 0));
    const candidates = sortedByComparisons.slice(0, Math.ceil(animeList.length / 2));
    
    const idx1 = Math.floor(Math.random() * candidates.length);
    let idx2 = Math.floor(Math.random() * candidates.length);
    while (idx2 === idx1 && candidates.length > 1) {
      idx2 = Math.floor(Math.random() * candidates.length);
    }
    
    return [candidates[idx1], candidates[idx2]];
  }

  recordComparison(winner: Anime, loser: Anime): void {
    const current = this.state.value;
    const updatedList = [...current.animeList];
    
    const winnerIndex = updatedList.findIndex(a => a.id === winner.id);
    const loserIndex = updatedList.findIndex(a => a.id === loser.id);
    
    if (winnerIndex === -1 || loserIndex === -1) return;
    
    const winnerAnime = updatedList[winnerIndex];
    const loserAnime = updatedList[loserIndex];
    
    const expectedWinner = 1 / (1 + Math.pow(10, ((loserAnime.elo || this.INITIAL_ELO) - (winnerAnime.elo || this.INITIAL_ELO)) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, ((winnerAnime.elo || this.INITIAL_ELO) - (loserAnime.elo || this.INITIAL_ELO)) / 400));
    
    winnerAnime.elo = (winnerAnime.elo || this.INITIAL_ELO) + this.K_FACTOR * (1 - expectedWinner);
    loserAnime.elo = (loserAnime.elo || this.INITIAL_ELO) + this.K_FACTOR * (0 - expectedLoser);
    winnerAnime.comparisons = (winnerAnime.comparisons || 0) + 1;
    loserAnime.comparisons = (loserAnime.comparisons || 0) + 1;
    
    const comparisonsDone = current.comparisonsDone + 1;
    const isComplete = comparisonsDone >= current.totalComparisons;
    
    this.state.next({
      ...current,
      animeList: updatedList,
      currentPair: isComplete ? null : this.getNextPair(updatedList),
      comparisonsDone,
      isComplete
    });
  }

  skipComparison(): void {
    const current = this.state.value;
    this.state.next({
      ...current,
      currentPair: this.getNextPair(current.animeList)
    });
  }

  calculateFinalRatings(): Anime[] {
    const animeList = [...this.state.value.animeList];
    if (animeList.length === 0) return [];
    
    const elos = animeList.map(a => a.elo || this.INITIAL_ELO);
    const meanElo = elos.reduce((a, b) => a + b, 0) / elos.length;
    const stdElo = Math.sqrt(elos.reduce((sq, n) => sq + Math.pow(n - meanElo, 2), 0) / elos.length) || 1;
    
    const TARGET_MEAN = 7.0;
    const TARGET_STDDEV = 1.5;
    
    return animeList.map(anime => {
      const elo = anime.elo || this.INITIAL_ELO;
      const zScore = (elo - meanElo) / stdElo;
      let rating = TARGET_MEAN + zScore * TARGET_STDDEV;
      rating = Math.max(1, Math.min(10, Math.round(rating * 10) / 10));
      
      return { ...anime, rating };
    }).sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  exportToMalFormat(): string {
    const rated = this.calculateFinalRatings();
    const exportData = {
      data: rated.map(anime => ({
        node: {
          id: anime.id,
          title: anime.title,
          main_picture: anime.main_picture
        },
        list_status: {
          status: 'completed',
          score: Math.round(anime.rating || 0)
        }
      }))
    };
    return JSON.stringify(exportData, null, 2);
  }

  reset(): void {
    this.matches = [];
    this.shuffledIndices = [];
    this.currentMatchIndex = 0;
    this.state.next({
      animeList: [],
      currentPair: null,
      comparisonsDone: 0,
      totalComparisons: 0,
      isComplete: false
    });
  }
}
