import { Component, ChangeDetectionStrategy, input, output, inject, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Anime } from '../../models/anime.model';

@Component({
  selector: 'app-anime-comparison',
  templateUrl: './anime-comparison.component.html',
  styleUrl: './anime-comparison.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatButtonModule, MatProgressBarModule, MatIconModule, MatDialogModule]
})
export class AnimeComparisonComponent {
  private dialog = inject(MatDialog);

  leftAnime = input.required<Anime>();
  rightAnime = input.required<Anime>();
  progress = input.required<number>();
  comparisonsDone = input.required<number>();
  totalComparisons = input.required<number>();
  canUndo = input.required<boolean>();
  canRedo = input.required<boolean>();

  animeSelected = output<Anime>();
  comparisonSkipped = output<void>();
  rankingDiscarded = output<void>();
  undoRequested = output<void>();
  redoRequested = output<void>();
  exportRequested = output<void>();

  mediaType = computed(() => this.leftAnime().type);

  selectAnime(anime: Anime): void {
    this.animeSelected.emit(anime);
  }

  skipComparison(): void {
    this.comparisonSkipped.emit();
  }

  undo(): void {
    this.undoRequested.emit();
  }

  redo(): void {
    this.redoRequested.emit();
  }

  async discardRanking(): Promise<void> {
    const confirmed = confirm('Are you sure you want to discard your current ranking progress? This action cannot be undone.');
    
    if (confirmed) {
      this.rankingDiscarded.emit();
    }
  }

  exportResults(): void {
    this.exportRequested.emit();
  }
}
