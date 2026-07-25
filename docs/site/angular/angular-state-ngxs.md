# NGXS with @validation-rules/angular

NGXS is a class-oriented Angular state library that groups defaults, action handlers, selectors, and state context updates around a feature state.

## Enterprise use cases

- Domain-driven Angular features where teams prefer classes and decorators.
- Workflows that need store semantics with less reducer ceremony.
- Feature modules that colocate state defaults, handlers, and selectors.

## Why choose it

Choose NGXS when action classes and decorated state handlers match your team’s architecture style. Validation Rules stays independent: it validates the model, and NGXS patches the validated snapshot back into feature state.

## Integration pattern

The unified Angular showcase commits form snapshots through NGXS action handlers while `@validation-rules/angular` owns validation policies, form groups, summaries, and result metadata.

## Showcase pages

- [Overview](http://127.0.0.1:4202/state/ngxs)
- [Simple Form](http://127.0.0.1:4202/state/ngxs/simple)
- [Complex Form](http://127.0.0.1:4202/state/ngxs/complex)
- [Performance Form](http://127.0.0.1:4202/state/ngxs/performance)

## Using @validation-rules/angular

With NGXS, action classes describe form events and the state class owns updates. `@validation-rules/angular` validates the selected model and NGXS stores the resulting draft snapshot.

### Step 1 — Install Package

Install Validation Rules, Angular Forms, and NGXS Store.

```bash
npm install @validation-rules/angular @validation-rules/core @ngxs/store @angular/forms
```

Use compatible Angular and NGXS major versions.

```json
{
  "dependencies": {
    "@angular/forms": "^20.0.0",
    "@ngxs/store": "^20.0.0",
    "@validation-rules/angular": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Register `ValidationModule` and the NGXS feature state.

```ts
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxsModule } from '@ngxs/store';
import { ValidationModule, provideBootstrapValidationDisplay } from '@validation-rules/angular';
import { ProfileState } from './state/profile.state';

@NgModule({
  imports: [FormsModule, ValidationModule, NgxsModule.forFeature([ProfileState])],
  providers: [...provideBootstrapValidationDisplay()]
})
export class ProfileFeatureModule {}
```

### Step 3 — Create Validation Policy

Policy rules stay framework-neutral and target the NGXS model shape.

```ts
import { ValidationModel, ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules/angular';

export interface ProfileStateModel extends ValidationModel {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  managerApproval: boolean;
}

export class ProfileStatePolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor('firstName').isRequired('First name is required'),
      v.validateFor('lastName').isRequired('Last name is required'),
      v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
      v.validateFor('role').isRequired('Role is required'),
      v.validateFor('managerApproval').isChecked('Manager approval is required')
    ];
  }
}
```

### Step 4 — Register Policy

Use `replacePolicy()` during feature activation and unregister on route/component destroy.

```ts
ngOnInit(): void {
  this.validation.replacePolicy('ProfileState', new ProfileStatePolicy());
  this.validation.registerFormGroupPolicy('profileStateGroup', 'ProfileState');
  this.validation.formGroup['profileStateGroup'] = ['firstName', 'lastName', 'email', 'role', 'managerApproval'];
}

ngOnDestroy(): void {
  this.validation.unregisterFormGroupPolicy('profileStateGroup');
  this.validation.unregisterPolicy('ProfileState');
}
```

### Step 5 — Connect State Management

Model updates and validated snapshots are NGXS actions.

```ts
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { ProfileStateModel } from '../profile.policy';

export class ChangeProfileField {
  static readonly type = '[Profile] Change Field';
  constructor(public readonly path: keyof ProfileStateModel, public readonly value: unknown) {}
}

export class CommitValidatedProfile {
  static readonly type = '[Profile] Commit Validated';
  constructor(public readonly draft: ProfileStateModel) {}
}

export class ResetProfile {
  static readonly type = '[Profile] Reset';
}

const defaults: ProfileStateModel = { firstName: '', lastName: '', email: '', role: '', managerApproval: false };

@State<ProfileStateModel>({ name: 'profile', defaults })
export class ProfileState {
  @Selector() static draft(state: ProfileStateModel): ProfileStateModel { return state; }

  @Action(ChangeProfileField)
  change(ctx: StateContext<ProfileStateModel>, action: ChangeProfileField): void {
    ctx.patchState({ [action.path]: action.value } as Partial<ProfileStateModel>);
  }

  @Action(CommitValidatedProfile)
  commit(ctx: StateContext<ProfileStateModel>, action: CommitValidatedProfile): void {
    ctx.setState(action.draft);
  }

  @Action(ResetProfile)
  reset(ctx: StateContext<ProfileStateModel>): void {
    ctx.setState(defaults);
  }
}
```

### Step 6 — Bind Controls

Select state with `@Select()` or `store.select()` and dispatch actions from control events.

```html
@if (draft$ | async; as draft) {
  <form (ngSubmit)="submit(draft)" novalidate>
    <input name="email" [ngModel]="draft.email" (ngModelChange)="change('email', $event)" policyValidator
      [validateModel]="'email'" [actualModel]="draft" [withPolicy]="'ProfileState'" groupName="profileStateGroup" />
    <policy-validation-message [model]="draft" propertyName="email"></policy-validation-message>
    <policy-validation-summary [model]="draft"></policy-validation-summary>
  </form>
}
```

### Step 7 — Validate

Run the policy and dispatch a committed copy of the decorated state.

```ts
submit(draft: ProfileStateModel): void {
  this.validation.validateAll(draft, 'ProfileState', { showAllErrors: true, evaluateGroups: true }).subscribe(() => {
    this.store.dispatch(new CommitValidatedProfile(structuredClone(draft)));
  });
}

validateSection(draft: ProfileStateModel): void {
  this.validation.evaluateFormGroup(draft, 'profileStateGroup', 'ProfileState');
  this.store.dispatch(new CommitValidatedProfile(structuredClone(draft)));
}
```

### Step 8 — Reset

Clear validation metadata on the selected model and dispatch the NGXS reset action.

```ts
reset(draft: ProfileStateModel): void {
  this.validation.clearValidationState(draft, ['ProfileState']);
  this.store.dispatch(new ResetProfile());
}
```

### Step 9 — Best Practices

Keep action classes small and state snapshots serializable.

```ts
const validationActions = [
  ChangeProfileField,
  CommitValidatedProfile,
  ResetProfile
] as const;
```

Prefer feature-scoped state classes, route-scoped policy registration, selectors for read models, and explicit reset actions when leaving wizard-like screens.

### Step 10 — Complete Working Example

```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { ValidationProviderService } from '@validation-rules/angular';
import { ProfileStateModel, ProfileStatePolicy } from './profile.policy';
import { ChangeProfileField, CommitValidatedProfile, ProfileState, ResetProfile } from './state/profile.state';

@Component({
  selector: 'app-ngxs-profile',
  templateUrl: './ngxs-profile.component.html'
})
export class NgxsProfileComponent implements OnInit, OnDestroy {
  @Select(ProfileState.draft) readonly draft$!: Observable<ProfileStateModel>;

  constructor(private readonly store: Store, private readonly validation: ValidationProviderService) {}

  ngOnInit(): void {
    this.validation.replacePolicy('ProfileState', new ProfileStatePolicy());
    this.validation.registerFormGroupPolicy('profileStateGroup', 'ProfileState');
    this.validation.formGroup['profileStateGroup'] = ['firstName', 'lastName', 'email', 'role', 'managerApproval'];
  }

  change(path: keyof ProfileStateModel, value: unknown): void {
    this.store.dispatch(new ChangeProfileField(path, value));
  }

  submit(draft: ProfileStateModel): void {
    this.validation.validateAll(draft, 'ProfileState', { showAllErrors: true, evaluateGroups: true }).subscribe(() => {
      this.store.dispatch(new CommitValidatedProfile(structuredClone(draft)));
    });
  }

  reset(draft: ProfileStateModel): void {
    this.validation.clearValidationState(draft, ['ProfileState']);
    this.store.dispatch(new ResetProfile());
  }

  ngOnDestroy(): void {
    this.validation.unregisterFormGroupPolicy('profileStateGroup');
    this.validation.unregisterPolicy('ProfileState');
  }
}
```

```html
@if (draft$ | async; as draft) {
  <form (ngSubmit)="submit(draft)" novalidate>
    <label>Email <input type="email" name="email" [ngModel]="draft.email" (ngModelChange)="change('email', $event)" policyValidator
      [validateModel]="'email'" [actualModel]="draft" [withPolicy]="'ProfileState'" groupName="profileStateGroup" /></label>
    <label><input type="checkbox" name="managerApproval" [ngModel]="draft.managerApproval" (ngModelChange)="change('managerApproval', $event)" policyValidator
      [validateModel]="'managerApproval'" [actualModel]="draft" [withPolicy]="'ProfileState'" groupName="profileStateGroup" /> Manager approved</label>
    <policy-validation-group-summary [model]="draft" groupName="profileStateGroup"></policy-validation-group-summary>
    <policy-validation-summary [model]="draft"></policy-validation-summary>
    <button type="submit">Validate and save</button>
    <button type="button" (click)="reset(draft)">Reset</button>
  </form>
}
```
