import { Provider } from '@angular/core';
import {
  provideBootstrapValidationDisplay,
  provideMaterialValidationDisplay,
  provideTailwindValidationDisplay
} from '@validation-rules/angular';
import { ShowcaseFramework } from './showcase-framework.model';

export function provideShowcaseFrameworkDisplay(framework: ShowcaseFramework): Provider[] {
  switch (framework) {
    case 'material':
      return provideMaterialValidationDisplay();
    case 'tailwind':
      return provideTailwindValidationDisplay();
    default:
      return provideBootstrapValidationDisplay();
  }
}
