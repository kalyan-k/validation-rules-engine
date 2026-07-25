# Angular Signals with @validation-rules/angular

Angular Signals are fine-grained reactive primitives for synchronous state reads, updates, and computed values.

## Enterprise use cases

- Modern Angular screens with signal-first local state.
- Shared services exposing fine-grained state slices.
- Forms that benefit from synchronous snapshots and computed validation summaries.

## Why choose it

Choose Signals when local or shared state should be simple, synchronous, and fine-grained. Validation Rules validates the object represented by the signal snapshot and writes result metadata back into that snapshot.

## Integration pattern

The unified Angular showcase keeps the same policies and page layout while the Signals route commits model changes through Angular signal state.

## Showcase pages

- [Overview](http://127.0.0.1:4202/state/signals)
- [Simple Form](http://127.0.0.1:4202/state/signals/simple)
- [Complex Form](http://127.0.0.1:4202/state/signals/complex)
- [Performance Form](http://127.0.0.1:4202/state/signals/performance)

## Using @validation-rules/angular

Signals keep form state synchronous and fine-grained. Use `@validation-rules/angular` to validate the current signal snapshot, then write the decorated model back into the signal.

### Step 1 — Install Package

Install Validation Rules and Angular Forms. Signals are built into modern Angular.

```bash
npm install @validation-rules/angular @validation-rules/core @angular/forms
```

Use Angular versions that include stable Signals support.

```json
{
  "dependencies": {
    "@angular/core": "^20.0.0",
    "@angular/forms": "^20.0.0",
    "@validation-rules/angular": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Import Validation Rules and forms as usual.

```ts
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ValidationModule, provideBootstrapValidationDisplay } from '@validation-rules/angular';

@NgModule({
  imports: [FormsModule, ValidationModule],
  providers: [...provideBootstrapValidationDisplay()]
})
export class ProfileModule {}
```

### Step 3 — Create Validation Policy

Signals store plain values, so policy paths point directly at the signal model properties.

```ts
import { ValidationModel, ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules/angular';

export interface SignalProfile extends ValidationModel {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  acceptedTerms: boolean;
}

export class SignalProfilePolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor('firstName').isRequired('First name is required'),
      v.validateFor('lastName').isRequired('Last name is required'),
      v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
      v.validateFor('country').isRequired('Country is required'),
      v.validateFor('acceptedTerms').isChecked('Terms must be accepted')
    ];
  }
}
```

### Step 4 — Register Policy

Register once and pair the lifecycle with the component that owns the signal.

```ts
ngOnInit(): void {
  this.validation.replacePolicy('SignalProfile', new SignalProfilePolicy());
  this.validation.registerFormGroupPolicy('signalProfileGroup', 'SignalProfile');
  this.validation.formGroup['signalProfileGroup'] = ['firstName', 'lastName', 'email', 'country', 'acceptedTerms'];
}

ngOnDestroy(): void {
  this.validation.unregisterFormGroupPolicy('signalProfileGroup');
  this.validation.unregisterPolicy('SignalProfile');
}
```

### Step 5 — Connect State Management

Use a writable signal for the draft and computed values for UI summaries.

```ts
import { computed, signal } from '@angular/core';

const emptySignalProfile = (): SignalProfile => ({
  firstName: '',
  lastName: '',
  email: '',
  country: '',
  acceptedTerms: false
});

readonly draft = signal<SignalProfile>(emptySignalProfile());
readonly errorCount = computed(() => this.draft().validationResults?.length ?? 0);

change(path: keyof SignalProfile, value: unknown): void {
  this.draft.update((current) => ({ ...current, [path]: value }));
}
```

### Step 6 — Bind Controls

Read the signal in the template and write changes through the component method.

```html
<form (ngSubmit)="submit()" novalidate>
  <input name="email" type="email" [ngModel]="draft().email" (ngModelChange)="change('email', $event)" policyValidator
    [validateModel]="'email'" [actualModel]="draft()" [withPolicy]="'SignalProfile'" groupName="signalProfileGroup" />
  <policy-validation-message [model]="draft()" propertyName="email"></policy-validation-message>
  <policy-validation-summary [model]="draft()"></policy-validation-summary>
</form>
```

### Step 7 — Validate

Validate a local variable from the signal, then set the decorated object back into the signal.

```ts
submit(): void {
  const current = structuredClone(this.draft());
  this.validation.validateAll(current, 'SignalProfile', { showAllErrors: true, evaluateGroups: true }).subscribe(() => {
    this.draft.set(current);
  });
}

validateGroup(): void {
  const current = structuredClone(this.draft());
  this.validation.evaluateFormGroup(current, 'signalProfileGroup', 'SignalProfile');
  this.draft.set(current);
}
```

### Step 8 — Reset

Clear current metadata and replace the signal with a fresh model.

```ts
reset(): void {
  const current = this.draft();
  this.validation.clearValidationState(current, ['SignalProfile']);
  this.draft.set(emptySignalProfile());
}
```

### Step 9 — Best Practices

Keep signal updates immutable so Angular can notify dependents predictably.

```ts
this.draft.update((current) => ({
  ...current,
  email: current.email.trim().toLowerCase()
}));
```

Use signals for local or shared synchronous state, computed values for summaries, and services only when the same draft must survive route component replacement.

### Step 10 — Complete Working Example

```ts
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { ValidationProviderService } from '@validation-rules/angular';
import { SignalProfile, SignalProfilePolicy } from './profile.policy';

const emptySignalProfile = (): SignalProfile => ({ firstName: '', lastName: '', email: '', country: '', acceptedTerms: false });

@Component({
  selector: 'app-signal-profile',
  templateUrl: './signal-profile.component.html'
})
export class SignalProfileComponent implements OnInit, OnDestroy {
  readonly draft = signal<SignalProfile>(emptySignalProfile());
  readonly errorCount = computed(() => this.draft().validationResults?.length ?? 0);

  constructor(private readonly validation: ValidationProviderService) {}

  ngOnInit(): void {
    this.validation.replacePolicy('SignalProfile', new SignalProfilePolicy());
    this.validation.registerFormGroupPolicy('signalProfileGroup', 'SignalProfile');
    this.validation.formGroup['signalProfileGroup'] = ['firstName', 'lastName', 'email', 'country', 'acceptedTerms'];
  }

  change(path: keyof SignalProfile, value: unknown): void {
    this.draft.update((current) => ({ ...current, [path]: value }));
  }

  submit(): void {
    const current = structuredClone(this.draft());
    this.validation.validateAll(current, 'SignalProfile', { showAllErrors: true, evaluateGroups: true }).subscribe(() => {
      this.draft.set(current);
    });
  }

  reset(): void {
    this.validation.clearValidationState(this.draft(), ['SignalProfile']);
    this.draft.set(emptySignalProfile());
  }

  ngOnDestroy(): void {
    this.validation.unregisterFormGroupPolicy('signalProfileGroup');
    this.validation.unregisterPolicy('SignalProfile');
  }
}
```

```html
<form (ngSubmit)="submit()" novalidate>
  <label>Email <input type="email" name="email" [ngModel]="draft().email" (ngModelChange)="change('email', $event)" policyValidator
    [validateModel]="'email'" [actualModel]="draft()" [withPolicy]="'SignalProfile'" groupName="signalProfileGroup" /></label>
  <label><input type="checkbox" name="acceptedTerms" [ngModel]="draft().acceptedTerms" (ngModelChange)="change('acceptedTerms', $event)" policyValidator
    [validateModel]="'acceptedTerms'" [actualModel]="draft()" [withPolicy]="'SignalProfile'" groupName="signalProfileGroup" /> Accept terms</label>
  <policy-validation-group-status [model]="draft()" groupName="signalProfileGroup"></policy-validation-group-status>
  <policy-validation-summary [model]="draft()"></policy-validation-summary>
  <p role="status">{{ errorCount() }} validation issue(s)</p>
  <button type="submit">Save</button>
  <button type="button" (click)="reset()">Reset</button>
</form>
```
