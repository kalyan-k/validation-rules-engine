# Akita with @validation-rules-engine/angular

Akita models state as stores and queries. Stores own updates; queries expose read models for components and services.

## Enterprise use cases

- CRUD-heavy Angular domains with clear read/write boundaries.
- Feature stores where query selectors are useful but full Redux ceremony is not needed.
- Incremental migrations from service state into structured stores.

## Why choose it

Choose Akita when Store + Query separation keeps feature state readable. Validation Rules Engine integrates by validating the plain model and writing validation results back to the store snapshot.

## Integration pattern

The unified Angular showcase updates an Akita store for the selected strategy and keeps `@validation-rules-engine/angular` policies identical to every other state implementation.

## Showcase pages

- [Overview](http://127.0.0.1:4202/state/akita)
- [Simple Form](http://127.0.0.1:4202/state/akita/simple)
- [Complex Form](http://127.0.0.1:4202/state/akita/complex)
- [Performance Form](http://127.0.0.1:4202/state/akita/performance)

## Using @validation-rules-engine/angular

In Akita applications, use stores for updates, queries for reads, and `@validation-rules-engine/angular` for model validation and UI-facing validation metadata.

### Step 1 — Install Package

Install Validation Rules Engine, Angular Forms, and Akita.

```bash
npm install @validation-rules-engine/angular @validation-rules-engine/core @datorama/akita @angular/forms
```

Keep Akita as an application dependency; the Validation Rules Engine adapter does not require Akita unless your feature uses it.

```json
{
  "dependencies": {
    "@angular/forms": "^20.0.0",
    "@datorama/akita": "^7.1.0",
    "@validation-rules-engine/angular": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Import forms and Validation Rules Engine normally. Akita feature stores are services, so no feature module registration is required.

```ts
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ValidationModule, provideBootstrapValidationDisplay } from '@validation-rules-engine/angular';
import { ProfileStore, ProfileQuery } from './state/profile.store';

@NgModule({
  imports: [FormsModule, ValidationModule],
  providers: [ProfileStore, ProfileQuery, ...provideBootstrapValidationDisplay()]
})
export class ProfileFeatureModule {}
```

### Step 3 — Create Validation Policy

The Akita state is a plain object, so policies look the same as they do for local state.

```ts
import { ValidationModel, ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules-engine/angular';

export interface ProfileStoreState extends ValidationModel {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  active: boolean;
}

export class ProfileStorePolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor('firstName').isRequired('First name is required'),
      v.validateFor('lastName').isRequired('Last name is required'),
      v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
      v.validateFor('department').isRequired('Department is required'),
      v.validateFor('active').isChecked('Active employee confirmation is required')
    ];
  }
}
```

### Step 4 — Register Policy

Register the policy where the feature form mounts.

```ts
ngOnInit(): void {
  this.validation.replacePolicy('ProfileStore', new ProfileStorePolicy());
  this.validation.registerFormGroupPolicy('profileStoreGroup', 'ProfileStore');
  this.validation.formGroup['profileStoreGroup'] = ['firstName', 'lastName', 'email', 'department', 'active'];
}

ngOnDestroy(): void {
  this.validation.unregisterFormGroupPolicy('profileStoreGroup');
  this.validation.unregisterPolicy('ProfileStore');
}
```

### Step 5 — Connect State Management

Create an Akita store for writes and a query for reads.

```ts
import { Injectable } from '@angular/core';
import { Query, Store, StoreConfig } from '@datorama/akita';
import { ProfileStoreState } from '../profile.policy';

const initialState: ProfileStoreState = { firstName: '', lastName: '', email: '', department: '', active: false };

@Injectable()
@StoreConfig({ name: 'profile' })
export class ProfileStore extends Store<ProfileStoreState> {
  constructor() { super(initialState); }

  change(path: keyof ProfileStoreState, value: unknown): void {
    this.update((state) => ({ ...state, [path]: value }));
  }

  commitValidated(draft: ProfileStoreState): void {
    this.update(() => draft);
  }

  reset(): void {
    this.update(() => initialState);
  }
}

@Injectable()
export class ProfileQuery extends Query<ProfileStoreState> {
  readonly draft$ = this.select();
  constructor(store: ProfileStore) { super(store); }
}
```

### Step 6 — Bind Controls

Bind the queried model to the template and call store update methods from control changes.

```html
@if (draft$ | async; as draft) {
  <form (ngSubmit)="submit(draft)" novalidate>
    <input name="department" [ngModel]="draft.department" (ngModelChange)="store.change('department', $event)" policyValidator
      [validateModel]="'department'" [actualModel]="draft" [withPolicy]="'ProfileStore'" groupName="profileStoreGroup" />
    <policy-validation-message [model]="draft" propertyName="department"></policy-validation-message>
    <policy-validation-summary [model]="draft"></policy-validation-summary>
  </form>
}
```

### Step 7 — Validate

Validate the queried draft, then commit the decorated copy back into the store.

```ts
submit(draft: ProfileStoreState): void {
  this.validation.validateAll(draft, 'ProfileStore', { showAllErrors: true, evaluateGroups: true }).subscribe(() => {
    this.store.commitValidated(structuredClone(draft));
  });
}

validateGroup(draft: ProfileStoreState): void {
  this.validation.evaluateFormGroup(draft, 'profileStoreGroup', 'ProfileStore');
  this.store.commitValidated(structuredClone(draft));
}
```

### Step 8 — Reset

Clear the selected draft and reset the Akita store.

```ts
reset(draft: ProfileStoreState): void {
  this.validation.clearValidationState(draft, ['ProfileStore']);
  this.store.reset();
}
```

### Step 9 — Best Practices

Keep Akita stores focused on state transitions and keep policies in separate files.

```ts
export const profileStoreFields = ['firstName', 'lastName', 'email', 'department', 'active'] as const;
```

Use queries for read-only projections, store methods for writes, and component lifecycle for policy cleanup.

### Step 10 — Complete Working Example

```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ValidationProviderService } from '@validation-rules-engine/angular';
import { ProfileStoreState, ProfileStorePolicy } from './profile.policy';
import { ProfileQuery, ProfileStore } from './state/profile.store';

@Component({
  selector: 'app-akita-profile',
  templateUrl: './akita-profile.component.html'
})
export class AkitaProfileComponent implements OnInit, OnDestroy {
  readonly draft$: Observable<ProfileStoreState> = this.query.draft$;

  constructor(
    public readonly store: ProfileStore,
    private readonly query: ProfileQuery,
    private readonly validation: ValidationProviderService
  ) {}

  ngOnInit(): void {
    this.validation.replacePolicy('ProfileStore', new ProfileStorePolicy());
    this.validation.registerFormGroupPolicy('profileStoreGroup', 'ProfileStore');
    this.validation.formGroup['profileStoreGroup'] = ['firstName', 'lastName', 'email', 'department', 'active'];
  }

  submit(draft: ProfileStoreState): void {
    this.validation.validateAll(draft, 'ProfileStore', { showAllErrors: true, evaluateGroups: true }).subscribe(() => {
      this.store.commitValidated(structuredClone(draft));
    });
  }

  reset(draft: ProfileStoreState): void {
    this.validation.clearValidationState(draft, ['ProfileStore']);
    this.store.reset();
  }

  ngOnDestroy(): void {
    this.validation.unregisterFormGroupPolicy('profileStoreGroup');
    this.validation.unregisterPolicy('ProfileStore');
  }
}
```

```html
@if (draft$ | async; as draft) {
  <form (ngSubmit)="submit(draft)" novalidate>
    <label>Email <input name="email" type="email" [ngModel]="draft.email" (ngModelChange)="store.change('email', $event)" policyValidator
      [validateModel]="'email'" [actualModel]="draft" [withPolicy]="'ProfileStore'" groupName="profileStoreGroup" /></label>
    <label><input name="active" type="checkbox" [ngModel]="draft.active" (ngModelChange)="store.change('active', $event)" policyValidator
      [validateModel]="'active'" [actualModel]="draft" [withPolicy]="'ProfileStore'" groupName="profileStoreGroup" /> Active employee</label>
    <policy-validation-group-status [model]="draft" groupName="profileStoreGroup"></policy-validation-group-status>
    <policy-validation-summary [model]="draft"></policy-validation-summary>
    <button type="submit">Save</button>
    <button type="button" (click)="reset(draft)">Reset</button>
  </form>
}
```
