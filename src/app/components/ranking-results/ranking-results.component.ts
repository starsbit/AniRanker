import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Anime } from '../../models/anime.model';

@Component({
  selector: 'app-ranking-results',
  templateUrl: './ranking-results.component.html',
  styleUrl: './ranking-results.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatCardModule]
})
export class RankingResultsComponent {
  rankedAnime = input.required<Anime[]>();

  exportRequested = output<void>();
  resetRequested = output<void>();

  displayedColumns = ['rank', 'image', 'title', 'rating'];

  onExport(): void {
    this.exportRequested.emit();
  }

  onReset(): void {
    this.resetRequested.emit();
  }
}
