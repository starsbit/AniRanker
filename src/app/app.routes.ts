import { Routes } from '@angular/router';
import { HomeComponent } from './components/pages/home/home';
import { AboutComponent } from './components/pages/about/about';
import { ContactComponent } from './components/pages/contact/contact';
import { ImportComponent } from './components/pages/import/import';
import { RankerComponent } from './components/pages/ranker/ranker';
import { ResultsComponent } from './components/pages/results/results';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'import', component: ImportComponent },
  { path: 'rank', component: RankerComponent },
  { path: 'results', component: ResultsComponent },
  { path: '**', redirectTo: '' }
];
