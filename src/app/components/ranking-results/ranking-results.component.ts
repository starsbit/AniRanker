import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Anime } from '../../models/anime.model';

@Component({
  selector: 'app-ranking-results',
  templateUrl: './ranking-results.component.html',
  styleUrl: './ranking-results.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatTooltipModule, MatCheckboxModule, MatProgressBarModule]
})
export class RankingResultsComponent {
  rankedAnime = input.required<Anime[]>();
  isLiveMode = input<boolean>(false);
  accuracy = input<number>(0);

  exportRequested = output<Anime[]>();
  resetRequested = output<void>();

  displayedColumns = ['rank', 'image', 'title', 'stats', 'rating'];
  useDistributional = signal<boolean>(false);

  displayedAnime = computed(() => {
    const anime = this.rankedAnime();
    if (!this.useDistributional()) {
      return anime;
    }
    return this.applyDistributionalRatings(anime);
  });

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

  getRatingModeTooltip(): string {
    if (this.useDistributional()) {
      return `Distributional Mode: Uses Beta(7,3) distribution scaled to [0-10]
with mean at 7.0 and 20% upper tail bias. Rankings determined by
Bradley-Terry, but ratings follow a predefined distribution curve
similar to typical MAL rating distributions.`;
    } else {
      return `Bradley-Terry Mode: Ratings calculated directly from pairwise
comparison strengths using the Bradley-Terry model. More accurate
representation of relative quality differences between items.`;
    }
  }

  getAccuracyColor(): string {
    const acc = this.accuracy();
    if (acc >= 80) return 'primary';
    if (acc >= 60) return 'accent';
    return 'warn';
  }

  getAccuracyTooltip(): string {
    const acc = this.accuracy();
    if (acc >= 80) {
      return 'High Confidence: Rankings are well-established with balanced comparison coverage.';
    } else if (acc >= 60) {
      return 'Medium Confidence: Rankings are reasonably stable. More comparisons will improve accuracy.';
    } else {
      return 'Low Confidence: Early stage. Continue comparing for more reliable rankings.';
    }
  }

  onExport(): void {
    this.exportRequested.emit(this.displayedAnime());
  }

  onReset(): void {
    this.resetRequested.emit();
  }

  toggleDistributional(): void {
    this.useDistributional.update(v => !v);
  }

  /**
   * Apply distributional ratings using scaled Beta distribution
   * Beta(α=7, β=3) gives mean at 0.7, right-skewed (upper tail bias)
   * Scaled to [0, 10] to match MAL rating scale
   */
  private applyDistributionalRatings(animeList: Anime[]): Anime[] {
    if (animeList.length === 0) return [];

    const n = animeList.length;
    
    // Calculate raw Beta-distributed values
    const withBetaValues = animeList.map((anime, index) => {
      // Calculate quantile position
      // Reverse mapping: best items (index 0) get high quantiles → high ratings
      const quantile = (n - index - 0.5) / n;
      
      // Apply inverse Beta CDF with α=7, β=3
      // Beta(7,3) gives mean at 0.7, right-skewed toward upper tail (20% bias)
      const betaValue = this.betaInverseCDF(quantile, 7, 3);
      
      return { anime, betaValue };
    });

    // Scale to [0, 10]
    const rawRatings = withBetaValues.map(item => item.betaValue * 10);
    const maxRating = Math.max(...rawRatings);
    
    // If the max is below 10, scale up so top item(s) reach 10
    // This allows multiple items to get 10.0 if they're very close in the distribution
    const scaleFactor = maxRating > 0 && maxRating < 10 ? 10 / maxRating : 1;
    
    // Apply scaling and round
    return withBetaValues.map(({ anime, betaValue }) => {
      const rating = Math.round(betaValue * 10 * scaleFactor * 10) / 10;
      
      return {
        ...anime,
        rating: Math.max(0, Math.min(10, rating))
      };
    });
  }

  /**
   * Inverse CDF (quantile function) of Beta distribution
   * Uses bisection method for numerical approximation
   */
  private betaInverseCDF(p: number, alpha: number, beta: number): number {
    if (p <= 0) return 0;
    if (p >= 1) return 1;

    // Bisection method
    let lower = 0;
    let upper = 1;
    let mid = 0.5;
    const tolerance = 0.0001;
    const maxIterations = 50;

    for (let i = 0; i < maxIterations; i++) {
      mid = (lower + upper) / 2;
      const cdf = this.betaCDF(mid, alpha, beta);
      
      if (Math.abs(cdf - p) < tolerance) {
        break;
      }
      
      if (cdf < p) {
        lower = mid;
      } else {
        upper = mid;
      }
    }

    return mid;
  }

  /**
   * CDF of Beta distribution using incomplete beta function
   */
  private betaCDF(x: number, alpha: number, beta: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return this.incompleteBeta(x, alpha, beta);
  }

  /**
   * Regularized incomplete beta function I_x(a,b)
   * Uses continued fraction approximation
   */
  private incompleteBeta(x: number, a: number, b: number): number {
    if (x === 0) return 0;
    if (x === 1) return 1;

    // Use symmetry relation if x > (a+1)/(a+b+2)
    if (x > (a + 1) / (a + b + 2)) {
      return 1 - this.incompleteBeta(1 - x, b, a);
    }

    const lnBetaAB = this.lnGamma(a) + this.lnGamma(b) - this.lnGamma(a + b);
    const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBetaAB) / a;

    return front * this.betaContinuedFraction(x, a, b);
  }

  /**
   * Continued fraction for incomplete beta function
   */
  private betaContinuedFraction(x: number, a: number, b: number): number {
    const maxIterations = 200;
    const epsilon = 1e-10;
    
    let am = 1;
    let bm = 1;
    let az = 1;
    let qab = a + b;
    let qap = a + 1;
    let qam = a - 1;
    let bz = 1 - qab * x / qap;

    for (let m = 1; m <= maxIterations; m++) {
      const em = m;
      const tem = em + em;
      let d = em * (b - m) * x / ((qam + tem) * (a + tem));
      
      let ap = az + d * am;
      let bp = bz + d * bm;
      d = -(a + em) * (qab + em) * x / ((a + tem) * (qap + tem));
      const app = ap + d * az;
      const bpp = bp + d * bz;
      
      const aold = az;
      am = ap / bpp;
      bm = bp / bpp;
      az = app / bpp;
      bz = 1;

      if (Math.abs(az - aold) < epsilon * Math.abs(az)) {
        return az;
      }
    }

    return az;
  }

  /**
   * Natural logarithm of gamma function
   * Lanczos approximation
   */
  private lnGamma(z: number): number {
    const g = 7;
    const coef = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];

    if (z < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * z)) - this.lnGamma(1 - z);
    }

    z -= 1;
    let x = coef[0];
    for (let i = 1; i < g + 2; i++) {
      x += coef[i] / (z + i);
    }

    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
}
