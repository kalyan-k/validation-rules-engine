import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges
} from '@angular/core';
import { Subscription } from 'rxjs';
import { FormGroupStatus } from '@validation-rules/core';
import { ValidationProviderService } from '../services/validation-provider.service';

@Component({
  selector: 'policy-validation-policy-group-status',
  standalone: false,
  template: `
    <div class="policy-validation-policy-group-status d-flex align-items-center gap-2">
      <span class="fw-semibold">{{ label }}</span>
      @if (status; as currentStatus) {
        @if (currentStatus.isEvaluated) {
          <span
            class="badge"
            [class.bg-success]="currentStatus.isValid"
            [class.bg-danger]="currentStatus.isInValid"
            [attr.title]="evaluatedTooltip"
          >
            {{ currentStatus.isValid ? 'All sections valid' : 'Has errors' }}
          </span>
        } @else {
          <span class="badge bg-secondary" [attr.title]="pendingTooltip">{{ pendingLabel }}</span>
        }
      } @else {
        <span class="badge bg-secondary" [attr.title]="pendingTooltip">{{ pendingLabel }}</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ValidationPolicyGroupStatusComponent implements OnChanges, OnDestroy {
  @Input() model: any;
  @Input() policyGroupName!: string;
  @Input() label = 'Page validation';
  @Input() pendingLabel = 'Not validated';
  @Input() pendingTooltip = 'Submit the form to validate all policy groups on this page.';
  @Input() evaluatedTooltip = 'Combined validation status across all registered policies in this group.';

  private refreshSubscription?: Subscription;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private validationProvider: ValidationProviderService
  ) {}

  get status(): FormGroupStatus | undefined {
    return this.model?.[this.policyGroupName];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['model']) {
      this.bindValidationRefresh();
    }
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  private bindValidationRefresh(): void {
    this.refreshSubscription?.unsubscribe();

    if (!this.model) {
      return;
    }

    this.refreshSubscription = this.validationProvider.onValidationRefresh(this.model)
      .subscribe(() => this.changeDetectorRef.markForCheck());
  }
}
