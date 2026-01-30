import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AnimeService } from '../../../services/anime.service';
import { RankingService } from '../../../services/ranking.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-import',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    NgIf,
    NgFor
  ],
  templateUrl: './import.html',
  styleUrls: ['./import.css']
})
export class ImportComponent {
  isDragging = false;
  animeList: any[] = [];
  totalExpected = 100;

  constructor(
    private animeService: AnimeService,
    private rankingService: RankingService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.animeService.animeList$.subscribe(list => {
      this.animeList = list;
    });
  }

  get previewAnime() {
    return this.animeList.slice(0, 6);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  async processFile(file: File) {
    try {
      await this.animeService.loadFromFile(file);
      this.snackBar.open(`Loaded ${this.animeList.length} anime!`, 'Close', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Failed to load file. Please check the format.', 'Close', { duration: 5000 });
    }
  }

  clearData() {
    this.animeService.setAnimeList([]);
    this.rankingService.reset();
  }

  startRanking() {
    if (this.animeList.length < 2) {
      this.snackBar.open('Need at least 2 anime to rank!', 'Close', { duration: 3000 });
      return;
    }
    this.rankingService.initializeRanking(this.animeList);
    this.router.navigate(['/rank']);
  }
}
