import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { slideInAnimation } from './animations/route-animations';
import { BackgroundComponent } from './components/background/background';
import { NavigationComponent } from './components/navigation/navigation';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  imports: [
    RouterOutlet,
    NavigationComponent,
    BackgroundComponent,
  ],
  animations: [slideInAnimation],
})
export class App {
  title = 'mal-ranker';
}
