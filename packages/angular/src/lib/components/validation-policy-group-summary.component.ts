import { Component, Input } from '@angular/core';
import { FormGroupStatus } from '@validation-rules/core';

@Component({
  selector: 'policy-validation-policy-group-summary',
  standalone: false,
  template: `
    @if (status; as currentStatus) {
      @if (currentStatus.isEvaluated) {
        @let errors = currentStatus.errors ?? [];
        @if (errors.length) {
          <div
            class="policy-validation-policy-group-summary"
            role="alert"
          >
            <strong class="policy-validation-summary-title">{{ title }}</strong>
            <ul class="policy-validation-summary-list">
              @for (err of errors; track $index) {
                <li>{{ err.error.message }}</li>
              }
            </ul>
          </div>
        }
      }
    }
  `
})
export class ValidationPolicyGroupSummaryComponent {
  @Input() model: any;
  @Input() policyGroupName!: string;
  @Input() title = 'Please correct the following errors across all sections:';

  get status(): FormGroupStatus | undefined {
    return this.model?.[this.policyGroupName];
  }
}
