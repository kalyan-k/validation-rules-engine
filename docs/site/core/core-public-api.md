# Core Public API

## ValidationPolicy

```ts
export interface ValidationPolicy {
  addValidations(helper: ValidatorHelper): Validator[];
}
```

## ValidatorHelper

```ts
const validator = new ValidatorHelper().validateFor('profile.email');
```

`validateFor` sets the target path and optional dependency.

## Validator

```ts
helper.validateFor('email')
  .isRequired('Email is required')
  .isEmail('Enter a valid email address');
```

## Result contracts

```ts
type ValidationResult = {
  propertyName: string;
  error: { message: string };
};

type RequiredResult = {
  propertyName: string;
  isRequired: boolean;
  hasRequiredError: boolean;
};
```

## Metadata helpers

```ts
import {
  clearTouchedFieldsForPrefix,
  getValidationMeta,
  markFieldTouched,
  resetValidationMeta,
  shouldShowFieldErrors
} from '@validation-rules-engine/core';
```

Most applications use these indirectly through Angular directives or React hooks.
