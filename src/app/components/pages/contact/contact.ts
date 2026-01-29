import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-contact',
  imports: [MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="contact-container">
      <h1>Contact</h1>
      
      <mat-card class="contact-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>code</mat-icon>
          <mat-card-title>Developer</mat-card-title>
          <mat-card-subtitle>starsbit</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>
            MAL Ranker is an open-source project created for the anime community.
            Feel free to reach out with suggestions, bug reports, or contributions.
          </p>
        </mat-card-content>
        <mat-card-actions>
          <a mat-button href="https://github.com/starsbit/MAL-Ranker" target="_blank">
            <mat-icon>open_in_new</mat-icon>
            GitHub Repository
          </a>
          <a mat-button href="https://myanimelist.net/profile/starsbit" target="_blank">
            <mat-icon>person</mat-icon>
            MAL Profile
          </a>
        </mat-card-actions>
      </mat-card>

      <mat-card class="contact-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>bug_report</mat-icon>
          <mat-card-title>Issues & Feedback</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>
            Found a bug or have a feature request? Please open an issue on GitHub 
            with details about the problem or suggestion.
          </p>
        </mat-card-content>
        <mat-card-actions>
          <a mat-button href="https://github.com/starsbit/MAL-Ranker/issues" target="_blank">
            <mat-icon>open_in_new</mat-icon>
            Open Issue
          </a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .contact-container {
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
    
    .contact-card {
      margin-bottom: 1.5rem;
      
      mat-icon[mat-card-avatar] {
        font-size: 2.5rem;
        width: 2.5rem;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      mat-card-content p {
        line-height: 1.6;
      }
      
      a {
        text-decoration: none;
      }
    }
  `]
})
export class ContactComponent {}
