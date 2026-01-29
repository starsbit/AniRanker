import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RankingService, ComparisonState } from '../../../services/ranking.service';
import { Anime } from '../../../models/anime';
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
  template: `
    <div class="ranker-container" *ngIf="!state.isComplete && state.currentPair">
      <div class="progress-section">
        <div class="progress-info">
          <span>Progress: {{ state.comparisonsDone }} / {{ state.totalComparisons }}</span>
          <span class="percentage">{{ progressPercentage }}%</span>
        </div>
        <mat-progress-bar mode="determinate" [value]="progressPercentage"></mat-progress-bar>
      </div>

      <h2 class="question">Which anime do you prefer?</h2>

      <div class="comparison-cards">
        <mat-card class="anime-card" (click)="selectWinner(0)">
          <img mat-card-image 
               [src]="state.currentPair[0].main_picture.medium" 
               [alt]="state.currentPair[0].title">
          <mat-card-content>
            <h3>{{ state.currentPair[0].title }}</h3>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" class="select-btn">
              <mat-icon>check_circle</mat-icon>
              Select
            </button>
          </mat-card-actions>
        </mat-card>

        <div class="vs-divider">
          <span>VS</span>
        </div>

        <mat-card class="anime-card" (click)="selectWinner(1)">
          <img mat-card-image 
               [src]="state.currentPair[1].main_picture.medium" 
               [alt]="state.currentPair[1].title">
          <mat-card-content>
            <h3>{{ state.currentPair[1].title }}</h3>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" class="select-btn">
              <mat-icon>check_circle</mat-icon>
              Select
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <div class="actions">
        <button mat-button (click)="skip()">
          <mat-icon>skip_next</mat-icon>
          Skip
        </button>
        <button mat-button color="warn" (click)="abort()">
          <mat-icon>stop</mat-icon>
          Stop
        </button>
      </div>
    </div>

    <div class="complete-container" *ngIf="state.isComplete">
      <mat-icon class="complete-icon">emoji_events</mat-icon>
      <h2>Ranking Complete!</h2>
      <p>You've completed {{ state.comparisonsDone }} comparisons.</p>
      <button mat-raised-button color="primary" (click)="viewResults()">
        <mat-icon>visibility</mat-icon>
        View Results
      </button>
    </div>

    <div class="empty-container" *ngIf="!state.currentPair && !state.isComplete">
      <mat-icon class="empty-icon">error_outline</mat-icon>
      <h2>No Anime Loaded</h2>
      <p>Please import your anime list first.</p>
      <button mat-raised-button color="primary" routerLink="/import">
        <mat-icon>upload</mat-icon>
        Go to Import
      </button>
    </div>
  `,
  styles: [`
    .ranker-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }
    
    .progress-section {
      margin-bottom: 2rem;
      
      .progress-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-weight: 500;
        
        .percentage {
          color: #3f51b5;
        }
      }
    }
    
    .question {
      text-align: center;
      font-size: 1.8rem;
      font-weight: 300;
      margin-bottom: 2rem;
    }
    
    .comparison-cards {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 2rem;
      align-items: center;
      margin-bottom: 2rem;
      
      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        
        .vs-divider {
          order: -1;
          transform: rotate(90deg);
        }
      }
    }
    
    .anime-card {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      
      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      }
      
      img {
        width: 100%;
        height: 400px;
        object-fit: cover;
      }
      
      mat-card-content {
        h3 {
          margin: 0;
          font-size: 1.2rem;
          line-height: 1.4;
          min-height: 3.3rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      }
      
      mat-card-actions {
        display: flex;
        justify-content: center;
        padding: 1rem;
        
        .select-btn {
          width: 100%;
          
          mat-icon {
            margin-right: 0.5rem;
          }
        }
      }
    }
    
    .vs-divider {
      font-size: 2rem;
      font-weight: bold;
      color: #999;
      text-align: center;
      
      span {
        display: block;
        padding: 1rem;
        border-radius: 50%;
        background: #f5f5f5;
      }
    }
    
    .actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
    }
    
    .complete-container,
    .empty-container {
      text-align: center;
      padding: 4rem 2rem;
      
      .complete-icon,
      .empty-icon {
        font-size: 5rem;
        width: 5rem;
        height: 5rem;
        color: #3f51b5;
        margin-bottom: 1rem;
      }
      
      h2 {
        font-size: 2rem;
        font-weight: 300;
        margin-bottom: 1rem;
      }
      
      p {
        color: #666;
        margin-bottom: 2rem;
      }
      
      button {
        mat-icon {
          margin-right: 0.5rem;
        }
      }
    }
    
    .empty-icon {
      color: #999 !important;
    }
  `]
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
