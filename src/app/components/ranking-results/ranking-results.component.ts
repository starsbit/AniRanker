import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Anime } from '../../models/anime.model';

@Component({
  selector: 'app-ranking-results',
  templateUrl: './ranking-results.component.html',
  styleUrl: './ranking-results.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatTooltipModule]
})
export class RankingResultsComponent {
  rankedAnime = input.required<Anime[]>();

  exportRequested = output<void>();
  resetRequested = output<void>();

  displayedColumns = ['rank', 'image', 'title', 'stats', 'rating'];

  getTooltip(anime: Anime): string {
    const wins = anime.wins || 0;
    const losses = anime.losses || 0;
    const winRate = anime.comparisons > 0 ? ((wins / anime.comparisons) * 100).toFixed(0) : '0';
    
    return `Win Rate: ${winRate}% (${wins}W / ${losses}L)
Strength: ${anime.elo.toFixed(3)}
Comparisons: ${anime.comparisons}

Rating uses the Bradley-Terry model - the gold standard
for pairwise comparison rankings. Strength represents
relative performance quality, not just win count.`;
  }

  onExport(): void {
    this.exportRequested.emit();
  }

  onReset(): void {
    this.resetRequested.emit();
  }
}
