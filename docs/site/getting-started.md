# Installation & Quick Start

Install the framework-neutral engine, then add an adapter only when your UI framework needs one.

## Core only (Vanilla / plain TypeScript)

```bash
npm install @validation-rules-engine/core
```

Use this path for shared policy libraries, non-UI validation, or framework-free forms. Continue with the [Core Quick Start](/docs/core-quick-start) and the live [Vanilla Showcase](/docs/vanilla-overview).

## Angular

```bash
npm install @validation-rules-engine/core @validation-rules-engine/angular
```

Angular framework packages are peer dependencies of `@validation-rules-engine/angular`.

## React

```bash
npm install @validation-rules-engine/core @validation-rules-engine/react react react-dom
```

## Define a policy

A policy returns validators for model paths. Keep messages close to the rule so a policy remains easy to inspect and test. Prefer Core imports when the policy should stay reusable across Vanilla, Angular, and React:

```ts
import type { ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules-engine/core';

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

## Register and execute (Angular)

```ts
validation.register('Account', new AccountPolicy());

validation.validateAll(model, 'Account', {
  showAllErrors: true,
  evaluateGroups: true
}).subscribe(() => saveWhenValid(model));
```

`model.validationResults` contains the current failures. Use `clearValidationState()` when the workflow ends or the model is replaced.

## Add the optional Angular stylesheet

```json
{
  "styles": [
    "node_modules/@validation-rules-engine/angular/styles/policy-validation.css"
  ]
}
```

The package export is stable. Existing `policy-validation-*` selectors remain compatibility APIs.

## Next steps by stack

- Vanilla / Core-only: [Vanilla Quick Start](/docs/vanilla-quick-start) and [http://127.0.0.1:4205/](http://127.0.0.1:4205/)
- React: [React Quick Start](/docs/react-quick-start)
- Angular: continue with the Angular Showcase after registration above, or open [http://127.0.0.1:4202/](http://127.0.0.1:4202/)
