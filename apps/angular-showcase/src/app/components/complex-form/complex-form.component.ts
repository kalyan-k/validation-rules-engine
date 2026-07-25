import { Component } from '@angular/core';
import { ValidationProviderService } from '@validation-rules/angular';
import { AddressInfo, BillingInfo, ComplexFormModel, PersonalInfo } from '../../models/complex-form.model';

@Component({
  selector: 'app-complex-form',
  standalone: false,
  templateUrl: './complex-form.component.html',
  styleUrls: ['./complex-form.component.sass']
})
export class ComplexFormComponent {
  model = new ComplexFormModel();
  submitMessage = '';

  readonly policies = ['PersonalInfo', 'ShippingAddress', 'BillingAddress'];
  readonly policyGroupName = 'checkout';

  constructor(private validationProvider: ValidationProviderService) {}

  onSameAsShippingChange(): void {
    this.validationProvider.getPolicy('BillingAddress').updateConditionalRequiredFields(this.model);
    this.validationProvider.evaluateFormGroup(this.model, 'billingInfo', 'BillingAddress');
    this.validationProvider.notifyValidationRefresh(this.model);
  }

  onSubmit(): void {
    this.validationProvider.evaluatePolicies(this.model, this.policies, this.policyGroupName).subscribe(() => {
      const hasErrors = !!this.model.validationResults?.length;
      this.submitMessage = hasErrors
        ? 'Please fix validation errors in all sections before submitting.'
        : 'All forms submitted successfully!';
    });
  }

  onClear(): void {
    Object.assign(this.model.personal, new PersonalInfo());
    Object.assign(this.model.shipping, new AddressInfo());
    Object.assign(this.model.billing, new BillingInfo());

    this.validationProvider.resetFormGroups();
    this.validationProvider.clearValidationState(this.model, this.policies);
    this.submitMessage = '';
  }
}
