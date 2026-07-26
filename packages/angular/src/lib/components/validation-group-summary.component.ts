import { Component, Input } from '@angular/core';
import { FormGroupStatus } from '@validation-rules/core';

@Component({
  selector: 'policy-validation-group-summary',
  standalone: false,
  template: `
    @if (status; as currentStatus) {
      @if (currentStatus.isEvaluated) {
        @let errors = currentStatus.errors ?? [];
        @if (errors.length) {
          <div
            class="policy-validation-group-summary"
            role="alert"
          >
            <strong class="policy-validation-group-summary-title">{{ title }}</strong>
            <ul class="policy-validation-group-summary-list">
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
export class ValidationGroupSummaryComponent {
  @Input() model: any;
  @Input() groupName!: string;
  @Input() title = 'Errors in this section:';

  get status(): FormGroupStatus | undefined {
    return this.model?.[this.groupName];
  }
}
