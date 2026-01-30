import { Injectable, signal, computed } from '@angular/core';
import { Anime, ComparisonState } from '../models/anime.model';

interface Match {
  left: number;
  right: number;
}

@Injectable({
  providedIn: 'root'
})
export class RankingService {
  private readonly K_FACTOR = 32;
  private readonly INITIAL_ELO = 1500;
  private readonly TARGET_MEAN = 7.0;
  private readonly TARGET_STDDEV = 1.5;

  private animeList = signal<Anime[]>([]);
  private matches: Match[] = [];
  private shuffledIndices: number[] = [];
  private currentMatchIndex = 0;

  comparisonState = signal<ComparisonState>({
    currentPair: null,
    comparisonsDone: 0,
    totalComparisons: 0,
    isComplete: false
  });

  progress = computed(() => {
    const state = this.comparisonState();
    if (state.totalComparisons === 0) return 0;
    return Math.round((state.comparisonsDone / state.totalComparisons) * 100);
  });

  initializeRanking(animeList: Anime[]): void {
    const initialized = animeList.map(a => ({
      ...a,
      elo: this.INITIAL_ELO,
      comparisons: 0
    }));

    this.animeList.set(initialized);
    this.matches = this.generateMergeSortMatches(initialized.length);
    this.shuffledIndices = this.shuffleArray([...Array(initialized.length).keys()]);
    this.currentMatchIndex = 0;

    const total = Math.min(
      this.matches.length,
      Math.ceil(initialized.length * Math.log2(initialized.length + 1) * 2)
    );

    this.comparisonState.set({
      currentPair: this.getNextPair(),
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
          matches.push({ left: i, right: j });
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

  private getNextPair(): [Anime, Anime] | null {
    const list = this.animeList();

    if (this.currentMatchIndex < this.matches.length) {
      const match = this.matches[this.currentMatchIndex++];
      const leftIdx = this.shuffledIndices[match.left];
      const rightIdx = this.shuffledIndices[match.right];
      const left = list[leftIdx];
      const right = list[rightIdx];

      if (left && right) {
        return [left, right];
      }
    }

    return this.getRandomPair(list);
  }

  private getRandomPair(animeList: Anime[]): [Anime, Anime] | null {
    if (animeList.length < 2) return null;

    const sortedByComparisons = [...animeList].sort(
      (a, b) => a.comparisons - b.comparisons
    );
    const candidates = sortedByComparisons.slice(
      0,
      Math.ceil(animeList.length / 2)
    );

    const idx1 = Math.floor(Math.random() * candidates.length);
    let idx2 = Math.floor(Math.random() * candidates.length);

    while (idx2 === idx1 && candidates.length > 1) {
      idx2 = Math.floor(Math.random() * candidates.length);
    }

    return [candidates[idx1], candidates[idx2]];
  }

  recordComparison(winner: Anime, loser: Anime): void {
    const updatedList = this.animeList().map(anime => {
      if (anime.id === winner.id) {
        const expectedWinner = this.calculateExpectedScore(
          anime.elo,
          loser.elo
        );
        return {
          ...anime,
          elo: anime.elo + this.K_FACTOR * (1 - expectedWinner),
          comparisons: anime.comparisons + 1
        };
      } else if (anime.id === loser.id) {
        const expectedLoser = this.calculateExpectedScore(
          anime.elo,
          winner.elo
        );
        return {
          ...anime,
          elo: anime.elo + this.K_FACTOR * (0 - expectedLoser),
          comparisons: anime.comparisons + 1
        };
      }
      return anime;
    });

    this.animeList.set(updatedList);

    const currentState = this.comparisonState();
    const comparisonsDone = currentState.comparisonsDone + 1;
    const isComplete = comparisonsDone >= currentState.totalComparisons;

    this.comparisonState.set({
      currentPair: isComplete ? null : this.getNextPair(),
      comparisonsDone,
      totalComparisons: currentState.totalComparisons,
      isComplete
    });
  }

  private calculateExpectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  skipComparison(): void {
    const currentState = this.comparisonState();
    this.comparisonState.set({
      ...currentState,
      currentPair: this.getNextPair()
    });
  }

  calculateFinalRatings(): Anime[] {
    const animeList = this.animeList();
    if (animeList.length === 0) return [];

    const elos = animeList.map(a => a.elo);
    const meanElo = elos.reduce((a, b) => a + b, 0) / elos.length;
    const variance =
      elos.reduce((sq, n) => sq + Math.pow(n - meanElo, 2), 0) / elos.length;
    const stdElo = Math.sqrt(variance) || 1;

    return animeList
      .map(anime => {
        const zScore = (anime.elo - meanElo) / stdElo;
        let rating = this.TARGET_MEAN + zScore * this.TARGET_STDDEV;
        rating = Math.max(1, Math.min(10, Math.round(rating * 10) / 10));

        return { ...anime, rating };
      })
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  reset(): void {
    this.animeList.set([]);
    this.matches = [];
    this.shuffledIndices = [];
    this.currentMatchIndex = 0;
    this.comparisonState.set({
      currentPair: null,
      comparisonsDone: 0,
      totalComparisons: 0,
      isComplete: false
    });
  }

  getAnimeList(): Anime[] {
    return this.animeList();
  }

  restoreState(animeList: Anime[], comparisonState: ComparisonState): void {
    this.animeList.set(animeList);
    this.comparisonState.set(comparisonState);

    this.matches = this.generateMergeSortMatches(animeList.length);
    this.shuffledIndices = this.shuffleArray([...Array(animeList.length).keys()]);
    this.currentMatchIndex = comparisonState.comparisonsDone;
  }

  /**
   * Get upcoming candidates for preloading images
   * Returns anime that are likely to be compared soon
   */
  getUpcomingCandidates(count: number): Anime[] {
    const list = this.animeList();
    if (list.length === 0) return [];

    const candidates: Anime[] = [];
    const startIndex = this.currentMatchIndex;

    // Get candidates from upcoming matches
    for (let i = startIndex; i < Math.min(startIndex + count * 2, this.matches.length); i++) {
      const match = this.matches[i];
      const leftIdx = this.shuffledIndices[match.left];
      const rightIdx = this.shuffledIndices[match.right];
      
      if (leftIdx !== undefined) {
        const left = list[leftIdx];
        if (left && !candidates.find(a => a.id === left.id)) {
          candidates.push(left);
        }
      }
      
      if (rightIdx !== undefined) {
        const right = list[rightIdx];
        if (right && !candidates.find(a => a.id === right.id)) {
          candidates.push(right);
        }
      }

      if (candidates.length >= count) break;
    }

    // If we don't have enough from upcoming matches, add from least compared
    if (candidates.length < count) {
      const sortedByComparisons = [...list]
        .filter(a => !candidates.find(c => c.id === a.id))
        .sort((a, b) => a.comparisons - b.comparisons);
      
      candidates.push(...sortedByComparisons.slice(0, count - candidates.length));
    }

    return candidates.slice(0, count);
  }
}
