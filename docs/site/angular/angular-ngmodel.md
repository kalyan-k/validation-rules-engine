# Angular ngModel Integration

## Template-driven forms

The Angular adapter was designed around template-driven forms and works naturally with `[(ngModel)]`.

```html
<form #form="ngForm" (ngSubmit)="submit()">
  <input
    name="firstName"
    [(ngModel)]="model.firstName"
    policyValidator
    [validateModel]="'form.firstName'"
    [actualModel]="model"
    [withPolicy]="'Registration'"
    groupName="registration"
  />
  <button type="submit">Create account</button>
</form>
```

## Submit lifecycle

```ts
submit(): void {
  this.validation.validateAll(this.model, 'Registration').subscribe((snapshot) => {
    this.submitted = true;
    if (snapshot.isValid) this.save();
  });
}
```

## Best practices

Keep the model object stable during validation, use explicit `name` attributes, and align `validateModel` paths with policy paths.

## Using @validation-rules-engine/angular

Template Driven Forms are the lowest-friction way to consume `@validation-rules-engine/angular`: Angular owns `[(ngModel)]` binding and Validation Rules Engine owns policy execution, field messages, group status, and submit validation.

### Step 1 — Install Package

Install the Angular adapter next to Angular Forms. The adapter exports Core policy types, so application code can import policies from one package.

```bash
npm install @validation-rules-engine/angular @validation-rules-engine/core
npm install @angular/forms
```

Use the adapter version that matches the Validation Rules Engine workspace version used by your application. Angular itself remains a peer dependency of your app.

```json
{
  "dependencies": {
    "@angular/forms": "^20.0.0",
    "@validation-rules-engine/angular": "^1.0.0",
    "@validation-rules-engine/core": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Import `FormsModule` for `ngModel`, `ValidationModule` for directives/components, and an optional display provider for your CSS framework.

```ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ValidationModule, provideBootstrapValidationDisplay } from '@validation-rules-engine/angular';
import { ProfileComponent } from './profile.component';

@NgModule({
  declarations: [ProfileComponent],
  imports: [BrowserModule, FormsModule, ValidationModule],
  providers: [...provideBootstrapValidationDisplay()],
  bootstrap: [ProfileComponent]
})
export class AppModule {}
```

### Step 3 — Create Validation Policy

Create a plain model and a Core-compatible policy. The paths used by `validateFor()` must match the `validateModel` paths in the template.

```ts
import { ValidationModel, ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules-engine/angular';

export interface ProfileModel extends ValidationModel {
  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    acceptedTerms: boolean;
  };
}

export class ProfilePolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor('form.firstName').isRequired('First name is required'),
      v.validateFor('form.lastName').isRequired('Last name is required'),
      v.validateFor('form.email').isRequired('Email is required').isEmail('Enter a valid email'),
      v.validateFor('form.phone').isPhone('Enter a valid US phone number'),
      v.validateFor('form.country').isRequired('Country is required'),
      v.validateFor('form.acceptedTerms').isChecked('Terms must be accepted')
    ];
  }
}
```

### Step 4 — Register Policy

Register policies when the component is created and unregister them when the route is destroyed. This keeps generated or route-scoped policies from leaking into other screens.

```ts
import { OnDestroy, OnInit } from '@angular/core';
import { ValidationProviderService } from '@validation-rules-engine/angular';
import { ProfilePolicy } from './profile.policy';

export class ProfileComponent implements OnInit, OnDestroy {
  private readonly policyName = 'Profile';
  private readonly groupName = 'profileForm';

  constructor(private readonly validation: ValidationProviderService) {}

  ngOnInit(): void {
    this.validation.replacePolicy(this.policyName, new ProfilePolicy());
    this.validation.registerFormGroupPolicy(this.groupName, this.policyName);
    this.validation.formGroup[this.groupName] = [
      'form.firstName',
      'form.lastName',
      'form.email',
      'form.phone',
      'form.country',
      'form.acceptedTerms'
    ];
  }

  ngOnDestroy(): void {
    this.validation.unregisterFormGroupPolicy(this.groupName);
    this.validation.unregisterPolicy(this.policyName);
  }
}
```

### Step 5 — Connect State Management

For Template Driven Forms, the state-management mechanism is the component model itself. Keep the model object as the single source of truth and let `[(ngModel)]` mutate it.

```ts
const emptyProfile = (): ProfileModel => ({
  form: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    acceptedTerms: false
  }
});

export class ProfileComponent {
  model = emptyProfile();

  updateCountry(country: string): void {
    this.model.form.country = country;
    this.validation.evaluateFormGroup(this.model, 'profileForm', 'Profile');
    this.validation.notifyValidationRefresh(this.model);
  }
}
```

### Step 6 — Bind Controls

Attach `policyValidator` to each control and point it at the same model object used by the policy.

```html
<input name="firstName" [(ngModel)]="model.form.firstName" policyValidator
  [validateModel]="'form.firstName'" [actualModel]="model" [withPolicy]="'Profile'" groupName="profileForm" />
<policy-validation-message [model]="model" propertyName="form.firstName"></policy-validation-message>

<select name="country" [(ngModel)]="model.form.country" policyValidator
  [validateModel]="'form.country'" [actualModel]="model" [withPolicy]="'Profile'" groupName="profileForm">
  <option value="">Select country</option>
  <option value="US">United States</option>
</select>
<policy-validation-summary [model]="model"></policy-validation-summary>
```

### Step 7 — Validate

Use field validation through the directive, group validation for section badges, and `validateAll()` for submit.

```ts
submit(): void {
  this.validation.validateAll(this.model, 'Profile', {
    showAllErrors: true,
    evaluateGroups: true,
    markEvaluated: true
  }).subscribe(() => {
    if (!this.model.validationResults?.length) {
      this.saveProfile(this.model);
    }
  });
}

validateProfileGroup(): void {
  this.validation.evaluateFormGroup(this.model, 'profileForm', 'Profile');
}
```

### Step 8 — Reset

Reset both the form model and Validation Rules Engine metadata. If the component is going away, unregister the policy and group.

```ts
reset(): void {
  this.model = emptyProfile();
  this.validation.clearValidationState(this.model, ['Profile']);
}

ngOnDestroy(): void {
  this.validation.unregisterFormGroupPolicy('profileForm');
  this.validation.unregisterPolicy('Profile');
}
```

### Step 9 — Best Practices

Centralize paths so policy rules, form groups, and templates do not drift.

```ts
export const profilePaths = [
  'form.firstName',
  'form.lastName',
  'form.email',
  'form.phone',
  'form.country',
  'form.acceptedTerms'
] as const;
```

Prefer one route-scoped policy name per feature form, stable model objects while validation is running, explicit `name` attributes, and `replacePolicy()` when a dynamic form can change shape.

### Step 10 — Complete Working Example

```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ValidationProviderService } from '@validation-rules-engine/angular';
import { ProfileModel, ProfilePolicy, profilePaths } from './profile.policy';

function emptyProfile(): ProfileModel {
  return {
    form: { firstName: '', lastName: '', email: '', phone: '', country: '', acceptedTerms: false }
  };
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit, OnDestroy {
  model = emptyProfile();
  message = '';

  constructor(private readonly validation: ValidationProviderService) {}

  ngOnInit(): void {
    this.validation.replacePolicy('Profile', new ProfilePolicy());
    this.validation.registerFormGroupPolicy('profileForm', 'Profile');
    this.validation.formGroup['profileForm'] = [...profilePaths];
  }

  submit(): void {
    this.validation.validateAll(this.model, 'Profile', {
      showAllErrors: true,
      evaluateGroups: true,
      markEvaluated: true
    }).subscribe(() => {
      const errors = this.model.validationResults?.length ?? 0;
      this.message = errors ? `${errors} profile field(s) need attention.` : 'Profile saved.';
    });
  }

  reset(): void {
    this.model = emptyProfile();
    this.message = '';
    this.validation.clearValidationState(this.model, ['Profile']);
  }

  ngOnDestroy(): void {
    this.validation.unregisterFormGroupPolicy('profileForm');
    this.validation.unregisterPolicy('Profile');
  }
}
```

```html
<form #profileForm="ngForm" (ngSubmit)="submit()" novalidate>
  <label>
    First name
    <input name="firstName" [(ngModel)]="model.form.firstName" policyValidator
      [validateModel]="'form.firstName'" [actualModel]="model" [withPolicy]="'Profile'" groupName="profileForm" />
  </label>
  <policy-validation-message [model]="model" propertyName="form.firstName"></policy-validation-message>

  <label>
    Email
    <input type="email" name="email" [(ngModel)]="model.form.email" policyValidator
      [validateModel]="'form.email'" [actualModel]="model" [withPolicy]="'Profile'" groupName="profileForm" />
  </label>
  <policy-validation-message [model]="model" propertyName="form.email"></policy-validation-message>

  <label>
    <input type="checkbox" name="acceptedTerms" [(ngModel)]="model.form.acceptedTerms" policyValidator
      [validateModel]="'form.acceptedTerms'" [actualModel]="model" [withPolicy]="'Profile'" groupName="profileForm" />
    I accept the terms
  </label>

  <policy-validation-group-status [model]="model" groupName="profileForm"></policy-validation-group-status>
  <policy-validation-summary [model]="model"></policy-validation-summary>
  <p role="status">{{ message }}</p>
  <button type="submit">Save</button>
  <button type="button" (click)="reset()">Reset</button>
</form>
```
