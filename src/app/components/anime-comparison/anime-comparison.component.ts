import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { Anime } from '../../models/anime.model';

@Component({
  selector: 'app-anime-comparison',
  templateUrl: './anime-comparison.component.html',
  styleUrl: './anime-comparison.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatButtonModule, MatProgressBarModule, MatIconModule]
})
export class AnimeComparisonComponent {
  leftAnime = input.required<Anime>();
  rightAnime = input.required<Anime>();
  progress = input.required<number>();
  comparisonsDone = input.required<number>();
  totalComparisons = input.required<number>();

  animeSelected = output<Anime>();
  comparisonSkipped = output<void>();

  selectAnime(anime: Anime): void {
    this.animeSelected.emit(anime);
  }

  skipComparison(): void {
    this.comparisonSkipped.emit();
  }
}
