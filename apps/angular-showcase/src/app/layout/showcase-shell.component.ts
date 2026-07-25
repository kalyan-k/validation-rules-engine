import { Component } from '@angular/core';
import { SHOWCASE_FRAMEWORKS } from '../showcase/showcase-framework.model';
import { platformUrl } from '../platform-urls';
import { ANGULAR_STATE_PAGES, ANGULAR_STATE_STRATEGIES } from '../state-management/angular-state-showcase.model';

@Component({
  selector: 'app-showcase-shell',
  standalone: false,
  templateUrl: './showcase-shell.component.html',
  styleUrls: ['./showcase-shell.component.sass']
})
export class ShowcaseShellComponent {
  readonly frameworks = SHOWCASE_FRAMEWORKS;
  readonly stateStrategies = ANGULAR_STATE_STRATEGIES;
  readonly statePages = ANGULAR_STATE_PAGES;
  readonly docsUrl = platformUrl('docs', '/docs/angular');
  isFrameworksExpanded = true;
  currentYear = new Date().getFullYear();
}
