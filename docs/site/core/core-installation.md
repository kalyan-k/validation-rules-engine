# Core Installation

## Install

Install Core when you are writing shared policies, validating plain TypeScript objects, or building framework adapter code.

```bash
npm install @validation-rules-engine/core
```

Application forms usually install `@validation-rules-engine/angular` or `@validation-rules-engine/react`; those adapters depend on Core and expose framework-specific lifecycle APIs.

## Imports

```ts
import {
  ValidatorHelper,
  type ValidationPolicy,
  type Validator,
  type ValidationModel,
  type ValidationResult
} from '@validation-rules-engine/core';
```

## Runtime boundaries

Core has no Angular, React, DOM, or router dependency. It validates plain objects and records validation metadata on the evaluated model.

## Verify

```ts
const helper = new ValidatorHelper();
const validators = [helper.validateFor('email').isEmail('Invalid email')];

console.log(validators[0].propertyName);
```

If TypeScript resolves `ValidatorHelper` and `ValidationPolicy`, the package is installed correctly.
