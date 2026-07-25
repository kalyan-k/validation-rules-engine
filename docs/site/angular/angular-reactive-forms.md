# Angular Reactive Forms

## Coordination pattern

Reactive Forms can own interaction state while Validation Rules owns policy execution.

```ts
form = this.fb.group({
  displayName: [''],
  workEmail: ['']
});
```

Synchronize form values into the policy model, run validation, then map policy errors back to controls.

```ts
validate(): void {
  const model = this.form.getRawValue();
  this.validation.validateAll(model, 'Account').subscribe((snapshot) => {
    this.clearPolicyErrors(this.form);
    for (const error of snapshot.errors) {
      this.form.get(error.propertyName)?.setErrors({ policyValidation: error.error.message });
    }
  });
}
```

## Live showcase

The unified Angular showcase shows Reactive Forms with the same Overview, Simple Form, Complex Form, and Performance Form structure used by every Angular state strategy.

[Open Reactive Forms state showcase](http://127.0.0.1:4202/state/reactive-forms)

## Using @validation-rules/angular

Reactive Forms pair well with `@validation-rules/angular` when the `FormGroup` owns user interaction state and a plain policy model owns validation state.

### Step 1 — Install Package

Install the Angular adapter and Reactive Forms dependencies.

```bash
npm install @validation-rules/angular @validation-rules/core
npm install @angular/forms
```

Keep Angular, RxJS, and the adapter aligned with your application’s Angular major version.

```json
{
  "dependencies": {
    "@angular/forms": "^20.0.0",
    "rxjs": "^7.8.0",
    "@validation-rules/angular": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Import `ReactiveFormsModule` and `ValidationModule`. Display providers are optional but keep summaries/messages styled consistently.

```ts
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ValidationModule, provideBootstrapValidationDisplay } from '@validation-rules/angular';

@NgModule({
  imports: [ReactiveFormsModule, ValidationModule],
  providers: [...provideBootstrapValidationDisplay()]
})
export class AccountModule {}
```

### Step 3 — Create Validation Policy

Use policy paths that match the plain model you derive from `form.getRawValue()`.

```ts
import { ValidationModel, ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules/angular';

export interface AccountModel extends ValidationModel {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  newsletter: boolean;
}

export class AccountPolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor('firstName').isRequired('First name is required'),
      v.validateFor('lastName').isRequired('Last name is required'),
      v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
      v.validateFor('phone').isPhone('Enter a valid US phone number'),
      v.validateFor('country').isRequired('Country is required'),
      v.validateFor('newsletter').isChecked('Newsletter consent is required')
    ];
  }
}
```

### Step 4 — Register Policy

Register the policy and form group once per route/component lifecycle.

```ts
ngOnInit(): void {
  this.validation.replacePolicy('Account', new AccountPolicy());
  this.validation.registerFormGroupPolicy('accountGroup', 'Account');
  this.validation.formGroup['accountGroup'] = ['firstName', 'lastName', 'email', 'phone', 'country', 'newsletter'];
}

ngOnDestroy(): void {
  this.validation.unregisterFormGroupPolicy('accountGroup');
  this.validation.unregisterPolicy('Account');
}
```

### Step 5 — Connect State Management

Let Reactive Forms own control state, then copy the raw value into a policy model before validation. Keep one method that performs the conversion.

```ts
readonly form = this.fb.nonNullable.group({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  newsletter: false
});

modelFromForm(): AccountModel {
  return { ...this.form.getRawValue() };
}
```

Map policy errors back to Angular controls when you want `FormControl` error state to reflect policy validation.

```ts
private applyPolicyErrors(model: AccountModel): void {
  Object.values(this.form.controls).forEach((control) => control.setErrors(null));
  for (const result of model.validationResults ?? []) {
    this.form.get(result.propertyName)?.setErrors({ policyValidation: result.error.message });
  }
}
```

### Step 6 — Bind Controls

Use normal `formControlName` binding and attach Validation Rules directives for messages and group state.

```html
<form [formGroup]="form" (ngSubmit)="submit()" novalidate>
  <input formControlName="email" policyValidator
    [validateModel]="'email'" [actualModel]="model" [withPolicy]="'Account'" groupName="accountGroup" />
  <policy-validation-message [model]="model" propertyName="email"></policy-validation-message>
  <policy-validation-summary [model]="model"></policy-validation-summary>
</form>
```

### Step 7 — Validate

Rebuild the model from the form before every validation pass, then update both Validation Rules metadata and Reactive Forms errors.

```ts
submit(): void {
  this.model = this.modelFromForm();
  this.validation.validateAll(this.model, 'Account', {
    showAllErrors: true,
    evaluateGroups: true,
    markEvaluated: true
  }).subscribe(() => {
    this.applyPolicyErrors(this.model);
    if (!this.model.validationResults?.length) {
      this.save(this.model);
    }
  });
}

validateEmail(): void {
  this.model = this.modelFromForm();
  this.validation.evaluateFormGroup(this.model, 'accountGroup', 'Account');
}
```

### Step 8 — Reset

Reset the form, replace the model, and clear policy metadata together.

```ts
reset(): void {
  this.form.reset({ firstName: '', lastName: '', email: '', phone: '', country: '', newsletter: false });
  this.model = this.modelFromForm();
  this.validation.clearValidationState(this.model, ['Account']);
}
```

### Step 9 — Best Practices

Keep a single field list for group registration and error mapping.

```ts
const accountFields = ['firstName', 'lastName', 'email', 'phone', 'country', 'newsletter'] as const;
type AccountField = typeof accountFields[number];
```

Do not store `FormControl` objects in global state. Store plain values, validate a plain object, and use `policyValidation` control errors only as a UI bridge.

### Step 10 — Complete Working Example

```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ValidationProviderService } from '@validation-rules/angular';
import { AccountModel, AccountPolicy } from './account.policy';

@Component({
  selector: 'app-account-form',
  templateUrl: './account-form.component.html'
})
export class AccountFormComponent implements OnInit, OnDestroy {
  readonly form = this.fb.nonNullable.group({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    newsletter: false
  });
  model: AccountModel = this.modelFromForm();
  message = '';

  constructor(private readonly fb: FormBuilder, private readonly validation: ValidationProviderService) {}

  ngOnInit(): void {
    this.validation.replacePolicy('Account', new AccountPolicy());
    this.validation.registerFormGroupPolicy('accountGroup', 'Account');
    this.validation.formGroup['accountGroup'] = ['firstName', 'lastName', 'email', 'phone', 'country', 'newsletter'];
  }

  submit(): void {
    this.model = this.modelFromForm();
    this.validation.validateAll(this.model, 'Account', { showAllErrors: true, evaluateGroups: true }).subscribe(() => {
      this.applyPolicyErrors();
      this.message = this.model.validationResults?.length ? 'Fix the highlighted fields.' : 'Account saved.';
    });
  }

  reset(): void {
    this.form.reset();
    this.model = this.modelFromForm();
    this.message = '';
    this.validation.clearValidationState(this.model, ['Account']);
  }

  ngOnDestroy(): void {
    this.validation.unregisterFormGroupPolicy('accountGroup');
    this.validation.unregisterPolicy('Account');
  }

  private modelFromForm(): AccountModel {
    return { ...this.form.getRawValue() };
  }

  private applyPolicyErrors(): void {
    Object.values(this.form.controls).forEach((control) => control.setErrors(null));
    for (const result of this.model.validationResults ?? []) {
      this.form.get(result.propertyName)?.setErrors({ policyValidation: result.error.message });
    }
  }
}
```

```html
<form [formGroup]="form" (ngSubmit)="submit()" novalidate>
  <label>Email <input type="email" formControlName="email" /></label>
  <policy-validation-message [model]="model" propertyName="email"></policy-validation-message>
  <policy-validation-group-status [model]="model" groupName="accountGroup"></policy-validation-group-status>
  <policy-validation-summary [model]="model"></policy-validation-summary>
  <p role="status">{{ message }}</p>
  <button type="submit">Save</button>
  <button type="button" (click)="reset()">Reset</button>
</form>
```
