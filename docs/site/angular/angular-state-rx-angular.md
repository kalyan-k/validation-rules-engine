# RxAngular State with @validation-rules-engine/angular

RxAngular State provides component-scoped reactive state with RxJS-friendly updates and lifecycle cleanup.

## Enterprise use cases

- Performance-sensitive Angular screens with local state.
- Components that need observable state slices without a global store.
- Teams optimizing rendering and subscription ownership in complex views.

## Why choose it

Choose RxAngular State when form state should be scoped to the component tree. Validation Rules Engine (VRE) evaluates the model, and RxAngular State publishes the validated snapshot as local reactive state.

## Integration pattern

The unified Angular showcase provides RxAngular State at the showcase component boundary and stores the same simple, complex, and performance state shape used by the other strategies.

## Showcase pages

- [Overview](http://127.0.0.1:4202/state/rx-angular-state)
- [Simple Form](http://127.0.0.1:4202/state/rx-angular-state/simple)
- [Complex Form](http://127.0.0.1:4202/state/rx-angular-state/complex)
- [Performance Form](http://127.0.0.1:4202/state/rx-angular-state/performance)

## Using @validation-rules-engine/angular

RxAngular State is ideal for component-scoped form state. The component provides `RxState`, updates local slices, and VRE validates the current snapshot.

### Step 1 — Install Package

Install VRE, Angular Forms, and RxAngular State.

```bash
npm install @validation-rules-engine/angular @validation-rules-engine/core @rx-angular/state @angular/forms
```

RxAngular is an app dependency; `@validation-rules-engine/angular` continues to validate plain objects.

```json
{
  "dependencies": {
    "@angular/forms": "^20.0.0",
    "@rx-angular/state": "^20.0.0",
    "@validation-rules-engine/angular": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Import forms and VRE. Provide `RxState` at the component boundary so each route owns an isolated store.

```ts
import { Component } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { ValidationModule, provideBootstrapValidationDisplay } from '@validation-rules-engine/angular';

@Component({
  selector: 'app-rx-profile',
  templateUrl: './rx-profile.component.html',
  providers: [RxState, ...provideBootstrapValidationDisplay()]
})
export class RxProfileComponent {}
```

### Step 3 — Create Validation Policy

Policies validate the local state shape published by `RxState`.

```ts
import { ValidationModel, ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules-engine/angular';

export interface RxProfileState extends ValidationModel {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  consent: boolean;
}

export class RxProfilePolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor('firstName').isRequired('First name is required'),
      v.validateFor('lastName').isRequired('Last name is required'),
      v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
      v.validateFor('phone').isPhone('Enter a valid US phone number'),
      v.validateFor('consent').isChecked('Consent is required')
    ];
  }
}
```

### Step 4 — Register Policy

Register policies when the component initializes and unregister them during cleanup.

```ts
ngOnInit(): void {
  this.rxState.set(initialRxProfileState);
  this.validation.replacePolicy('RxProfile', new RxProfilePolicy());
  this.validation.registerFormGroupPolicy('rxProfileGroup', 'RxProfile');
  this.validation.formGroup['rxProfileGroup'] = ['firstName', 'lastName', 'email', 'phone', 'consent'];
}

ngOnDestroy(): void {
  this.validation.unregisterFormGroupPolicy('rxProfileGroup');
  this.validation.unregisterPolicy('RxProfile');
}
```

### Step 5 — Connect State Management

Use `RxState.select()` for the view model and `RxState.set()` for deterministic updates.

```ts
const initialRxProfileState: RxProfileState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  consent: false
};

readonly draft$ = this.rxState.select();

change(path: keyof RxProfileState, value: unknown): void {
  this.rxState.set((state) => ({ ...state, [path]: value }));
}

commitValidated(draft: RxProfileState): void {
  this.rxState.set(structuredClone(draft));
}
```

### Step 6 — Bind Controls

Bind the selected snapshot to `policyValidator` and publish changes through `RxState`.

```html
@if (draft$ | async; as draft) {
  <form (ngSubmit)="submit(draft)" novalidate>
    <input name="email" type="email" [ngModel]="draft.email" (ngModelChange)="change('email', $event)" policyValidator
      [validateModel]="'email'" [actualModel]="draft" [withPolicy]="'RxProfile'" groupName="rxProfileGroup" />
    <policy-validation-message [model]="draft" propertyName="email"></policy-validation-message>
    <policy-validation-summary [model]="draft"></policy-validation-summary>
  </form>
}
```

### Step 7 — Validate

Validate the current `RxState` snapshot and write the decorated copy back into the component store.

```ts
submit(draft: RxProfileState): void {
  this.validation.validateAll(draft, 'RxProfile', { showAllErrors: true, evaluateGroups: true }).subscribe(() => {
    this.commitValidated(draft);
  });
}

validateGroup(draft: RxProfileState): void {
  this.validation.evaluateFormGroup(draft, 'rxProfileGroup', 'RxProfile');
  this.commitValidated(draft);
}
```

### Step 8 — Reset

Clear metadata and reset the local component state.

```ts
reset(draft: RxProfileState): void {
  this.validation.clearValidationState(draft, ['RxProfile']);
  this.rxState.set(initialRxProfileState);
}
```

### Step 9 — Best Practices

Keep `RxState` scoped to the screen unless multiple routed components need the same draft.

```ts
readonly errorCount$ = this.rxState.select().pipe(
  map((state) => state.validationResults?.length ?? 0)
);
```

Use observable projections for derived view state, keep policy construction stable, and do not expose mutable model references outside the feature component.

### Step 10 — Complete Working Example

```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { Observable } from 'rxjs';
import { ValidationProviderService } from '@validation-rules-engine/angular';
import { RxProfileState, RxProfilePolicy } from './profile.policy';

const initialRxProfileState: RxProfileState = { firstName: '', lastName: '', email: '', phone: '', consent: false };

@Component({
  selector: 'app-rx-profile',
  templateUrl: './rx-profile.component.html',
  providers: [RxState]
})
export class RxProfileComponent implements OnInit, OnDestroy {
  readonly draft$: Observable<RxProfileState> = this.rxState.select();

  constructor(private readonly rxState: RxState<RxProfileState>, private readonly validation: ValidationProviderService) {}

  ngOnInit(): void {
    this.rxState.set(initialRxProfileState);
    this.validation.replacePolicy('RxProfile', new RxProfilePolicy());
    this.validation.registerFormGroupPolicy('rxProfileGroup', 'RxProfile');
    this.validation.formGroup['rxProfileGroup'] = ['firstName', 'lastName', 'email', 'phone', 'consent'];
  }

  change(path: keyof RxProfileState, value: unknown): void {
    this.rxState.set((state) => ({ ...state, [path]: value }));
  }

  submit(draft: RxProfileState): void {
    this.validation.validateAll(draft, 'RxProfile', { showAllErrors: true, evaluateGroups: true }).subscribe(() => {
      this.rxState.set(structuredClone(draft));
    });
  }

  reset(draft: RxProfileState): void {
    this.validation.clearValidationState(draft, ['RxProfile']);
    this.rxState.set(initialRxProfileState);
  }

  ngOnDestroy(): void {
    this.validation.unregisterFormGroupPolicy('rxProfileGroup');
    this.validation.unregisterPolicy('RxProfile');
  }
}
```

```html
@if (draft$ | async; as draft) {
  <form (ngSubmit)="submit(draft)" novalidate>
    <label>Email <input type="email" name="email" [ngModel]="draft.email" (ngModelChange)="change('email', $event)" policyValidator
      [validateModel]="'email'" [actualModel]="draft" [withPolicy]="'RxProfile'" groupName="rxProfileGroup" /></label>
    <label><input type="checkbox" name="consent" [ngModel]="draft.consent" (ngModelChange)="change('consent', $event)" policyValidator
      [validateModel]="'consent'" [actualModel]="draft" [withPolicy]="'RxProfile'" groupName="rxProfileGroup" /> Consent received</label>
    <policy-validation-group-status [model]="draft" groupName="rxProfileGroup"></policy-validation-group-status>
    <policy-validation-summary [model]="draft"></policy-validation-summary>
    <button type="submit">Save</button>
    <button type="button" (click)="reset(draft)">Reset</button>
  </form>
}
```
