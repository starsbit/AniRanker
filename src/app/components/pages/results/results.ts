import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RankingService } from '../../../services/ranking.service';
import { Anime } from '../../../models/anime';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { ViewChild } from '@angular/core';
import { NgIf, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-results',
  imports: [
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatPaginatorModule,
    MatSortModule,
    NgIf,
    DecimalPipe
  ],
  template: `
    <div class="results-container">
      <h1>Your Rankings</h1>
      
      <mat-card class="stats-card" *ngIf="animeList.length > 0">
        <mat-card-content>
          <div class="stats">
            <div class="stat">
              <span class="value">{{ animeList.length }}</span>
              <span class="label">Anime Ranked</span>
            </div>
            <div class="stat">
              <span class="value">{{ averageRating | number:'1.1-1' }}</span>
              <span class="label">Average Rating</span>
            </div>
            <div class="stat">
              <span class="value">{{ topAnime?.title || '-' }}</span>
              <span class="label">Top Rated</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="table-card">
        <mat-card-header>
          <mat-card-title>Ranked List</mat-card-title>
          <div class="actions">
            <button mat-button (click)="exportJson()">
              <mat-icon>download</mat-icon>
              Export JSON
            </button>
            <button mat-raised-button color="primary" (click)="startNewRanking()">
              <mat-icon>refresh</mat-icon>
              New Ranking
            </button>
          </div>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="dataSource" matSort class="anime-table">
            <ng-container matColumnDef="rank">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Rank</th>
              <td mat-cell *matCellDef="let anime; let i = index">{{ i + 1 }}</td>
            </ng-container>

            <ng-container matColumnDef="image">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let anime">
                <img [src]="anime.main_picture.medium" [alt]="anime.title" class="anime-thumb">
              </td>
            </ng-container>

            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Title</th>
              <td mat-cell *matCellDef="let anime" class="title-cell">{{ anime.title }}</td>
            </ng-container>

            <ng-container matColumnDef="rating">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Rating</th>
              <td mat-cell *matCellDef="let anime">
                <span class="rating-badge" [class.high]="anime.rating >= 8" [class.low]="anime.rating <= 5">
                  {{ anime.rating | number:'1.1-1' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="elo">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Elo</th>
              <td mat-cell *matCellDef="let anime">{{ anime.elo | number:'1.0-0' }}</td>
            </ng-container>

            <ng-container matColumnDef="comparisons">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Comparisons</th>
              <td mat-cell *matCellDef="let anime">{{ anime.comparisons || 0 }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
          <mat-paginator [pageSizeOptions]="[10, 25, 50, 100]" showFirstLastButtons></mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .results-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      
      h1 {
        font-size: 2.5rem;
        font-weight: 300;
        margin-bottom: 2rem;
        text-align: center;
      }
    }
    
    .stats-card {
      margin-bottom: 2rem;
      
      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 2rem;
        text-align: center;
        
        .stat {
          display: flex;
          flex-direction: column;
          
          .value {
            font-size: 2rem;
            font-weight: 500;
            color: #3f51b5;
          }
          
          .label {
            font-size: 0.9rem;
            color: #666;
            margin-top: 0.25rem;
          }
        }
      }
    }
    
    .table-card {
      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        
        .actions {
          display: flex;
          gap: 0.5rem;
        }
      }
    }
    
    .anime-table {
      width: 100%;
      
      .anime-thumb {
        width: 50px;
        height: 70px;
        object-fit: cover;
        border-radius: 4px;
      }
      
      .title-cell {
        max-width: 400px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .rating-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 16px;
        font-weight: 500;
        background: #e0e0e0;
        
        &.high {
          background: #c8e6c9;
          color: #2e7d32;
        }
        
        &.low {
          background: #ffcdd2;
          color: #c62828;
        }
      }
      
      th {
        font-weight: 500;
      }
      
      td {
        vertical-align: middle;
      }
    }
    
    @media (max-width: 768px) {
      .results-container {
        padding: 1rem;
      }
      
      .table-card mat-card-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
        
        .actions {
          justify-content: center;
        }
      }
      
      .anime-table .title-cell {
        max-width: 150px;
      }
    }
  `]
})
export class ResultsComponent implements OnInit {
  animeList: Anime[] = [];
  dataSource = new MatTableDataSource<Anime>([]);
  displayedColumns = ['rank', 'image', 'title', 'rating', 'elo', 'comparisons'];
  
  @ViewChild(MatSort) sort!: MatSort;
  
  constructor(
    private rankingService: RankingService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit() {
    this.animeList = this.rankingService.calculateFinalRatings();
    this.dataSource.data = this.animeList;
  }
  
  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }
  
  get averageRating(): number {
    if (this.animeList.length === 0) return 0;
    return this.animeList.reduce((sum, a) => sum + (a.rating || 0), 0) / this.animeList.length;
  }
  
  get topAnime(): Anime | null {
    return this.animeList.length > 0 ? this.animeList[0] : null;
  }
  
  exportJson() {
    const json = this.rankingService.exportToMalFormat();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mal-rankings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.snackBar.open('Export downloaded!', 'Close', { duration: 3000 });
  }
  
  startNewRanking() {
    if (confirm('Start a new ranking? Current results will be cleared.')) {
      this.rankingService.reset();
      this.router.navigate(['/import']);
    }
  }
}
