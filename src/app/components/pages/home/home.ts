import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <div class="home-container">
      <section class="hero">
        <h1>MAL Ranker</h1>
        <p class="subtitle">Rank your anime with pairwise comparisons</p>
        <p class="description">
          Upload your MyAnimeList and discover your true anime rankings through 
          simple head-to-head comparisons. Our algorithm generates accurate ratings 
          based on your preferences.
        </p>
        <button mat-raised-button color="primary" routerLink="/import" class="cta-button">
          <mat-icon>play_arrow</mat-icon>
          Start Ranking
        </button>
      </section>

      <section class="features">
        <mat-card class="feature-card">
          <mat-icon>compare_arrows</mat-icon>
          <h3>Pairwise Comparisons</h3>
          <p>Simply choose which anime you prefer between two options</p>
        </mat-card>
        
        <mat-card class="feature-card">
          <mat-icon>insights</mat-icon>
          <h3>Smart Algorithm</h3>
          <p>Elo-based rating system with optimized comparison count</p>
        </mat-card>
        
        <mat-card class="feature-card">
          <mat-icon>download</mat-icon>
          <h3>Export Results</h3>
          <p>Export your rankings back to MAL format</p>
        </mat-card>
      </section>
    </div>
  `,
  styles: [`
    .home-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    .hero {
      text-align: center;
      padding: 4rem 2rem;
      
      h1 {
        font-size: 3.5rem;
        margin-bottom: 0.5rem;
        font-weight: 300;
      }
      
      .subtitle {
        font-size: 1.5rem;
        color: #666;
        margin-bottom: 1.5rem;
      }
      
      .description {
        max-width: 600px;
        margin: 0 auto 2rem;
        font-size: 1.1rem;
        line-height: 1.6;
        color: #555;
      }
    }
    
    .cta-button {
      font-size: 1.2rem;
      padding: 0.75rem 2rem;
      
      mat-icon {
        margin-right: 0.5rem;
      }
    }
    
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }
    
    .feature-card {
      padding: 2rem;
      text-align: center;
      
      mat-icon {
        font-size: 3rem;
        width: 3rem;
        height: 3rem;
        color: #3f51b5;
        margin-bottom: 1rem;
      }
      
      h3 {
        margin-bottom: 0.5rem;
        font-weight: 500;
      }
      
      p {
        color: #666;
      }
    }
    
    @media (max-width: 600px) {
      .hero h1 {
        font-size: 2.5rem;
      }
      
      .hero .subtitle {
        font-size: 1.2rem;
      }
    }
  `]
})
export class HomeComponent {}
