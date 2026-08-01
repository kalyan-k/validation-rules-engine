# Custom RxJS Store with @validation-rules-engine/angular

A custom RxJS store uses a `BehaviorSubject` and small update functions to manage feature state without adopting a store framework.

## Enterprise use cases

- Small feature stores where framework dependencies should stay minimal.
- Libraries, embedded widgets, or migration bridges.
- Teams standardizing a simple internal store abstraction.

## Why choose it

Choose a custom RxJS store when transparency and minimal dependencies matter. Validation Rules Engine keeps policies separate from stream plumbing, so the store only commits form and validation snapshots.

## Integration pattern

The unified Angular showcase commits state through a BehaviorSubject-backed store while reusing the same `@validation-rules-engine/angular` policies, groups, summaries, and performance generator.

## Showcase pages

- [Overview](http://127.0.0.1:4202/state/custom-rxjs-store)
- [Simple Form](http://127.0.0.1:4202/state/custom-rxjs-store/simple)
- [Complex Form](http://127.0.0.1:4202/state/custom-rxjs-store/complex)
- [Performance Form](http://127.0.0.1:4202/state/custom-rxjs-store/performance)

## Using @validation-rules-engine/angular

A custom RxJS store is a good fit when a feature needs predictable observable state without adopting a formal store library. Validation Rules Engine validates the current `BehaviorSubject` snapshot and the store publishes the decorated result.

### Step 1 — Install Package

Install Validation Rules Engine, Angular Forms, and RxJS.

```bash
npm install @validation-rules-engine/angular @validation-rules-engine/core @angular/forms rxjs
```

RxJS is already part of Angular applications, so no additional state framework is required.

```json
{
  "dependencies": {
    "@angular/forms": "^20.0.0",
    "rxjs": "^7.8.0",
    "@validation-rules-engine/angular": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Import forms and Validation Rules Engine, then provide the feature store service.

```ts
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ValidationModule, provideBootstrapValidationDisplay } from '@validation-rules-engine/angular';
import { ProfileRxjsStore } from './state/profile-rxjs.store';

@NgModule({
  imports: [FormsModule, ValidationModule],
  providers: [ProfileRxjsStore, ...provideBootstrapValidationDisplay()]
})
export class ProfileFeatureModule {}
```

### Step 3 — Create Validation Policy

Define a serializable model and policy.

```ts
import { ValidationModel, ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules-engine/angular';

export interface RxjsProfile extends ValidationModel {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  phoneOptIn: boolean;
}

export class RxjsProfilePolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor('firstName').isRequired('First name is required'),
      v.validateFor('lastName').isRequired('Last name is required'),
      v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
      v.validateFor('country').isRequired('Country is required'),
      v.validateFor('phoneOptIn').isChecked('Phone opt-in is required')
    ];
  }
}
```

### Step 4 — Register Policy

Policy lifecycle remains the same as other Angular approaches.

```ts
ngOnInit(): void {
  this.validation.replacePolicy('RxjsProfile', new RxjsProfilePolicy());
  this.validation.registerFormGroupPolicy('rxjsProfileGroup', 'RxjsProfile');
  this.validation.formGroup['rxjsProfileGroup'] = ['firstName', 'lastName', 'email', 'country', 'phoneOptIn'];
}

ngOnDestroy(): void {
  this.validation.unregisterFormGroupPolicy('rxjsProfileGroup');
  this.validation.unregisterPolicy('RxjsProfile');
}
```

### Step 5 — Connect State Management

Keep the store tiny: one `BehaviorSubject`, one observable, and explicit update methods.

```ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { RxjsProfile } from '../profile.policy';

const emptyProfile = (): RxjsProfile => ({ firstName: '', lastName: '', email: '', country: '', phoneOptIn: false });

@Injectable()
export class ProfileRxjsStore {
  private readonly subject = new BehaviorSubject<RxjsProfile>(emptyProfile());
  readonly draft$ = this.subject.asObservable();

  snapshot(): RxjsProfile {
    return this.subject.value;
  }

  change(path: keyof RxjsProfile, value: unknown): void {
    this.subject.next({ ...this.subject.value, [path]: value });
  }

  commitValidated(draft: RxjsProfile): void {
    this.subject.next(structuredClone(draft));
  }

  reset(): void {
    this.subject.next(emptyProfile());
  }
}
```

### Step 6 — Bind Controls

Use the current observable value as `actualModel` and publish changes through the store.

```html
@if (draft$ | async; as draft) {
  <form (ngSubmit)="submit(draft)" novalidate>
    <input name="email" type="email" [ngModel]="draft.email" (ngModelChange)="store.change('email', $event)" policyValidator
      [validateModel]="'email'" [actualModel]="draft" [withPolicy]="'RxjsProfile'" groupName="rxjsProfileGroup" />
    <policy-validation-message [model]="draft" propertyName="email"></policy-validation-message>
    <policy-validation-summary [model]="draft"></policy-validation-summary>
  </form>
}
```

### Step 7 — Validate

Validate the current snapshot and push the decorated model back into the subject.

```ts
submit(draft: RxjsProfile): void {
  this.validation.validateAll(draft, 'RxjsProfile', { showAllErrors: true, evaluateGroups: true }).subscribe(() => {
    this.store.commitValidated(draft);
  });
}

validateGroup(draft: RxjsProfile): void {
  this.validation.evaluateFormGroup(draft, 'rxjsProfileGroup', 'RxjsProfile');
  this.store.commitValidated(draft);
}
```

### Step 8 — Reset

Clear metadata on the old snapshot and publish a fresh one.

```ts
reset(draft: RxjsProfile): void {
  this.validation.clearValidationState(draft, ['RxjsProfile']);
  this.store.reset();
}
```

### Step 9 — Best Practices

Keep the custom store API intentionally small.

```ts
export interface ProfileStorePort {
  readonly draft$: Observable<RxjsProfile>;
  change(path: keyof RxjsProfile, value: unknown): void;
  commitValidated(draft: RxjsProfile): void;
  reset(): void;
}
```

Avoid exposing the subject directly, clone validated snapshots before publishing if consumers assume immutability, and complete custom subjects only when the service itself owns a shorter lifecycle than Angular DI.

### Step 10 — Complete Working Example

```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ValidationProviderService } from '@validation-rules-engine/angular';
import { RxjsProfile, RxjsProfilePolicy } from './profile.policy';
import { ProfileRxjsStore } from './state/profile-rxjs.store';

@Component({
  selector: 'app-rxjs-profile',
  templateUrl: './rxjs-profile.component.html'
})
export class RxjsProfileComponent implements OnInit, OnDestroy {
  readonly draft$: Observable<RxjsProfile> = this.store.draft$;

  constructor(public readonly store: ProfileRxjsStore, private readonly validation: ValidationProviderService) {}

  ngOnInit(): void {
    this.validation.replacePolicy('RxjsProfile', new RxjsProfilePolicy());
    this.validation.registerFormGroupPolicy('rxjsProfileGroup', 'RxjsProfile');
    this.validation.formGroup['rxjsProfileGroup'] = ['firstName', 'lastName', 'email', 'country', 'phoneOptIn'];
  }

  submit(draft: RxjsProfile): void {
    this.validation.validateAll(draft, 'RxjsProfile', { showAllErrors: true, evaluateGroups: true }).subscribe(() => {
      this.store.commitValidated(structuredClone(draft));
    });
  }

  reset(draft: RxjsProfile): void {
    this.validation.clearValidationState(draft, ['RxjsProfile']);
    this.store.reset();
  }

  ngOnDestroy(): void {
    this.validation.unregisterFormGroupPolicy('rxjsProfileGroup');
    this.validation.unregisterPolicy('RxjsProfile');
  }
}
```

```html
@if (draft$ | async; as draft) {
  <form (ngSubmit)="submit(draft)" novalidate>
    <label>Email <input type="email" name="email" [ngModel]="draft.email" (ngModelChange)="store.change('email', $event)" policyValidator
      [validateModel]="'email'" [actualModel]="draft" [withPolicy]="'RxjsProfile'" groupName="rxjsProfileGroup" /></label>
    <label><input type="checkbox" name="phoneOptIn" [ngModel]="draft.phoneOptIn" (ngModelChange)="store.change('phoneOptIn', $event)" policyValidator
      [validateModel]="'phoneOptIn'" [actualModel]="draft" [withPolicy]="'RxjsProfile'" groupName="rxjsProfileGroup" /> Phone opt-in confirmed</label>
    <policy-validation-group-status [model]="draft" groupName="rxjsProfileGroup"></policy-validation-group-status>
    <policy-validation-summary [model]="draft"></policy-validation-summary>
    <button type="submit">Save</button>
    <button type="button" (click)="reset(draft)">Reset</button>
  </form>
}
```
