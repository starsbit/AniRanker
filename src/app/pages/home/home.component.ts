import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { AnimeComparisonComponent } from '../../components/anime-comparison/anime-comparison.component';
import { RankingResultsComponent } from '../../components/ranking-results/ranking-results.component';
import { UseRatingsDialogComponent, UseRatingsDialogData } from '../../components/use-ratings-dialog/use-ratings-dialog.component';
import { MalParserService } from '../../services/mal-parser.service';
import { JikanService } from '../../services/jikan.service';
import { RankingService } from '../../services/ranking.service';
import { StorageService } from '../../services/storage.service';
import { Anime } from '../../models/anime.model';

type ViewState = 'upload' | 'loading' | 'comparing' | 'results';

@Component({
  selector: 'ba-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatProgressSpinnerModule,
    MatButtonModule,
    MatSnackBarModule,
    FileUploadComponent,
    AnimeComparisonComponent,
    RankingResultsComponent
  ]
})
export class HomeComponent implements OnInit {
  private malParser = inject(MalParserService);
  private jikan = inject(JikanService);
  private ranking = inject(RankingService);
  private storage = inject(StorageService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  viewState = signal<ViewState>('upload');
  originalXml = signal<string>('');
  listType = signal<'anime' | 'manga'>('anime');
  rankedAnime = signal<Anime[]>([]);
  errorMessage = signal<string>('');
  hasStoredProgress = signal<boolean>(false);
  rateLimitMessage = signal<string>('');

  comparisonState = this.ranking.comparisonState;
  progress = this.ranking.progress;
  imageCache = this.jikan.imageCache;
  canUndo = this.ranking.canUndo;
  canRedo = this.ranking.canRedo;
  liveRatings = this.ranking.liveRatings;
  accuracy = this.ranking.accuracy;

  constructor() {
    effect(() => {
      const state = this.viewState();
      if (state === 'comparing' || state === 'results') {
        this.saveProgress();
      }
    });

    effect(() => {
      const compState = this.comparisonState();
      if (compState.comparisonsDone > 0 && this.viewState() === 'comparing') {
        this.saveProgress();
      }
    });

    effect(() => {
      const message = this.jikan.rateLimitStatus();
      if (message?.message) {
        this.rateLimitMessage.set(message.message);
        this.showRateLimitNotification(message.message);
      }
    });
  }

  ngOnInit(): void {
    const stored = this.storage.loadProgress();
    if (stored) {
      this.hasStoredProgress.set(true);
      this.restoreProgress();
    }
  }

  leftAnime = computed(() => {
    const anime = this.comparisonState().currentPair?.[0];
    const cache = this.imageCache();
    if (!anime) return undefined;
    return {
      ...anime,
      imageUrl: cache.get(anime.id)
    };
  });

  rightAnime = computed(() => {
    const anime = this.comparisonState().currentPair?.[1];
    const cache = this.imageCache();
    if (!anime) return undefined;
    return {
      ...anime,
      imageUrl: cache.get(anime.id)
    };
  });

  liveRatingsWithImages = computed(() => {
    const ratings = this.liveRatings();
    const cache = this.imageCache();
    return ratings.map(item => ({
      ...item,
      imageUrl: cache.get(item.id)
    }));
  });

  async onFileSelected(file: File): Promise<void> {
    try {
      this.viewState.set('loading');
      this.errorMessage.set('');
      this.rateLimitMessage.set('');

      const { anime, originalXml, type } = await this.malParser.loadFromFile(file);

      if (anime.length === 0) {
        const itemName = type === 'manga' ? 'manga' : 'anime';
        const statusText = type === 'manga' ? 'completed or reading' : 'completed or watching';
        throw new Error(`No ${statusText} ${itemName} found in the file`);
      }

      this.originalXml.set(originalXml);
      this.listType.set(type);

      // Check if we should ask about using existing ratings
      const useExistingRatings = await this.promptForExistingRatings(anime);
      
      this.ranking.initializeRanking(anime, useExistingRatings);

      // Only fetch images for the current comparison pair (lazy loading!)
      const currentPair = this.comparisonState().currentPair;
      if (currentPair) {
        await this.loadImagesForCurrentPair(currentPair, type);
      }

      this.viewState.set('comparing');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to load file'
      );
      this.viewState.set('upload');
    }
  }

  async onAnimeSelected(winner: Anime): Promise<void> {
    const currentPair = this.comparisonState().currentPair;
    if (!currentPair) return;

    const loser = currentPair[0].id === winner.id ? currentPair[1] : currentPair[0];
    this.ranking.recordComparison(winner, loser);

    const newPair = this.comparisonState().currentPair;
    const type = this.listType();
    
    if (newPair) {
      // Load images for the new comparison pair
      await this.loadImagesForCurrentPair(newPair, type);
      
      // Preload images for likely next candidates (background loading)
      this.preloadNextCandidates(type);
    }

    if (this.comparisonState().isComplete) {
      this.viewState.set('loading');
      const ranked = this.ranking.calculateFinalRatings();
      const cache = this.imageCache();
      
      // For results, try to load any missing images
      await this.loadMissingResultImages(ranked, type);
      
      const rankedWithImages = ranked.map(item => ({
        ...item,
        imageUrl: cache.get(item.id)
      }));
      this.rankedAnime.set(rankedWithImages);
      this.viewState.set('results');
    }
  }

  onComparisonSkipped(): void {
    this.ranking.skipComparison();
    
    // Load images for the new pair after skipping
    const newPair = this.comparisonState().currentPair;
    const type = this.listType();
    if (newPair) {
      this.loadImagesForCurrentPair(newPair, type);
    }
  }

  async onUndo(): Promise<void> {
    this.ranking.undo();
    
    // Load images for the restored pair
    const currentPair = this.comparisonState().currentPair;
    const type = this.listType();
    if (currentPair) {
      await this.loadImagesForCurrentPair(currentPair, type);
    }
  }

  async onRedo(): Promise<void> {
    this.ranking.redo();
    
    // Load images for the restored pair
    const currentPair = this.comparisonState().currentPair;
    const type = this.listType();
    if (currentPair) {
      await this.loadImagesForCurrentPair(currentPair, type);
    }
  }

  onRankingDiscarded(): void {
    this.onReset();
  }

  private async promptForExistingRatings(animeList: Anime[]): Promise<boolean> {
    const withRatings = animeList.filter(a => a.rating && a.rating > 0).length;
    const total = animeList.length;
    
    // Only show dialog if at least 30% have ratings
    if (withRatings / total < 0.3) {
      return false;
    }

    // Calculate comparison estimates matching the ranking service logic
    const normalComparisons = this.estimateComparisons(total, false, withRatings);
    const reducedComparisons = this.estimateComparisons(total, true, withRatings);

    const dialogData: UseRatingsDialogData = {
      totalAnime: total,
      withRatings,
      normalComparisons,
      reducedComparisons
    };

    const dialogRef = this.dialog.open(UseRatingsDialogComponent, {
      data: dialogData,
      disableClose: true,
      width: '600px',
      maxWidth: '90vw'
    });

    const result = await dialogRef.afterClosed().toPromise();
    return result === true;
  }

  private estimateComparisons(n: number, useExistingRatings: boolean, withRatings: number): number {
    // Estimate matches generated (same logic as generateMergeSortMatches)
    const comparisonsPerItem = Math.ceil(Math.log2(n + 1) * 3);
    const estimatedMatches = Math.floor((n / 2) * comparisonsPerItem);
    
    // Base comparisons from the formula
    const baseComparisons = Math.ceil(n * Math.log2(n + 1) * 2);
    
    // Apply reduction factor if using ratings and good coverage
    const hasGoodCoverage = withRatings / n >= 0.7;
    const reductionFactor = useExistingRatings && hasGoodCoverage ? 0.6 : 1.0;
    
    // Take minimum like the ranking service does
    return Math.min(estimatedMatches, Math.ceil(baseComparisons * reductionFactor));
  }

  private async loadImagesForCurrentPair(
    pair: [Anime, Anime], 
    type: 'anime' | 'manga'
  ): Promise<void> {
    const visibleIds = [pair[0].id, pair[1].id];
    await this.jikan.fetchImagesForVisible(visibleIds, type);
  }

  private preloadNextCandidates(type: 'anime' | 'manga'): void {
    // Get a few anime that might be compared next
    const upcoming = this.ranking.getUpcomingCandidates(4);
    if (upcoming.length > 0) {
      // Don't await - let this happen in background
      this.jikan.preloadNextPair(upcoming.map(a => a.id), type);
    }
  }

  private async loadMissingResultImages(
    ranked: Anime[], 
    type: 'anime' | 'manga'
  ): Promise<void> {
    const cache = this.imageCache();
    const missingIds = ranked
      .slice(0, 20) // Only top 20 results
      .filter(item => !cache.has(item.id))
      .map(item => item.id);
    
    if (missingIds.length > 0) {
      await this.jikan.fetchImagesForVisible(missingIds, type);
    }
  }

  private showRateLimitNotification(message: string): void {
    this.snackBar.open(message, 'OK', {
      duration: 5000,
      panelClass: 'rate-limit-snackbar'
    });
  }

  onExport(displayedAnime: Anime[]): void {
    const listType = this.listType();
    const updatedXml = this.malParser.exportToXml(this.originalXml(), displayedAnime, listType);

    const blob = new Blob([updatedXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = listType === 'manga' ? 'mangalist_ranked.xml' : 'animelist_ranked.xml';
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    this.storage.clearProgress();
    this.snackBar.open('Ranking exported successfully!', 'Close', {
      duration: 3000
    });
  }

  onExportCsv(displayedAnime: Anime[]): void {
    const listType = this.listType();
    const csv = this.generateCsv(displayedAnime);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = listType === 'manga' ? 'mangalist_ranked.csv' : 'animelist_ranked.csv';
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    this.snackBar.open('Ranking exported to CSV successfully!', 'Close', {
      duration: 3000
    });
  }

  private generateCsv(animeList: Anime[]): string {
    const listType = this.listType();
    
    // CSV header
    const headers = ['Title', 'Rating', 'MAL Link'];
    
    // CSV rows
    const rows = animeList.map((anime) => {
      const title = this.escapeCsvValue(anime.title);
      const rating = anime.rating ? anime.rating.toFixed(1) : 'N/A';
      const malLink = `https://myanimelist.net/${listType}/${anime.id}`;
      
      return [title, rating, malLink].join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  }

  private escapeCsvValue(value: string): string {
    // Escape CSV values that contain commas, quotes, or newlines
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  onReset(): void {
    this.ranking.reset();
    this.jikan.clearCache();
    this.storage.clearProgress();
    this.originalXml.set('');
    this.listType.set('anime');
    this.rankedAnime.set([]);
    this.errorMessage.set('');
    this.rateLimitMessage.set('');
    this.hasStoredProgress.set(false);
    this.viewState.set('upload');
  }

  private saveProgress(): void {
    const state = this.viewState();
    if (state === 'comparing' || state === 'results') {
      this.storage.saveProgress({
        animeList: this.ranking.getAnimeList(),
        originalXml: this.originalXml(),
        listType: this.listType(),
        comparisonState: this.comparisonState(),
        viewState: state,
        rankedAnime: state === 'results' ? this.rankedAnime() : undefined,
        timestamp: Date.now()
      });
    }
  }

  private async restoreProgress(): Promise<void> {
    const stored = this.storage.loadProgress();
    if (!stored) return;

    try {
      this.viewState.set('loading');
      this.originalXml.set(stored.originalXml);
      this.listType.set(stored.listType);

      this.ranking.restoreState(stored.animeList, stored.comparisonState);

      if (stored.viewState === 'results' && stored.rankedAnime) {
        this.rankedAnime.set(stored.rankedAnime);
        this.viewState.set('results');
      } else {
        const currentPair = this.comparisonState().currentPair;
        if (currentPair) {
          // Only load images for current pair, not all
          await this.loadImagesForCurrentPair(currentPair, stored.listType);
        }
        this.viewState.set('comparing');
      }

      this.snackBar.open('Progress restored successfully', 'Close', {
        duration: 3000
      });
    } catch (error) {
      this.errorMessage.set('Failed to restore progress');
      this.storage.clearProgress();
      this.viewState.set('upload');
    }
  }
}
