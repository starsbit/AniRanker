import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { AnimeComparisonComponent } from '../../components/anime-comparison/anime-comparison.component';
import { RankingResultsComponent } from '../../components/ranking-results/ranking-results.component';
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

  viewState = signal<ViewState>('upload');
  originalXml = signal<string>('');
  listType = signal<'anime' | 'manga'>('anime');
  rankedAnime = signal<Anime[]>([]);
  errorMessage = signal<string>('');
  hasStoredProgress = signal<boolean>(false);

  comparisonState = this.ranking.comparisonState;
  progress = this.ranking.progress;
  imageCache = this.jikan.imageCache;

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

  async onFileSelected(file: File): Promise<void> {
    try {
      this.viewState.set('loading');
      this.errorMessage.set('');

      const { anime, originalXml, type } = await this.malParser.loadFromFile(file);

      if (anime.length === 0) {
        const itemName = type === 'manga' ? 'manga' : 'anime';
        const statusText = type === 'manga' ? 'completed or reading' : 'completed or watching';
        throw new Error(`No ${statusText} ${itemName} found in the file`);
      }

      this.originalXml.set(originalXml);
      this.listType.set(type);
      this.ranking.initializeRanking(anime);

      const currentPair = this.comparisonState().currentPair;
      if (currentPair) {
        const priorityIds = [currentPair[0].id, currentPair[1].id];
        this.jikan.loadImagesForList(anime, type, priorityIds);
      }

      this.viewState.set('comparing');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to load file'
      );
      this.viewState.set('upload');
    }
  }

  onAnimeSelected(winner: Anime): void {
    const currentPair = this.comparisonState().currentPair;
    if (!currentPair) return;

    const loser = currentPair[0].id === winner.id ? currentPair[1] : currentPair[0];
    this.ranking.recordComparison(winner, loser);

    const newPair = this.comparisonState().currentPair;
    const type = this.listType();
    if (newPair) {
      this.jikan.fetchImage(newPair[0].id, type, true);
      this.jikan.fetchImage(newPair[1].id, type, true);
    }

    if (this.comparisonState().isComplete) {
      this.viewState.set('loading');
      const ranked = this.ranking.calculateFinalRatings();
      const cache = this.imageCache();
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
  }

  onExport(): void {
    const ranked = this.rankedAnime();
    const listType = this.listType();
    const updatedXml = this.malParser.exportToXml(this.originalXml(), ranked, listType);

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

  onReset(): void {
    this.ranking.reset();
    this.jikan.clearCache();
    this.storage.clearProgress();
    this.originalXml.set('');
    this.listType.set('anime');
    this.rankedAnime.set([]);
    this.errorMessage.set('');
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

  private restoreProgress(): void {
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
          const priorityIds = [currentPair[0].id, currentPair[1].id];
          this.jikan.loadImagesForList(stored.animeList, stored.listType, priorityIds);
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
