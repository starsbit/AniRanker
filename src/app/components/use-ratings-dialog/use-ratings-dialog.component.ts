import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';

export interface UseRatingsDialogData {
  totalAnime: number;
  withRatings: number;
  normalComparisons: number;
  reducedComparisons: number;
}

@Component({
  selector: 'app-use-ratings-dialog',
  templateUrl: './use-ratings-dialog.component.html',
  styleUrl: './use-ratings-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule, 
    MatButtonModule, 
    MatIconModule,
    MatCardModule,
    MatListModule,
    MatDividerModule
  ]
})
export class UseRatingsDialogComponent {
  private dialogRef = inject(MatDialogRef<UseRatingsDialogComponent>);
  data = inject<UseRatingsDialogData>(MAT_DIALOG_DATA);

  getSavingsPercent(): number {
    const savings = this.data.normalComparisons - this.data.reducedComparisons;
    return Math.round((savings / this.data.normalComparisons) * 100);
  }

  onYes(): void {
    this.dialogRef.close(true);
  }

  onNo(): void {
    this.dialogRef.close(false);
  }
}
