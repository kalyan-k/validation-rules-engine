# React Local State

## Overview

Local state is the baseline integration. The form model stays in the route subtree, while `@validation-rules/react` handles policy lifecycle, field state, messages, summaries, groups, and submission.

[Open Live Showcase](http://127.0.0.1:4204/state/local-state)

## Using @validation-rules/react

Local state is the reference consumption pattern for `@validation-rules/react`: React owns a controlled model, while Validation Rules owns policy registration, focused field state, summaries, group validation, submit validation, and cleanup.

### Step 1 — Install Package

Install the React adapter and Core package.

```bash
npm install @validation-rules/react @validation-rules/core
```

The adapter expects React to be supplied by your application.

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@validation-rules/react": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Wrap the route or application with `ValidationRulesProvider`.

```tsx
import { ValidationRulesProvider } from '@validation-rules/react';
import { ProfileForm } from './ProfileForm';

export function ProfileRoute() {
  return (
    <ValidationRulesProvider configuration={{ validateOnBlur: true }}>
      <ProfileForm />
    </ValidationRulesProvider>
  );
}
```

### Step 3 — Create Validation Policy

Define a typed model and policy with Core paths.

```tsx
import type { ValidationPolicy, ValidationTarget } from '@validation-rules/react';

export type ProfileModel = ValidationTarget & {
  firstName: string;
  lastName: string;
  email: string;
  acceptedTerms: boolean;
};

export const profilePolicy: ValidationPolicy = {
  addValidations: (v) => [
    v.validateFor('firstName').isRequired('First name is required'),
    v.validateFor('lastName').isRequired('Last name is required'),
    v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
    v.validateFor('acceptedTerms').isChecked('Terms must be accepted')
  ]
};
```

### Step 4 — Register Policy

`useValidationForm` registers policies while the component is mounted and unregisters them automatically on unmount.

```tsx
const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
const groups = useMemo(() => [
  { name: 'profileGroup', policies: ['profile'], formGroups: ['profile'], fields: ['firstName', 'lastName', 'email', 'acceptedTerms'] }
], []);

const form = useValidationForm<ProfileModel>({
  initialModel,
  policies,
  policyNames: ['profile'],
  groups
});
```

### Step 5 — Connect State Management

For local state, `useValidationForm` owns the controlled model and exposes immutable update helpers.

```tsx
const firstName = useValidationField(form, 'firstName');
await form.setFieldValue('email', 'ada@example.com', true);
form.setModel({ ...form.model, lastName: 'Lovelace' });
```

### Step 6 — Bind Controls

Use `useValidationField` for native input props and accessible message IDs.

```tsx
const email = useValidationField(form, 'email', { validateOnChange: true });

return (
  <label htmlFor={email.id}>
    Email
    <input type="email" {...email.inputProps} />
    <ValidationMessage id={email.messageId} errors={email.visibleErrors} />
  </label>
);
```

### Step 7 — Validate

Use the form helpers for submit, field, group, and all-policy validation.

```tsx
const onSubmit = form.handleSubmit(
  async (model) => await saveProfile(model),
  async () => focusFirstInvalidField(form.errors)
);

await form.validateField('email');
await form.validateGroup('profileGroup');
await form.validate({ showAllErrors: true });
```

### Step 8 — Reset

Reset the controlled model and clear validation metadata together.

```tsx
function resetProfile() {
  form.reset(initialModel);
}

function clearEmail() {
  form.clear(['email']);
}
```

### Step 9 — Best Practices

Keep policy and group arrays stable so registration is not repeated on every render.

```tsx
const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
const policyNames = useMemo(() => ['profile'], []);
```

Prefer route-local state for drafts, immutable updates through `setFieldValue`, and `form.reset()` when cancelling.

### Step 10 — Complete Working Example

```tsx
import { useMemo } from 'react';
import { ValidationMessage, ValidationRulesProvider, ValidationSummary, useValidationField, useValidationForm } from '@validation-rules/react';
import { ProfileModel, profilePolicy } from './profile.policy';

const initialModel: ProfileModel = { firstName: '', lastName: '', email: '', acceptedTerms: false };

function ProfileForm() {
  const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
  const groups = useMemo(() => [{ name: 'profileGroup', policies: ['profile'], formGroups: ['profile'], fields: ['firstName', 'lastName', 'email', 'acceptedTerms'] }], []);
  const form = useValidationForm<ProfileModel>({ initialModel, policies, policyNames: ['profile'], groups });
  const firstName = useValidationField(form, 'firstName');
  const email = useValidationField(form, 'email', { validateOnChange: true });
  const accepted = useValidationField(form, 'acceptedTerms');

  return (
    <form onSubmit={form.handleSubmit(async (model) => saveProfile(model))} noValidate>
      <ValidationSummary errors={form.errors} />
      <input aria-label="First name" {...firstName.inputProps} />
      <ValidationMessage id={firstName.messageId} errors={firstName.visibleErrors} />
      <input aria-label="Email" type="email" {...email.inputProps} />
      <ValidationMessage id={email.messageId} errors={email.visibleErrors} />
      <label><input type="checkbox" {...accepted.checkboxProps} /> Accept terms</label>
      <button type="submit">Save</button>
      <button type="button" onClick={() => form.reset(initialModel)}>Reset</button>
    </form>
  );
}

export function ProfilePage() {
  return <ValidationRulesProvider><ProfileForm /></ValidationRulesProvider>;
}

async function saveProfile(model: ProfileModel): Promise<void> {
  await fetch('/api/profile', { method: 'POST', body: JSON.stringify(model) });
}
```

## Installation

Local State needs only React and the adapter:

```bash
npm install @validation-rules/react @validation-rules/core
```

## Package imports

```tsx
import { useMemo, useReducer, useState } from 'react';
import { ValidationRulesProvider, useValidationForm, useValidationField, ValidationSummary } from '@validation-rules/react';
```

## Provider setup

Wrap the application or route with `ValidationRulesProvider`, then let the form own its model through `useState`.

```tsx
<ValidationRulesProvider>
  <ProfileForm />
</ValidationRulesProvider>
```

## Policy registration

`useValidationForm` registers policies while the component is mounted.

```tsx
const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
const form = useValidationForm({ initialModel, policies, policyNames: ['profile'] });
```

## Policy unregistration

No manual cleanup is required for stable policies. The hook unregisters them when the form unmounts. For generated policies, memoize the generated policy and let the dependency change drive replacement.

## Validation lifecycle

Use `useValidationField` for blur/change behavior, `form.validateField(path)` for targeted checks, `form.validateGroup(name)` for sections, and `form.handleSubmit()` for submit.

## Validation Groups

```tsx
const groups = [{ name: 'contactGroup', policies: ['profile'], formGroups: ['contact'], fields: ['email', 'phone'] }];
```

## Validation Summary

```tsx
<ValidationSummary errors={form.errors} />
```

## Custom Inputs

```tsx
function EmailInput({ form }) {
  const field = useValidationField(form, 'email', { validateOnChange: true });
  return <input type="email" {...field.inputProps} />;
}
```

## Performance Considerations

Keep policy arrays stable, update only the changed field path, and avoid lifting form state higher than the route needs.

## Troubleshooting

If a field never validates, compare the policy path with the local model shape. If errors remain after reset, call `form.reset(nextModel)` instead of only calling `setModel`.

## Complete code example

```tsx
const initialModel = { firstName: '', email: '' };
const profilePolicy = {
  addValidations(helper) {
    return [
      helper.validateFor('firstName').isRequired('First name is required'),
      helper.validateFor('email').isRequired('Email is required').isEmail('Invalid email')
    ];
  }
};

function ProfileForm() {
  const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
  const form = useValidationForm({ initialModel, policies, policyNames: ['profile'] });
  const firstName = useValidationField(form, 'firstName');
  const email = useValidationField(form, 'email', { validateOnChange: true });

  return (
    <form onSubmit={form.handleSubmit(async () => save(form.model))}>
      <ValidationSummary errors={form.errors} />
      <input aria-label="First name" {...firstName.inputProps} />
      <input aria-label="Email" type="email" {...email.inputProps} />
      <button type="submit">Save</button>
    </form>
  );
}
```

## Architecture

The showcase uses `useState` for the model and `useReducer` for an explicit revision counter. A thin bridge presents the same model contract used by every state-management example.

```text
Form controls → useState model → React validation hooks → core policies
                    ↘ useReducer revision
```

## Why use this state management library

Choose local state for forms whose data is owned by one component tree, does not need cross-route persistence, and benefits from the smallest dependency surface.

## How Validation Rules integrates

Pass the current model to the validation hooks and publish each immutable field update back to local state. Policy and group definitions remain stable and independent of state ownership.

## Best Practices

- Keep policies outside render or memoize dynamic policies.
- Use immutable model updates for nested paths.
- Keep server data and temporary form edits separate when cancel is required.
- Reset validation state and the model together.

## Common Mistakes

- Lifting state higher than its consumers need.
- Recreating policy arrays on every render.
- Mutating nested values without a state transition.
- Treating local state as a cross-page cache.

## Code Example

```tsx
const [model, setModel] = useState(initialModel);
const [revision, changed] = useReducer((value) => value + 1, 0);

function replaceModel(nextModel) {
  setModel(nextModel);
  changed();
}
```

[Open Live Showcase](http://127.0.0.1:4204/state/local-state)
