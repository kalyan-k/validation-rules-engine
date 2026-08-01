# Quick Start

This example uses a core policy, a provider, a controlled field, inline feedback, and submit validation.

## Define a policy

```tsx
import {
  type ValidationPolicy,
  type Validator,
  type ValidatorHelper
} from '@validation-rules-engine/react';

const accountPolicy: ValidationPolicy = {
  addValidations(helper: ValidatorHelper): Validator[] {
    return [
      helper.validateFor('email')
        .isRequired('Email is required.')
        .isEmail('Enter a valid email.')
    ];
  }
};
```

## Create the form

```tsx
import {
  ValidationMessage,
  ValidationSummary,
  useValidationField,
  useValidationForm
} from '@validation-rules-engine/react';

const policies = [{ name: 'account', policy: accountPolicy }];

function AccountForm() {
  const form = useValidationForm({
    initialModel: { email: '' },
    policies,
    policyNames: ['account']
  });
  const email = useValidationField(form, 'email', {
    validateOnBlur: true
  });

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(async (model) => save(model))}
    >
      <ValidationSummary errors={form.errors} />
      <label htmlFor={email.id}>Email</label>
      <input type="email" {...email.inputProps} />
      <ValidationMessage
        id={email.messageId}
        errors={email.visibleErrors}
      />
      <button type="submit">Save</button>
    </form>
  );
}
```

## Add the provider

```tsx
import { ValidationRulesProvider } from '@validation-rules-engine/react';

export function App() {
  return (
    <ValidationRulesProvider>
      <AccountForm />
    </ValidationRulesProvider>
  );
}
```

`inputProps` carries the controlled value, change/blur handlers, `aria-invalid`, and `aria-describedby`. Use `checkboxProps` for checkboxes. Submit sets the core `showAllErrors` metadata before calling the valid or invalid callback.

## Common mistakes

- Do not call hooks outside `ValidationRulesProvider`.
- Keep policy arrays stable with module constants or `useMemo` unless the policy shape is intentionally dynamic.
- Use the exact policy name in `policyNames`.
- Use full nested paths such as `address.city`.

Run this pattern in the [Simple form showcase](http://127.0.0.1:4204/state/local-state/simple).
