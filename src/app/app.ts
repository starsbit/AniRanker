import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule
  ],
  template: `
    <div class="app-container">
      <mat-toolbar color="primary" class="navbar">
        <a routerLink="/" class="brand">
          <mat-icon>assessment</mat-icon>
          <span>MAL Ranker</span>
        </a>
        <span class="spacer"></span>
        <nav class="desktop-nav">
          <a mat-button routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Home</a>
          <a mat-button routerLink="/about" routerLinkActive="active">About</a>
          <a mat-button routerLink="/contact" routerLinkActive="active">Contact</a>
          <a mat-raised-button color="accent" routerLink="/import">Start Ranking</a>
        </nav>
        <button mat-icon-button [matMenuTriggerFor]="menu" class="mobile-menu">
          <mat-icon>menu</mat-icon>
        </button>
      </mat-toolbar>

      <mat-menu #menu="matMenu">
        <a mat-menu-item routerLink="/">
          <mat-icon>home</mat-icon>
          <span>Home</span>
        </a>
        <a mat-menu-item routerLink="/about">
          <mat-icon>info</mat-icon>
          <span>About</span>
        </a>
        <a mat-menu-item routerLink="/contact">
          <mat-icon>contact_mail</mat-icon>
          <span>Contact</span>
        </a>
        <a mat-menu-item routerLink="/import">
          <mat-icon>play_arrow</mat-icon>
          <span>Start Ranking</span>
        </a>
      </mat-menu>

      <main class="content">
        <router-outlet></router-outlet>
      </main>

      <footer class="footer">
        <p>&copy; 2025 MAL Ranker. Built with Angular Material.</p>
        <div class="links">
          <a href="https://github.com/starsbit/MAL-Ranker" target="_blank">
            <mat-icon>open_in_new</mat-icon>
            GitHub
          </a>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    
    .navbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      
      .brand {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: white;
        text-decoration: none;
        font-size: 1.2rem;
        font-weight: 500;
        
        mat-icon {
          font-size: 1.5rem;
          width: 1.5rem;
          height: 1.5rem;
        }
      }
      
      .spacer {
        flex: 1;
      }
      
      .desktop-nav {
        display: flex;
        gap: 0.5rem;
        
        a {
          &.active {
            background: rgba(255,255,255,0.15);
          }
        }
      }
      
      .mobile-menu {
        display: none;
      }
      
      @media (max-width: 768px) {
        .desktop-nav {
          display: none;
        }
        
        .mobile-menu {
          display: block;
        }
      }
    }
    
    .content {
      flex: 1;
      background: #fafafa;
    }
    
    .footer {
      background: #303030;
      color: white;
      padding: 1.5rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      p {
        margin: 0;
      }
      
      .links {
        a {
          color: white;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          
          mat-icon {
            font-size: 1rem;
            width: 1rem;
            height: 1rem;
          }
          
          &:hover {
            text-decoration: underline;
          }
        }
      }
      
      @media (max-width: 768px) {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
    }
  `]
})
export class App {
  title = 'mal-ranker';
}
