# Core Quick Start

## Model

```ts
interface AccountModel {
  profile: {
    name: string;
    email: string;
  };
  seatCount: number | '';
}
```

## Policy

```ts
import type { ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules-engine/core';

class AccountPolicy implements ValidationPolicy {
  addValidations(helper: ValidatorHelper): Validator[] {
    return [
      helper.validateFor('profile.name').isRequired('Name is required'),
      helper.validateFor('profile.email')
        .isRequired('Email is required')
        .isEmail('Enter a valid email address'),
      helper.validateFor('seatCount')
        .isRequired('Seat count is required')
        .isNumber('Seat count must be numeric')
        .range('Seat count must be between 1 and 500', 1, 500, 'number')
    ];
  }
}
```

## Register through an adapter or Core-only

Angular:

```ts
validationProvider.register('Account', new AccountPolicy());
```

React:

```tsx
const policies = [{ name: 'account', policy: new AccountPolicy() }];
const form = useValidationForm({ initialModel, policies, policyNames: ['account'] });
```

Vanilla / Core-only:

Build validators from the policy and evaluate them in application code, or open the live [Vanilla Showcase](http://127.0.0.1:4205/simple) to see DOM wiring for the same Core contracts.

```ts
const helper = new ValidatorHelper();
const validators = new AccountPolicy().addValidations(helper);
```

## Read results

```ts
const firstError = model.validationResults?.[0];
console.log(firstError?.propertyName);
console.log(firstError?.error.message);
```

Adapters expose the same result shape through directives, hooks, summaries, and group status helpers.
