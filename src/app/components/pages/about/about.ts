import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-about',
  imports: [MatCardModule, MatIconModule, MatExpansionModule],
  templateUrl: './about.html',
  styleUrls: ['./about.css']
})
export class AboutComponent {}
