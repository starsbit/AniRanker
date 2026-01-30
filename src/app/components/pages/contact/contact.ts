import { Component } from '@angular/core';
import { SocialLinksComponent } from '../../social-links/social-links';

@Component({
  selector: 'app-contact',
  imports: [SocialLinksComponent],
  templateUrl: './contact.html',
  styleUrls: ['./contact.css'],
})
export class ContactComponent {
  copyrightYear = new Date().getFullYear();
}
