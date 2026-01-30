import { Injectable, signal, computed } from '@angular/core';
import { Anime, ComparisonState } from '../models/anime.model';

interface Match {
  left: number;
  right: number;
}

interface HistoryEntry {
  animeList: Anime[];
  currentPair: [Anime, Anime] | null;
  comparisonsDone: number;
  currentMatchIndex: number;
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
  private history: HistoryEntry[] = [];
  private historyIndex = signal<number>(-1);

  comparisonState = signal<ComparisonState>({
    currentPair: null,
    comparisonsDone: 0,
    totalComparisons: 0,
    isComplete: false
  });

  canUndo = computed(() => this.historyIndex() > 0);
  canRedo = computed(() => this.historyIndex() < this.history.length - 1);

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

    const initialPair = this.getNextPair();

    this.comparisonState.set({
      currentPair: initialPair,
      comparisonsDone: 0,
      totalComparisons: total,
      isComplete: false
    });

    // Initialize history with the starting state
    this.history = [{
      animeList: [...initialized],
      currentPair: initialPair,
      comparisonsDone: 0,
      currentMatchIndex: this.currentMatchIndex
    }];
    this.historyIndex.set(0);
  }

  private generateMergeSortMatches(n: number): Match[] {
    const matches: Match[] = [];
    const comparisonsPerItem = Math.ceil(Math.log2(n + 1) * 3);
    const comparisonCounts = new Array(n).fill(0);

    for (let round = 0; round < comparisonsPerItem; round++) {
      const shuffled = this.shuffleArray([...Array(n).keys()]);

      const available = shuffled.sort((a, b) => comparisonCounts[a] - comparisonCounts[b]);
      
      for (let i = 0; i < available.length - 1; i += 2) {
        const idx1 = available[i];
        const idx2 = available[i + 1];
        
        matches.push({ left: idx1, right: idx2 });
        comparisonCounts[idx1]++;
        comparisonCounts[idx2]++;
      }
    }

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
    const nextPair = isComplete ? null : this.getNextPair();

    this.comparisonState.set({
      currentPair: nextPair,
      comparisonsDone,
      totalComparisons: currentState.totalComparisons,
      isComplete
    });

    // Clear redo history when a new action is taken
    if (this.historyIndex() < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex() + 1);
    }

    // Add to history
    this.history.push({
      animeList: [...updatedList],
      currentPair: nextPair,
      comparisonsDone,
      currentMatchIndex: this.currentMatchIndex
    });
    this.historyIndex.update(i => i + 1);
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

  undo(): void {
    if (this.historyIndex() > 0) {
      this.historyIndex.update(i => i - 1);
      const entry = this.history[this.historyIndex()];
      this.animeList.set([...entry.animeList]);
      this.currentMatchIndex = entry.currentMatchIndex;
      
      const currentState = this.comparisonState();
      this.comparisonState.set({
        currentPair: entry.currentPair,
        comparisonsDone: entry.comparisonsDone,
        totalComparisons: currentState.totalComparisons,
        isComplete: false
      });
    }
  }

  redo(): void {
    if (this.historyIndex() < this.history.length - 1) {
      this.historyIndex.update(i => i + 1);
      const entry = this.history[this.historyIndex()];
      this.animeList.set([...entry.animeList]);
      this.currentMatchIndex = entry.currentMatchIndex;
      
      const currentState = this.comparisonState();
      const isComplete = entry.comparisonsDone >= currentState.totalComparisons;
      
      this.comparisonState.set({
        currentPair: entry.currentPair,
        comparisonsDone: entry.comparisonsDone,
        totalComparisons: currentState.totalComparisons,
        isComplete
      });
    }
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
    this.history = [];
    this.historyIndex.set(-1);
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

    // Initialize history with the restored state
    this.history = [{
      animeList: [...animeList],
      currentPair: comparisonState.currentPair,
      comparisonsDone: comparisonState.comparisonsDone,
      currentMatchIndex: this.currentMatchIndex
    }];
    this.historyIndex.set(0);
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
