# Validation Rules Engine Core

`@validation-rules-engine/core` is the framework-independent core of Validation Rules Engine (VRE). It contains validation contracts, fluent validators, built-in rules, results, and model-state utilities without importing Angular or another UI framework.

## Installation

```bash
npm install @validation-rules-engine/core underscore
```

`underscore` is a peer dependency retained for validator compatibility.

## Capabilities

- Define reusable policies with `ValidationPolicy`
- Build field validators with `ValidatorHelper`
- Apply built-in rules through `ValidationHelper`
- Represent field, required, form-group, and policy-group results
- Track touched fields and determine when errors should be visible
- Reset validation metadata and identify validation-failure shapes

## Example

```typescript
import {
  ValidationPolicy,
  Validator,
  ValidatorHelper
} from '@validation-rules-engine/core';

export class AccountPolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor('email')
        .isRequired('Email is required')
        .isEmail('Enter a valid email address')
    ];
  }
}
```

## Public API

- `ValidationPolicy`, `ValidationModel`
- `Validator`, `ValidatorHelper`, `ValidationHelper`
- `ValidationError`, `ValidationResult`, and `RequiredResult`
- `FormGroupStatus`, `PolicyGroupConfig`, and `ControlType`
- validation metadata, touched-state, reset, and failure-shape utilities

The Angular expression-based policy executor remains in `@validation-rules-engine/angular` because it relies on Angular's expression parser. Extracting it requires a separately tested parser abstraction.

## Architecture

Core is the lowest-level package. Framework adapters may depend on it; it never depends on an adapter. The repository enforces this rule with `npm run architecture:verify`.

## License

MIT - see [LICENSE](LICENSE).
