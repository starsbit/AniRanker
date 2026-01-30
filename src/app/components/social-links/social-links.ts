import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-social-links',
  imports: [NgOptimizedImage],
  templateUrl: './social-links.html',
  styleUrls: ['./social-links.css'],
})
export class SocialLinksComponent {
  readonly svgFilterCssClass = 'filter-black';
  readonly socialLinkCssClass = 'social-link';
}
