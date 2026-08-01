# Elf with @validation-rules-engine/angular

Elf is a small reactive store toolkit that uses composable stores and immutable update reducers.

## Enterprise use cases

- Feature-local stores that should stay lightweight.
- Angular screens that already compose RxJS streams.
- Teams that want predictable immutable updates without a large framework surface.

## Why choose it

Choose Elf when you want store discipline with minimal ceremony. Validation Rules Engine policies remain framework-neutral, while Elf commits the validated snapshot through store reducers.

## Integration pattern

The unified Angular showcase uses an Elf store for state snapshots and the same `@validation-rules-engine/angular` policy registration, validation groups, summaries, and performance generator as every other implementation.

## Showcase pages

- [Overview](http://127.0.0.1:4202/state/elf)
- [Simple Form](http://127.0.0.1:4202/state/elf/simple)
- [Complex Form](http://127.0.0.1:4202/state/elf/complex)
- [Performance Form](http://127.0.0.1:4202/state/elf/performance)

## Using @validation-rules-engine/angular

Elf works best with Validation Rules Engine when the store owns immutable draft snapshots and the Angular adapter decorates those snapshots with validation metadata before they are committed.

### Step 1 — Install Package

Install Validation Rules Engine, Angular Forms, and Elf.

```bash
npm install @validation-rules-engine/angular @validation-rules-engine/core @ngneat/elf @angular/forms
```

Elf is an application-level state dependency; the Angular adapter remains state-library agnostic.

```json
{
  "dependencies": {
    "@angular/forms": "^20.0.0",
    "@ngneat/elf": "^2.5.0",
    "@validation-rules-engine/angular": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Import the Angular validation module and provide the feature store service.

```ts
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ValidationModule, provideBootstrapValidationDisplay } from '@validation-rules-engine/angular';
import { ProfileElfStore } from './state/profile-elf.store';

@NgModule({
  imports: [FormsModule, ValidationModule],
  providers: [ProfileElfStore, ...provideBootstrapValidationDisplay()]
})
export class ProfileFeatureModule {}
```

### Step 3 — Create Validation Policy

Define the form state as a plain object and validate the same paths that the Elf store writes.

```ts
import { ValidationModel, ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules-engine/angular';

export interface ProfileElfState extends ValidationModel {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  notificationFrequency: string;
}

export class ProfileElfPolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor('firstName').isRequired('First name is required'),
      v.validateFor('lastName').isRequired('Last name is required'),
      v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
      v.validateFor('country').isRequired('Country is required'),
      v.validateFor('notificationFrequency').isRequired('Notification frequency is required')
    ];
  }
}
```

### Step 4 — Register Policy

Register policy and group mappings in the feature component.

```ts
ngOnInit(): void {
  this.validation.replacePolicy('ProfileElf', new ProfileElfPolicy());
  this.validation.registerFormGroupPolicy('profileElfGroup', 'ProfileElf');
  this.validation.formGroup['profileElfGroup'] = ['firstName', 'lastName', 'email', 'country', 'notificationFrequency'];
}

ngOnDestroy(): void {
  this.validation.unregisterFormGroupPolicy('profileElfGroup');
  this.validation.unregisterPolicy('ProfileElf');
}
```

### Step 5 — Connect State Management

Create an Elf store and expose update methods that preserve immutable state.

```ts
import { Injectable } from '@angular/core';
import { createStore, select, setProps, withProps } from '@ngneat/elf';
import { ProfileElfState } from '../profile.policy';

const initialState: ProfileElfState = {
  firstName: '',
  lastName: '',
  email: '',
  country: '',
  notificationFrequency: ''
};

@Injectable()
export class ProfileElfStore {
  private readonly store = createStore({ name: 'profile-elf' }, withProps<ProfileElfState>(initialState));
  readonly draft$ = this.store.pipe(select((state) => state));

  change(path: keyof ProfileElfState, value: unknown): void {
    this.store.update(setProps({ [path]: value } as Partial<ProfileElfState>));
  }

  commitValidated(draft: ProfileElfState): void {
    this.store.update(setProps(structuredClone(draft)));
  }

  reset(): void {
    this.store.update(setProps(initialState));
  }
}
```

### Step 6 — Bind Controls

Use the selected store snapshot as the `actualModel` for directives and summaries.

```html
@if (draft$ | async; as draft) {
  <input name="email" [ngModel]="draft.email" (ngModelChange)="state.change('email', $event)" policyValidator
    [validateModel]="'email'" [actualModel]="draft" [withPolicy]="'ProfileElf'" groupName="profileElfGroup" />
  <policy-validation-message [model]="draft" propertyName="email"></policy-validation-message>
  <policy-validation-summary [model]="draft"></policy-validation-summary>
}
```

### Step 7 — Validate

Validate the current snapshot, then commit a cloned decorated result back through Elf.

```ts
submit(draft: ProfileElfState): void {
  this.validation.validateAll(draft, 'ProfileElf', { showAllErrors: true, evaluateGroups: true }).subscribe(() => {
    this.state.commitValidated(structuredClone(draft));
  });
}

validateGroup(draft: ProfileElfState): void {
  this.validation.evaluateFormGroup(draft, 'profileElfGroup', 'ProfileElf');
  this.state.commitValidated(structuredClone(draft));
}
```

### Step 8 — Reset

Reset the Elf store and clear any validation metadata on the previous snapshot.

```ts
reset(draft: ProfileElfState): void {
  this.validation.clearValidationState(draft, ['ProfileElf']);
  this.state.reset();
}
```

### Step 9 — Best Practices

Keep the Elf store thin and make the validation policy the only place where business validation rules live.

```ts
export const profileElfGroupFields = ['firstName', 'lastName', 'email', 'country', 'notificationFrequency'] as const;
```

Avoid mutating the object returned from the store outside Validation Rules Engine execution. Commit cloned validated snapshots so subscribers receive predictable immutable updates.

### Step 10 — Complete Working Example

```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ValidationProviderService } from '@validation-rules-engine/angular';
import { ProfileElfState, ProfileElfPolicy } from './profile.policy';
import { ProfileElfStore } from './state/profile-elf.store';

@Component({
  selector: 'app-elf-profile',
  templateUrl: './elf-profile.component.html'
})
export class ElfProfileComponent implements OnInit, OnDestroy {
  readonly draft$: Observable<ProfileElfState> = this.state.draft$;

  constructor(public readonly state: ProfileElfStore, private readonly validation: ValidationProviderService) {}

  ngOnInit(): void {
    this.validation.replacePolicy('ProfileElf', new ProfileElfPolicy());
    this.validation.registerFormGroupPolicy('profileElfGroup', 'ProfileElf');
    this.validation.formGroup['profileElfGroup'] = ['firstName', 'lastName', 'email', 'country', 'notificationFrequency'];
  }

  submit(draft: ProfileElfState): void {
    this.validation.validateAll(draft, 'ProfileElf', { showAllErrors: true, evaluateGroups: true }).subscribe(() => {
      this.state.commitValidated(structuredClone(draft));
    });
  }

  reset(draft: ProfileElfState): void {
    this.validation.clearValidationState(draft, ['ProfileElf']);
    this.state.reset();
  }

  ngOnDestroy(): void {
    this.validation.unregisterFormGroupPolicy('profileElfGroup');
    this.validation.unregisterPolicy('ProfileElf');
  }
}
```

```html
@if (draft$ | async; as draft) {
  <form (ngSubmit)="submit(draft)" novalidate>
    <label>Email <input type="email" name="email" [ngModel]="draft.email" (ngModelChange)="state.change('email', $event)" policyValidator
      [validateModel]="'email'" [actualModel]="draft" [withPolicy]="'ProfileElf'" groupName="profileElfGroup" /></label>
    <label>Frequency <select name="frequency" [ngModel]="draft.notificationFrequency" (ngModelChange)="state.change('notificationFrequency', $event)" policyValidator
      [validateModel]="'notificationFrequency'" [actualModel]="draft" [withPolicy]="'ProfileElf'" groupName="profileElfGroup">
      <option value="">Select</option><option value="weekly">Weekly</option>
    </select></label>
    <policy-validation-group-status [model]="draft" groupName="profileElfGroup"></policy-validation-group-status>
    <policy-validation-summary [model]="draft"></policy-validation-summary>
    <button type="submit">Save</button>
    <button type="button" (click)="reset(draft)">Reset</button>
  </form>
}
```
