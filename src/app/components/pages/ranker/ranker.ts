import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RankingService, ComparisonState } from '../../../services/ranking.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-ranker',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    NgIf
  ],
  templateUrl: './ranker.html',
  styleUrls: ['./ranker.css']
})
export class RankerComponent implements OnInit, OnDestroy {
  state: ComparisonState = {
    animeList: [],
    currentPair: null,
    comparisonsDone: 0,
    totalComparisons: 0,
    isComplete: false
  };

  private destroy$ = new Subject<void>();

  constructor(
    private rankingService: RankingService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.rankingService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.state = state;
        if (state.isComplete) {
          this.snackBar.open('Ranking complete!', 'View Results', { duration: 5000 })
            .onAction()
            .subscribe(() => this.viewResults());
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get progressPercentage(): number {
    if (this.state.totalComparisons === 0) return 0;
    return Math.round((this.state.comparisonsDone / this.state.totalComparisons) * 100);
  }

  selectWinner(index: number) {
    if (!this.state.currentPair) return;
    const winner = this.state.currentPair[index];
    const loser = this.state.currentPair[1 - index];
    this.rankingService.recordComparison(winner, loser);
  }

  skip() {
    this.rankingService.skipComparison();
  }

  abort() {
    if (confirm('Are you sure you want to stop? Your progress will be lost.')) {
      this.rankingService.reset();
      this.router.navigate(['/']);
    }
  }

  viewResults() {
    this.router.navigate(['/results']);
  }
}
