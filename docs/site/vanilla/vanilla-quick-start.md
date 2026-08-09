# Vanilla Quick Start

Install Core and validate a plain TypeScript model. The Vanilla Showcase follows the same pattern and then binds results to the DOM.

## Install

```bash
npm install @validation-rules-engine/core
```

## Define a policy

```ts
import type { ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules-engine/core';

export class AccountPolicy implements ValidationPolicy {
  addValidations(helper: ValidatorHelper): Validator[] {
    return [
      helper.validateFor('name').isRequired('Name is required'),
      helper.validateFor('email')
        .isRequired('Email is required')
        .isEmail('Enter a valid email address')
    ];
  }
}
```

## Execute with Core helpers

Adapters call Core for you. In a Vanilla (or other Core-only) app you register the policy, run validators, and read `model.validationResults`:

```ts
import { ValidatorHelper } from '@validation-rules-engine/core';
import { AccountPolicy } from './account-policy';

const policy = new AccountPolicy();
const helper = new ValidatorHelper();
const validators = policy.addValidations(helper);

const model = {
  name: '',
  email: 'not-an-email',
  validationResults: [] as unknown[]
};

// Showcase code evaluates validators and writes ValidationResult metadata onto the model.
// Open the live Vanilla Showcase to see field touch, blur, submit, and summary wiring.
```

## Try it live

- [Simple form](http://127.0.0.1:4205/simple)
- [Complex form](http://127.0.0.1:4205/complex)
- [Performance form](http://127.0.0.1:4205/performance)

## When to use an adapter instead

Choose `@validation-rules-engine/angular` or `@validation-rules-engine/react` when you need framework lifecycle integration, controlled-field helpers, or framework-native display strategies. Keep using Core-only policies either way.
