# Validation Rules Engine (VRE) for Angular

`@validation-rules-engine/angular` connects policy-driven validation to Angular template-driven forms. Policies keep rules reusable and testable, while directives, services, components, and display strategies integrate them with the view.

## Installation

```bash
npm install @validation-rules-engine/core @validation-rules-engine/angular underscore
```

The core package, Angular framework packages, RxJS, and Underscore are peer dependencies.

Add the optional default stylesheet:

```json
{
  "styles": [
    "node_modules/@validation-rules-engine/angular/styles/policy-validation.css"
  ]
}
```

The historic stylesheet filename, `policyValidator` directive API, `policy-validation-*` selectors, CSS classes, and DOM attributes remain stable compatibility contracts.

## Features

- Reusable policy classes and fluent rules
- Nested model paths, conditional rules, and asynchronous validation
- Form-group and policy-group status tracking
- Field, group, policy-group, and model summaries
- Bootstrap, Angular Material, Tailwind-friendly, generic, automatic, and custom display strategies
- Dynamic policy replacement, refresh, evaluation, and cleanup APIs

## Quick start

```typescript
import { NgModule } from '@angular/core';
import {
  ValidationModule,
  ValidationPolicy,
  ValidationProviderService,
  Validator,
  ValidatorHelper
} from '@validation-rules-engine/angular';

class UserFormPolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor('email')
        .isRequired('Email is required')
        .isEmail('Enter a valid email address')
    ];
  }
}

@NgModule({
  imports: [ValidationModule.forRoot({ preset: 'bootstrap' })]
})
export class AppModule {
  constructor(validation: ValidationProviderService) {
    validation.register('UserForm', new UserFormPolicy());
    validation.registerFormGroupPolicy('userForm', 'UserForm');
  }
}
```

```html
<input
  [(ngModel)]="model.email"
  policyValidator
  [validateModel]="'user.email'"
  [actualModel]="model"
  [withPolicy]="'UserForm'"
  groupName="userForm"
/>

<policy-validation-group-status
  [model]="model"
  groupName="userForm"
></policy-validation-group-status>
```

## Policy groups

```typescript
validation.registerPolicyGroup('checkout', {
  policies: ['PersonalInfo', 'ShippingAddress', 'BillingAddress'],
  formGroups: ['personalInfo', 'shippingInfo', 'billingInfo']
});
```

Use `replacePolicy(name, policy)` for generated forms and clear stale state when their shape changes:

```typescript
validation.replacePolicy(policyName, generatedPolicy);
validation.clearValidationState(model, [policyName]);
```

## Common exports

- `ValidationModule`, `ValidationProviderService`, and `ValidatorDirective`
- `ValidationPolicy`, `Validator`, `ValidatorHelper`, and `ValidationHelper`
- summary and status components for models, groups, and policy groups
- Bootstrap, Material, Tailwind, generic, default, and custom display strategies
- display configuration, resolver, factory, provider, and token APIs
- Angular `Policy` execution plus re-exported framework-neutral contracts

## Showcase

The repository includes a private Angular consumer with Bootstrap, Material, and Tailwind-style examples:

```bash
npm install
npm start
```

## License

MIT - see [LICENSE](LICENSE).
