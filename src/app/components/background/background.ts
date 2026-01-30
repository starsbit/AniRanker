import { NgStyle } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-background',
  imports: [NgStyle],
  templateUrl: './background.html',
  styleUrls: ['./background.css'],
})
export class BackgroundComponent {
  backgroundImageUrl = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80';
}
