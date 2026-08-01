# @validation-rules-engine/react

Idiomatic React integration for Validation Rules Engine (VRE), built on the framework-independent `@validation-rules-engine/core` policy model. The package supplies an engine, provider, focused hooks, accessible message components, Strict Mode-safe policy ownership, and async-safe field validation without imposing a visual design system or state-management library.

## Installation

```bash
npm install @validation-rules-engine/core @validation-rules-engine/react react react-dom
```

React and React DOM 19.2, plus `@validation-rules-engine/core` 1.x, are peer dependencies.

## Quick start

```tsx
import {
  ValidatorHelper,
  type ValidationPolicy,
  ValidationMessage,
  ValidationRulesProvider,
  ValidationSummary,
  useValidationField,
  useValidationForm
} from '@validation-rules-engine/react';

const accountPolicy: ValidationPolicy = {
  addValidations(helper: ValidatorHelper) {
    return [
      helper.validateFor('email')
        .isRequired('Email is required.')
        .isEmail('Enter a valid email.')
    ];
  }
};

function AccountForm() {
  const form = useValidationForm({
    initialModel: { email: '' },
    policies: [{ name: 'account', policy: accountPolicy }],
    policyNames: ['account']
  });
  const email = useValidationField(form, 'email');

  return (
    <form onSubmit={form.handleSubmit(async (model) => save(model))} noValidate>
      <ValidationSummary errors={form.errors} />
      <label htmlFor={email.id}>Email</label>
      <input type="email" {...email.inputProps} />
      <ValidationMessage id={email.messageId} errors={email.visibleErrors} />
      <button type="submit">Save</button>
    </form>
  );
}

export function App() {
  return <ValidationRulesProvider><AccountForm /></ValidationRulesProvider>;
}
```

## Public hooks and components

- `useValidationRules` is the low-level model API for validation, groups, errors, clearing, and programmatic touch state.
- `useValidationForm` owns an immutable controlled model and provides field updates, submit handling, reset, and dirty tracking.
- `useValidationField` returns neutral native-input and checkbox props plus focused error/touched/dirty state.
- `ValidationMessage` and `ValidationSummary` render accessible errors without visual styling.
- `ValidationEngine` is available for advanced registration, independent contexts, dynamic policies, and programmatic validation.

Custom controls call `form.setFieldValue(path, value, shouldValidate)` and consume the field hook's ARIA state. This works with Material UI, Chakra UI, Ant Design, Bootstrap, Tailwind, or an internal design system.

## Testing

Use React Testing Library normally and wrap components in `ValidationRulesProvider`. The package's source test helper `renderWithValidation` shows the pattern; consumers should generally keep a local equivalent in their own test suite.

Full guides and API details are in the [React documentation](http://127.0.0.1:4201/docs/react-overview). Working examples are in the [React showcase](http://127.0.0.1:4204/).

## License

MIT
