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
  selector: 'policy-validation-group-status',
  standalone: false,
  template: `
    @if (status; as currentStatus) {
      @if (currentStatus.isEvaluated) {
        <span
          class="policy-validation-group-badge badge"
          [class.bg-success]="currentStatus.isValid"
          [class.bg-danger]="currentStatus.isInValid"
          [attr.title]="evaluatedTooltip"
        >
          {{ currentStatus.isValid ? 'Valid' : 'Invalid' }}
          </span>
      } @else {
        <span
          class="policy-validation-group-badge badge bg-secondary"
          [attr.title]="pendingTooltip"
        >
          {{ pendingLabel }}
        </span>
      }
    } @else {
      <span
        class="policy-validation-group-badge badge bg-secondary"
        [attr.title]="pendingTooltip"
      >
        {{ pendingLabel }}
      </span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ValidationGroupStatusComponent implements OnChanges, OnDestroy {
  @Input() model: any;
  @Input() groupName!: string;
  @Input() pendingLabel = 'Not validated';
  @Input() pendingTooltip = 'This section has not been validated yet. Submit the form to evaluate.';
  @Input() evaluatedTooltip = 'Validation status for this form group after the last submit.';

  private refreshSubscription?: Subscription;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private validationProvider: ValidationProviderService
  ) {}

  get status(): FormGroupStatus | undefined {
    return this.model?.[this.groupName];
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
