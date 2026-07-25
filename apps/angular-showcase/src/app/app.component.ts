import { Component } from '@angular/core';
import { platformUrl } from './platform-urls';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent {
  title = 'angular-showcase';
  readonly portalUrl = platformUrl('portal');
  readonly docsUrl = platformUrl('docs');
  readonly angularUrl = platformUrl('angular');
  readonly reactUrl = platformUrl('react');
}
