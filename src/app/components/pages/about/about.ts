import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  styleUrls: ['./about.css'],
})
export class AboutComponent {
  copyrightYear = new Date().getFullYear();
}
