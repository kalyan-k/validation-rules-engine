# NgRx with @validation-rules/angular

NgRx is a Redux-inspired Angular state library built around actions, reducers, selectors, and immutable snapshots.

## Enterprise use cases

- Multi-step workflows shared across routes or feature modules.
- Auditable state transitions where every form change and validation result should be traceable.
- Large Angular applications that already use selectors, reducers, and effects.

## Why choose it

Choose NgRx when explicit events and reducer tests are more important than minimizing boilerplate. Validation Rules fits this model because policies validate a plain draft model, then the validated model and result metadata can be committed through an action.

## Integration pattern

The unified Angular showcase stores the form snapshot through NgRx actions and reducers while `@validation-rules/angular` evaluates the same model paths used by every other Angular state showcase.

## Showcase pages

- [Overview](http://127.0.0.1:4202/state/ngrx)
- [Simple Form](http://127.0.0.1:4202/state/ngrx/simple)
- [Complex Form](http://127.0.0.1:4202/state/ngrx/complex)
- [Performance Form](http://127.0.0.1:4202/state/ngrx/performance)

## Using @validation-rules/angular

In NgRx applications, keep reducers responsible for immutable draft state and let `@validation-rules/angular` validate the selected draft before dispatching save or validation-result actions.

### Step 1 — Install Package

Install the Angular adapter, Core package, Angular Forms, and NgRx Store.

```bash
npm install @validation-rules/angular @validation-rules/core @ngrx/store @angular/forms
```

Keep NgRx aligned to the Angular major version used by the app.

```json
{
  "dependencies": {
    "@angular/forms": "^20.0.0",
    "@ngrx/store": "^20.0.0",
    "@validation-rules/angular": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Register Angular Forms, Validation Rules, and the feature reducer.

```ts
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { ValidationModule, provideBootstrapValidationDisplay } from '@validation-rules/angular';
import { profileReducer } from './state/profile.reducer';

@NgModule({
  imports: [
    FormsModule,
    ValidationModule,
    StoreModule.forFeature('profile', profileReducer)
  ],
  providers: [...provideBootstrapValidationDisplay()]
})
export class ProfileFeatureModule {}
```

### Step 3 — Create Validation Policy

The policy validates the serializable draft model stored by NgRx.

```ts
import { ValidationModel, ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules/angular';

export interface ProfileDraft extends ValidationModel {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  accepted: boolean;
}

export class ProfileDraftPolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor('firstName').isRequired('First name is required'),
      v.validateFor('lastName').isRequired('Last name is required'),
      v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
      v.validateFor('phone').isPhone('Enter a valid US phone number'),
      v.validateFor('country').isRequired('Country is required'),
      v.validateFor('accepted').isChecked('Acceptance is required')
    ];
  }
}
```

### Step 4 — Register Policy

Use component lifecycle for route-scoped policy registration and cleanup.

```ts
ngOnInit(): void {
  this.validation.replacePolicy('ProfileDraft', new ProfileDraftPolicy());
  this.validation.registerFormGroupPolicy('profileDraftGroup', 'ProfileDraft');
  this.validation.formGroup['profileDraftGroup'] = ['firstName', 'lastName', 'email', 'phone', 'country', 'accepted'];
}

ngOnDestroy(): void {
  this.validation.unregisterFormGroupPolicy('profileDraftGroup');
  this.validation.unregisterPolicy('ProfileDraft');
}
```

### Step 5 — Connect State Management

Model changes become NgRx actions. Validation runs against the selected draft and then dispatches a validated snapshot.

```ts
import { createAction, createReducer, createSelector, on, props } from '@ngrx/store';
import { ProfileDraft } from './profile.policy';

export const profileFieldChanged = createAction('[Profile] Field Changed', props<{ path: keyof ProfileDraft; value: unknown }>());
export const profileValidated = createAction('[Profile] Validated', props<{ draft: ProfileDraft; isValid: boolean }>());
export const profileReset = createAction('[Profile] Reset');

export const initialProfileDraft: ProfileDraft = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  accepted: false
};

export const profileReducer = createReducer(
  initialProfileDraft,
  on(profileFieldChanged, (state, { path, value }) => ({ ...state, [path]: value })),
  on(profileValidated, (_state, { draft }) => ({ ...draft })),
  on(profileReset, () => initialProfileDraft)
);

export const selectProfileDraft = (state: { profile: ProfileDraft }) => state.profile;
export const selectProfileErrors = createSelector(selectProfileDraft, (draft) => draft.validationResults ?? []);
```

### Step 6 — Bind Controls

Read the draft with `async`, dispatch changes, and bind `policyValidator` to the selected model.

```html
@if (draft$ | async; as draft) {
  <input [ngModel]="draft.email" (ngModelChange)="change('email', $event)" policyValidator
    [validateModel]="'email'" [actualModel]="draft" [withPolicy]="'ProfileDraft'" groupName="profileDraftGroup" />
  <policy-validation-message [model]="draft" propertyName="email"></policy-validation-message>
  <policy-validation-summary [model]="draft"></policy-validation-summary>
}
```

### Step 7 — Validate

Validate the current draft and commit the decorated snapshot back through NgRx.

```ts
submit(draft: ProfileDraft): void {
  this.validation.validateAll(draft, 'ProfileDraft', {
    showAllErrors: true,
    evaluateGroups: true,
    markEvaluated: true
  }).subscribe(() => {
    this.store.dispatch(profileValidated({ draft: structuredClone(draft), isValid: !draft.validationResults?.length }));
  });
}

validateGroup(draft: ProfileDraft): void {
  this.validation.evaluateFormGroup(draft, 'profileDraftGroup', 'ProfileDraft');
  this.store.dispatch(profileValidated({ draft: structuredClone(draft), isValid: !draft.validationResults?.length }));
}
```

### Step 8 — Reset

Reset NgRx state and clear metadata on the current draft before leaving the route.

```ts
reset(draft: ProfileDraft): void {
  this.validation.clearValidationState(draft, ['ProfileDraft']);
  this.store.dispatch(profileReset());
}
```

### Step 9 — Best Practices

Keep reducer state serializable and clone validated drafts before dispatching them.

```ts
const validatedDraft = structuredClone(draft);
this.store.dispatch(profileValidated({ draft: validatedDraft, isValid: !(validatedDraft.validationResults?.length ?? 0) }));
```

Prefer feature-scoped reducers, stable policy names, selectors for derived validation summaries, and effects only for persistence or server-side validation.

### Step 10 — Complete Working Example

```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { ValidationProviderService } from '@validation-rules/angular';
import { ProfileDraft, ProfileDraftPolicy } from './profile.policy';
import { profileFieldChanged, profileReset, profileValidated, selectProfileDraft } from './state/profile.reducer';

@Component({
  selector: 'app-ngrx-profile',
  templateUrl: './ngrx-profile.component.html'
})
export class NgrxProfileComponent implements OnInit, OnDestroy {
  readonly draft$: Observable<ProfileDraft> = this.store.select(selectProfileDraft);

  constructor(private readonly store: Store, private readonly validation: ValidationProviderService) {}

  ngOnInit(): void {
    this.validation.replacePolicy('ProfileDraft', new ProfileDraftPolicy());
    this.validation.registerFormGroupPolicy('profileDraftGroup', 'ProfileDraft');
    this.validation.formGroup['profileDraftGroup'] = ['firstName', 'lastName', 'email', 'phone', 'country', 'accepted'];
  }

  change(path: keyof ProfileDraft, value: unknown): void {
    this.store.dispatch(profileFieldChanged({ path, value }));
  }

  submit(draft: ProfileDraft): void {
    this.validation.validateAll(draft, 'ProfileDraft', { showAllErrors: true, evaluateGroups: true }).subscribe(() => {
      this.store.dispatch(profileValidated({ draft: structuredClone(draft), isValid: !draft.validationResults?.length }));
    });
  }

  reset(draft: ProfileDraft): void {
    this.validation.clearValidationState(draft, ['ProfileDraft']);
    this.store.dispatch(profileReset());
  }

  ngOnDestroy(): void {
    this.validation.unregisterFormGroupPolicy('profileDraftGroup');
    this.validation.unregisterPolicy('ProfileDraft');
  }
}
```

```html
@if (draft$ | async; as draft) {
  <form (ngSubmit)="submit(draft)" novalidate>
    <label>Email <input type="email" [ngModel]="draft.email" name="email" (ngModelChange)="change('email', $event)" policyValidator
      [validateModel]="'email'" [actualModel]="draft" [withPolicy]="'ProfileDraft'" groupName="profileDraftGroup" /></label>
    <label><input type="checkbox" [ngModel]="draft.accepted" name="accepted" (ngModelChange)="change('accepted', $event)" policyValidator
      [validateModel]="'accepted'" [actualModel]="draft" [withPolicy]="'ProfileDraft'" groupName="profileDraftGroup" /> Accept terms</label>
    <policy-validation-group-status [model]="draft" groupName="profileDraftGroup"></policy-validation-group-status>
    <policy-validation-summary [model]="draft"></policy-validation-summary>
    <button type="submit">Save</button>
    <button type="button" (click)="reset(draft)">Reset</button>
  </form>
}
```
