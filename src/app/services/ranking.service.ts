import { Injectable, signal, computed, untracked } from '@angular/core';
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
  private readonly TARGET_MEAN = 7.0;
  private readonly TARGET_STDDEV = 1.5;

  private animeList = signal<Anime[]>([]);
  private matches: Match[] = [];
  private shuffledIndices: number[] = [];
  private currentMatchIndex = 0;
  private history: HistoryEntry[] = [];
  private historyIndex = signal<number>(-1);
  private comparisonMatrix = new Map<string, { wins: number; total: number }>();
  private needsStrengthUpdate = false;
  private comparisonCount = 0;

  comparisonState = signal<ComparisonState>({
    currentPair: null,
    comparisonsDone: 0,
    totalComparisons: 0,
    isComplete: false,
    comparisonMatrix: {}
  });

  canUndo = computed(() => this.historyIndex() > 0);
  canRedo = computed(() => this.historyIndex() < this.history.length - 1);

  progress = computed(() => {
    const state = this.comparisonState();
    if (state.totalComparisons === 0) return 0;
    return Math.round((state.comparisonsDone / state.totalComparisons) * 100);
  });

  liveRatings = computed(() => {
    // Just calculate ratings from current state without modifying signals
    const list = this.animeList();
    return this.calculateCurrentRatings(list);
  });

  /**
   * Calculate accuracy/confidence metric based on comparison coverage
   * Returns percentage (0-100) indicating how confident we are in the rankings
   */
  accuracy = computed(() => {
    const list = this.animeList();
    const state = this.comparisonState();
    
    if (list.length === 0 || state.comparisonsDone === 0) return 0;
    
    // Calculate average comparisons per item
    const totalComparisons = list.reduce((sum, a) => sum + a.comparisons, 0);
    const avgComparisons = totalComparisons / list.length;
    
    // Ideal number: log2(n) * 3 comparisons per item
    const idealComparisons = Math.ceil(Math.log2(list.length + 1) * 3);
    
    // Calculate coverage (capped at 100%)
    const coverage = Math.min(100, (avgComparisons / idealComparisons) * 100);
    
    // Calculate balance (how evenly distributed are comparisons?)
    const comparisons = list.map(a => a.comparisons);
    const minComp = Math.min(...comparisons);
    const maxComp = Math.max(...comparisons);
    const balance = maxComp > 0 ? (minComp / maxComp) * 100 : 0;
    
    // Weighted score: 70% coverage, 30% balance
    const accuracy = coverage * 0.7 + balance * 0.3;
    
    return Math.round(accuracy);
  });

  initializeRanking(animeList: Anime[], useExistingRatings: boolean = false): void {
    const initialized = animeList.map(a => ({
      ...a,
      elo: useExistingRatings && a.rating ? this.ratingToStrength(a.rating) : 1.0,
      comparisons: 0,
      wins: 0,
      losses: 0
    }));

    this.animeList.set(initialized);
    this.comparisonMatrix.clear();
    this.matches = this.generateMergeSortMatches(initialized.length, useExistingRatings);
    this.shuffledIndices = this.shuffleArray([...Array(initialized.length).keys()]);
    this.currentMatchIndex = 0;

    // Reduce comparisons if using existing ratings (we start closer to true strengths)
    const baseComparisons = Math.ceil(initialized.length * Math.log2(initialized.length + 1) * 2);
    const reductionFactor = useExistingRatings && this.hasGoodRatingCoverage(initialized) ? 0.6 : 1.0;
    const total = Math.min(
      this.matches.length,
      Math.ceil(baseComparisons * reductionFactor)
    );

    const initialPair = this.getNextPair();

    this.comparisonState.set({
      currentPair: initialPair,
      comparisonsDone: 0,
      totalComparisons: total,
      isComplete: false,
      comparisonMatrix: {}
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

  private generateMergeSortMatches(n: number, useExistingRatings: boolean = false): Match[] {
    const matches: Match[] = [];
    const comparisonsPerItem = Math.ceil(Math.log2(n + 1) * 3);
    const comparisonCounts = new Array(n).fill(0);

    for (let round = 0; round < comparisonsPerItem; round++) {
      const shuffled = this.shuffleArray([...Array(n).keys()]);

      const available = shuffled.sort((a, b) => comparisonCounts[a] - comparisonCounts[b]);
      
      // When using existing ratings, prioritize pairing similar-rated anime
      if (useExistingRatings && round % 2 === 0) {
        const list = this.animeList();
        available.sort((a, b) => {
          const ratingA = list[a]?.rating || 0;
          const ratingB = list[b]?.rating || 0;
          return ratingA - ratingB;
        });
      }
      
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

  /**
   * Convert MAL-style rating (1-10) to Bradley-Terry strength parameter
   * Uses exponential transformation to preserve relative differences
   * Rating 7.0 -> strength 1.0 (our baseline)
   * Higher ratings -> exponentially higher strength
   */
  private ratingToStrength(rating: number): number {
    // Scale factor controls how much ratings affect initial strength
    // Higher = more conservative, lower = more aggressive
    const scaleFactor = 2.0;
    return Math.exp((rating - this.TARGET_MEAN) / scaleFactor);
  }

  /**
   * Check if anime list has good rating coverage
   * Returns true if most anime have ratings
   */
  private hasGoodRatingCoverage(animeList: Anime[]): boolean {
    const withRatings = animeList.filter(a => a.rating && a.rating > 0).length;
    return withRatings / animeList.length >= 0.7; // At least 70% have ratings
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
    // Record comparison in matrix
    const key = `${winner.id}-${loser.id}`;
    const reverseKey = `${loser.id}-${winner.id}`;
    
    const existing = this.comparisonMatrix.get(key) || { wins: 0, total: 0 };
    this.comparisonMatrix.set(key, { wins: existing.wins + 1, total: existing.total + 1 });
    
    const reverseExisting = this.comparisonMatrix.get(reverseKey) || { wins: 0, total: 0 };
    this.comparisonMatrix.set(reverseKey, { wins: reverseExisting.wins, total: reverseExisting.total + 1 });

    // Update win/loss counts immediately (fast)
    const updatedList = this.animeList().map(anime => {
      if (anime.id === winner.id) {
        return {
          ...anime,
          comparisons: anime.comparisons + 1,
          wins: (anime.wins || 0) + 1
        };
      } else if (anime.id === loser.id) {
        return {
          ...anime,
          comparisons: anime.comparisons + 1,
          losses: (anime.losses || 0) + 1
        };
      }
      return anime;
    });

    this.animeList.set(updatedList);
    this.comparisonCount++;
    
    // Update Bradley-Terry strengths every 5 comparisons for performance
    // Use untracked to avoid signal dependency issues
    if (this.comparisonCount % 5 === 0) {
      untracked(() => {
        this.updateBradleyTerryStrengthsImmediate();
      });
    }

    const currentState = this.comparisonState();
    const comparisonsDone = currentState.comparisonsDone + 1;
    const isComplete = comparisonsDone >= currentState.totalComparisons;
    const nextPair = isComplete ? null : this.getNextPair();

    // Convert comparison matrix to plain object for serialization
    const matrixObj: Record<string, { wins: number; total: number }> = {};
    this.comparisonMatrix.forEach((value, key) => {
      matrixObj[key] = value;
    });

    this.comparisonState.set({
      currentPair: nextPair,
      comparisonsDone,
      totalComparisons: currentState.totalComparisons,
      isComplete,
      comparisonMatrix: matrixObj
    });

    // Clear redo history when a new action is taken
    if (this.historyIndex() < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex() + 1);
    }

    // Add to history
    this.history.push({
      animeList: [...this.animeList()],
      currentPair: nextPair,
      comparisonsDone,
      currentMatchIndex: this.currentMatchIndex
    });
    this.historyIndex.update(i => i + 1);
  }

  /**
   * Bradley-Terry model: Iteratively updates strength parameters
   * Formula: strength_i = wins_i / sum_j(total_comparisons_ij / (strength_i + strength_j))
   */
  private updateBradleyTerryStrengthsImmediate(): void {
    const animeList = this.animeList();
    const n = animeList.length;
    const strengths = new Map<number, number>();
    
    // Initialize strengths
    animeList.forEach(a => strengths.set(a.id, a.elo || 1.0));

    // Pre-compute comparison data for each anime to avoid repeated lookups
    const comparisonData = new Map<number, { wins: number; total: number; opponents: Array<{ id: number; total: number }> }>();
    
    for (const anime of animeList) {
      let wins = 0;
      let totalComparisons = 0;
      const opponents: Array<{ id: number; total: number }> = [];
      
      for (const opponent of animeList) {
        if (opponent.id === anime.id) continue;
        
        const key = `${anime.id}-${opponent.id}`;
        const comparison = this.comparisonMatrix.get(key);
        if (comparison && comparison.total > 0) {
          wins += comparison.wins;
          totalComparisons += comparison.total;
          opponents.push({ id: opponent.id, total: comparison.total });
        }
      }
      
      comparisonData.set(anime.id, { wins, total: totalComparisons, opponents });
    }

    // Iterative algorithm (MM algorithm) - converges to maximum likelihood
    const maxIterations = 15; // Reduced further for performance
    const tolerance = 0.001; // Relaxed for speed

    for (let iter = 0; iter < maxIterations; iter++) {
      const newStrengths = new Map<number, number>();
      let maxChange = 0;

      for (const anime of animeList) {
        const data = comparisonData.get(anime.id);
        if (!data || data.total === 0) {
          newStrengths.set(anime.id, strengths.get(anime.id) || 1.0);
          continue;
        }
        
        let denominator = 0;
        const si = strengths.get(anime.id) || 1.0;

        // Sum over opponents with comparisons
        for (const opp of data.opponents) {
          const sj = strengths.get(opp.id) || 1.0;
          denominator += opp.total / (si + sj);
        }

        const newStrength = denominator > 0 ? data.wins / denominator : si;
        newStrengths.set(anime.id, Math.max(0.01, newStrength));

        const change = Math.abs(newStrength - si);
        maxChange = Math.max(maxChange, change);
      }

      strengths.clear();
      newStrengths.forEach((v, k) => strengths.set(k, v));

      if (maxChange < tolerance) break;
    }

    // Update anime list with new strengths
    const updated = animeList.map(anime => ({
      ...anime,
      elo: strengths.get(anime.id) || 1.0
    }));

    this.animeList.set(updated);
  }

  skipComparison(): void {
    const currentState = this.comparisonState();
    const matrixObj: Record<string, { wins: number; total: number }> = {};
    this.comparisonMatrix.forEach((value, key) => {
      matrixObj[key] = value;
    });
    
    this.comparisonState.set({
      ...currentState,
      currentPair: this.getNextPair(),
      comparisonMatrix: matrixObj
    });
  }

  calculateFinalRatings(): Anime[] {
    // Force final strength update
    this.updateBradleyTerryStrengthsImmediate();
    return this.calculateCurrentRatings(this.animeList());
  }

  private calculateCurrentRatings(animeList: Anime[]): Anime[] {
    if (animeList.length === 0) return [];

    // Use log of Bradley-Terry strengths for more stable distribution
    // Filter out any invalid strengths
    const validStrengths = animeList
      .map(a => a.elo)
      .filter((elo): elo is number => elo !== undefined && elo > 0 && !isNaN(elo));
    
    if (validStrengths.length === 0) {
      return animeList.map(a => ({ ...a, rating: this.TARGET_MEAN }));
    }
    
    const logStrengths = validStrengths.map(s => Math.log(s));
    const meanLog = logStrengths.reduce((a, b) => a + b, 0) / logStrengths.length;
    const variance =
      logStrengths.reduce((sq, n) => sq + Math.pow(n - meanLog, 2), 0) / logStrengths.length;
    const stdLog = Math.sqrt(variance) || 1;

    return animeList
      .map(anime => {
        const elo = anime.elo || 1.0;
        const logStrength = Math.log(elo);
        const zScore = stdLog > 0 ? (logStrength - meanLog) / stdLog : 0;
        let rating = this.TARGET_MEAN + zScore * this.TARGET_STDDEV;
        rating = Math.max(1, Math.min(10, Math.round(rating * 10) / 10));

        return { ...anime, rating };
      })
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
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
        isComplete: false,
        comparisonMatrix: currentState.comparisonMatrix
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
        isComplete,
        comparisonMatrix: currentState.comparisonMatrix
      });
    }
  }

  reset(): void {
    this.animeList.set([]);
    this.matches = [];
    this.shuffledIndices = [];
    this.currentMatchIndex = 0;
    this.history = [];
    this.historyIndex.set(-1);
    this.comparisonMatrix.clear();
    this.comparisonState.set({
      currentPair: null,
      comparisonsDone: 0,
      totalComparisons: 0,
      isComplete: false,
      comparisonMatrix: {}
    });
  }

  getAnimeList(): Anime[] {
    return this.animeList();
  }

  restoreState(animeList: Anime[], comparisonState: ComparisonState): void {
    this.animeList.set(animeList);
    this.comparisonState.set(comparisonState);

    // Restore comparison matrix
    this.comparisonMatrix.clear();
    if (comparisonState.comparisonMatrix) {
      Object.entries(comparisonState.comparisonMatrix).forEach(([key, value]) => {
        this.comparisonMatrix.set(key, value);
      });
    }

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
