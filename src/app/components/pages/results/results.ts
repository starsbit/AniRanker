import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { NgIf, DecimalPipe } from '@angular/common';
import { RankingService } from '../../../services/ranking.service';
import { Anime } from '../../../models/anime';

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
  templateUrl: './results.html',
  styleUrls: ['./results.css']
})
export class ResultsComponent implements OnInit, AfterViewInit {
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
