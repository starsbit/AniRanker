import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { slideInAnimation } from './animations/route-animations';
import { NavigationComponent } from './components/navigation/navigation.component';
import { MetaService } from './services/meta.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavigationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  animations: [slideInAnimation],
})
export class App {
  private readonly metaService = inject(MetaService);
}
