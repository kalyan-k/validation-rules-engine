import { Component } from '@angular/core';
import { ValidationProviderService } from '@validation-rules/angular';
import { SampleForm } from '../../models/sample-form.model';

@Component({
  selector: 'app-sample-form-tailwind',
  standalone: false,
  templateUrl: './sample-form-tailwind.component.html',
  styleUrls: ['./sample-form-tailwind.component.sass']
})
export class SampleFormTailwindComponent {
  model = new SampleForm();
  submitMessage = '';
  private readonly policyName = 'SampleForm';

  constructor(private validationProvider: ValidationProviderService) {}

  onSubmit(): void {
    this.validationProvider.validateAll(this.model, this.policyName, {
      showAllErrors: true,
      evaluateGroups: true
    }).subscribe(() => {
      const hasErrors = !!this.model.validationResults?.length;
      this.submitMessage = hasErrors
        ? 'Please fix validation errors before submitting.'
        : 'Form submitted successfully!';
    });
  }

  onClear(): void {
    Object.assign(this.model, new SampleForm());
    this.validationProvider.resetFormGroups();
    this.validationProvider.clearValidationState(this.model, [this.policyName]);
    this.validationProvider.notifyValidationRefresh(this.model);
    this.submitMessage = '';
  }
}
