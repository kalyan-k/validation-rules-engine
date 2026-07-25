import { Component } from '@angular/core';
import { SHOWCASE_FRAMEWORKS, SHOWCASE_TABS } from '../../showcase/showcase-framework.model';
import { platformUrl } from '../../platform-urls';
import { ANGULAR_STATE_STRATEGIES } from '../../state-management/angular-state-showcase.model';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.sass']
})
export class HomeComponent {
  readonly frameworks = SHOWCASE_FRAMEWORKS;
  readonly showcases = SHOWCASE_TABS;
  readonly stateStrategies = ANGULAR_STATE_STRATEGIES;
  readonly docsUrl = platformUrl('docs', '/docs/angular');
  readonly portalUrl = platformUrl('portal');

  readonly quickStart = [
  {
    step: 1,
    title: 'Register policies',
    detail: 'Map validation policies and form groups in an APP_INITIALIZER (see validation.providers.ts).'
  },
  {
    step: 2,
    title: 'Import ValidationModule',
    detail: 'Add ValidationModule.forRoot() and choose a display strategy for your UI framework.'
  },
  {
    step: 3,
    title: 'Annotate controls',
    detail: 'Add policyValidator with validateModel, actualModel, withPolicy, and optional groupName.'
  },
  {
    step: 4,
    title: 'Evaluate on submit',
    detail: 'Call validationProvider.validateAll() or evaluatePolicies() to update badges and summaries.'
  }
];
}
