# Installation & Quick Start

Install the framework-neutral engine plus the adapter for your application framework.

Angular consumers install the Angular adapter and its peer dependency used by the current validator implementation:

```bash
npm install @validation-rules-engine/core @validation-rules-engine/angular underscore
```

Angular framework packages are peer dependencies of `@validation-rules-engine/angular`.

React consumers install the React adapter and React peer packages:

```bash
npm install @validation-rules-engine/core @validation-rules-engine/react react react-dom
```

## Define a policy

A policy returns validators for model paths. Keep messages close to the rule so a policy remains easy to inspect and test.

```ts
import { ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules-engine/angular';

export class AccountPolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor('name').isRequired('Name is required'),
      v.validateFor('email')
        .isRequired('Email is required')
        .isEmail('Enter a valid email address')
    ];
  }
}
```

## Configure Angular

Import `ValidationModule` once and choose a display setup appropriate for the application.

```ts
@NgModule({
  imports: [ValidationModule.forRoot({ preset: 'bootstrap' })]
})
export class AppModule {}
```

## Register and execute

```ts
validation.register('Account', new AccountPolicy());

validation.validateAll(model, 'Account', {
  showAllErrors: true,
  evaluateGroups: true
}).subscribe(() => saveWhenValid(model));
```

`model.validationResults` contains the current failures. Use `clearValidationState()` when the workflow ends or the model is replaced.

## Add the optional stylesheet

```json
{
  "styles": [
    "node_modules/@validation-rules-engine/angular/styles/policy-validation.css"
  ]
}
```

The package export is stable. Existing `policy-validation-*` selectors remain compatibility APIs.

## React next step

If you are building a React form, continue with the [React Quick Start](/docs/react-quick-start). It uses the same policy contract with `ValidationRulesProvider`, `useValidationForm`, `useValidationField`, and `ValidationSummary`.
