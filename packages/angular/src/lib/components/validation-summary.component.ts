import { Component, Input } from '@angular/core';
import { getValidationMeta, ValidationResult } from '@validation-rules/core';

@Component({
  selector: 'policy-validation-summary',
  standalone: false,
  template: `
    @if (visible) {
      <div class="policy-validation-summary" role="alert" [attr.aria-live]="'polite'">
        <strong class="policy-validation-summary-title">{{ title }}</strong>
        <ul class="policy-validation-summary-list">
          @for (err of errors; track $index) {
            <li>{{ err.error.message }}</li>
          }
        </ul>
      </div>
    }
  `
})
export class ValidationSummaryComponent {
  @Input() model: any;
  @Input() title = 'Please correct the following errors:';
  @Input() showWhen = true;

  get errors(): ValidationResult[] {
    return this.model?.validationResults ?? [];
  }

  get visible(): boolean {
    return this.showWhen
      && !!getValidationMeta(this.model).showAllErrors
      && this.errors.length > 0;
  }
}
