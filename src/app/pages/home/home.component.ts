import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { AnimeComparisonComponent } from '../../components/anime-comparison/anime-comparison.component';
import { RankingResultsComponent } from '../../components/ranking-results/ranking-results.component';
import { MalParserService } from '../../services/mal-parser.service';
import { JikanService } from '../../services/jikan.service';
import { RankingService } from '../../services/ranking.service';
import { Anime } from '../../models/anime.model';

type ViewState = 'upload' | 'loading' | 'comparing' | 'results';

@Component({
  selector: 'ba-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatProgressSpinnerModule,
    FileUploadComponent,
    AnimeComparisonComponent,
    RankingResultsComponent
  ]
})
export class HomeComponent {
  private malParser = inject(MalParserService);
  private jikan = inject(JikanService);
  private ranking = inject(RankingService);

  viewState = signal<ViewState>('upload');
  originalXml = signal<string>('');
  listType = signal<'anime' | 'manga'>('anime');
  rankedAnime = signal<Anime[]>([]);
  errorMessage = signal<string>('');

  comparisonState = this.ranking.comparisonState;
  progress = this.ranking.progress;
  imageCache = this.jikan.imageCache;

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
  }

  onReset(): void {
    this.ranking.reset();
    this.jikan.clearCache();
    this.originalXml.set('');
    this.listType.set('anime');
    this.rankedAnime.set([]);
    this.errorMessage.set('');
    this.viewState.set('upload');
  }
}
