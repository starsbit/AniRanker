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
  template: `
    <div class="import-container">
      <h1>Import Your Anime List</h1>
      
      <mat-card class="upload-card">
        <mat-card-content>
          <div class="upload-area" 
               [class.dragover]="isDragging"
               (dragover)="onDragOver($event)"
               (dragleave)="onDragLeave($event)"
               (drop)="onDrop($event)">
            <mat-icon class="upload-icon">cloud_upload</mat-icon>
            <p>Drag and drop your MAL export JSON file here</p>
            <p class="or-divider">or</p>
            <input type="file" 
                   #fileInput 
                   accept=".json" 
                   (change)="onFileSelected($event)"
                   hidden>
            <button mat-raised-button color="primary" (click)="fileInput.click()">
              <mat-icon>folder_open</mat-icon>
              Choose File
            </button>
          </div>
          
          <div class="instructions">
            <h3>How to export from MyAnimeList:</h3>
            <ol>
              <li>Go to your MAL profile</li>
              <li>Click "Export" in the anime list section</li>
              <li>Download the JSON file</li>
              <li>Upload it here</li>
            </ol>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="preview-card" *ngIf="animeList.length > 0">
        <mat-card-header>
          <mat-card-title>Loaded {{ animeList.length }} Anime</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="anime-preview">
            <div class="anime-item" *ngFor="let anime of previewAnime">
              <img [src]="anime.main_picture.medium" [alt]="anime.title">
              <span class="title">{{ anime.title }}</span>
            </div>
          </div>
          <mat-progress-bar mode="determinate" 
                           [value]="(animeList.length / totalExpected) * 100">
          </mat-progress-bar>
        </mat-card-content>
        <mat-card-actions>
          <button mat-button (click)="clearData()">Clear</button>
          <button mat-raised-button color="primary" (click)="startRanking()">
            <mat-icon>play_arrow</mat-icon>
            Start Ranking
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .import-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      
      h1 {
        font-size: 2.5rem;
        font-weight: 300;
        margin-bottom: 2rem;
        text-align: center;
      }
    }
    
    .upload-card {
      margin-bottom: 2rem;
    }
    
    .upload-area {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 3rem 2rem;
      text-align: center;
      transition: all 0.3s ease;
      
      &.dragover {
        border-color: #3f51b5;
        background: rgba(63, 81, 181, 0.05);
      }
      
      .upload-icon {
        font-size: 4rem;
        width: 4rem;
        height: 4rem;
        color: #999;
        margin-bottom: 1rem;
      }
      
      p {
        color: #666;
        margin-bottom: 0.5rem;
      }
      
      .or-divider {
        margin: 1rem 0;
        font-size: 0.9rem;
      }
    }
    
    .instructions {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #eee;
      
      h3 {
        margin-bottom: 1rem;
        font-weight: 500;
      }
      
      ol {
        padding-left: 1.5rem;
        
        li {
          margin-bottom: 0.5rem;
          color: #555;
        }
      }
    }
    
    .preview-card {
      .anime-preview {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .anime-item {
        text-align: center;
        
        img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }
        
        .title {
          font-size: 0.85rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.3;
        }
      }
      
      mat-card-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
    }
  `]
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
