# React with Redux Toolkit

## Overview

The Redux Toolkit showcase proves that validation policies can remain framework-neutral while a Redux slice owns form transitions and memoized selectors expose the active model and derived state.

[Open Live Showcase](http://127.0.0.1:4204/state/redux-toolkit)

## Using @validation-rules-engine/react

Redux Toolkit should own form transitions and serializable draft state. `@validation-rules-engine/react` should stay in React components/hooks, where it can register policies and validate the selected draft.

### Step 1 — Install Package

Install the React adapter, Core package, Redux Toolkit, and React Redux.

```bash
npm install @validation-rules-engine/react @validation-rules-engine/core @reduxjs/toolkit react-redux
```

Keep React Redux and Redux Toolkit versions aligned with your React version.

```json
{
  "dependencies": {
    "@reduxjs/toolkit": "^2.0.0",
    "react-redux": "^9.0.0",
    "@validation-rules-engine/react": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Wrap the feature with both Redux and Validation Rules Engine providers.

```tsx
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { ValidationRulesProvider } from '@validation-rules-engine/react';
import { profileReducer } from './profileSlice';

const store = configureStore({ reducer: { profile: profileReducer } });

export function ProfileRoute() {
  return (
    <Provider store={store}>
      <ValidationRulesProvider>
        <ReduxProfileForm />
      </ValidationRulesProvider>
    </Provider>
  );
}
```

### Step 3 — Create Validation Policy

Policies validate the selected Redux draft.

```tsx
import type { ValidationPolicy, ValidationTarget } from '@validation-rules-engine/react';

export type ProfileDraft = ValidationTarget & {
  firstName: string;
  lastName: string;
  email: string;
  accepted: boolean;
};

export const profilePolicy: ValidationPolicy = {
  addValidations: (v) => [
    v.validateFor('firstName').isRequired('First name is required'),
    v.validateFor('lastName').isRequired('Last name is required'),
    v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
    v.validateFor('accepted').isChecked('Acceptance is required')
  ]
};
```

### Step 4 — Register Policy

Use `useValidationRules` to register policies and groups for the selected Redux model.

```tsx
const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
const groups = useMemo(() => [
  { name: 'profileGroup', policies: ['profile'], formGroups: ['profile'], fields: ['firstName', 'lastName', 'email', 'accepted'] }
], []);

const validation = useValidationRules({ model, policies, policyNames: ['profile'], groups });
```

### Step 5 — Connect State Management

Reducers store values only. Validation metadata is committed only after the component validates a draft.

```tsx
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ProfileDraft } from './profilePolicy';

const initialState: ProfileDraft = { firstName: '', lastName: '', email: '', accepted: false };

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    fieldChanged: (state, action: PayloadAction<{ path: keyof ProfileDraft; value: unknown }>) => {
      state[action.payload.path] = action.payload.value as never;
    },
    validated: (_state, action: PayloadAction<ProfileDraft>) => action.payload,
    reset: () => initialState
  }
});

export const profileActions = profileSlice.actions;
export const profileReducer = profileSlice.reducer;
export const selectProfile = (state: { profile: ProfileDraft }) => state.profile;
```

### Step 6 — Bind Controls

Bind selected state to inputs and dispatch changes. Use adapter helpers for messages and summaries.

```tsx
const emailErrors = validation.getFieldErrors('email');

<input
  aria-describedby="email-errors"
  aria-invalid={emailErrors.length > 0}
  value={model.email}
  onChange={(event) => dispatch(profileActions.fieldChanged({ path: 'email', value: event.target.value }))}
  onBlur={() => void validation.validateField('email')}
/>
<ValidationMessage id="email-errors" errors={emailErrors} />
<ValidationSummary errors={validation.errors} />
```

### Step 7 — Validate

Validate in the component and dispatch a validated snapshot if the model should keep validation metadata.

```tsx
async function submit() {
  const snapshot = await validation.validate({ showAllErrors: true });
  dispatch(profileActions.validated(structuredClone(validation.model)));
  if (snapshot.isValid) {
    await saveProfile(validation.model);
  }
}

await validation.validateField('email');
await validation.validateGroup('profileGroup');
```

### Step 8 — Reset

Clear validation state and dispatch the slice reset action.

```tsx
function reset() {
  validation.clear();
  dispatch(profileActions.reset());
}
```

Policy unregistration is automatic when the hook unmounts.

```tsx
useEffect(() => () => dispatch(profileActions.reset()), [dispatch]);
```

### Step 9 — Best Practices

Keep reducers pure and keep the validation engine out of Redux state.

```tsx
type SerializableProfileState = Pick<ProfileDraft, 'firstName' | 'lastName' | 'email' | 'accepted'>;
```

Use selectors for derived UI state, dispatch semantic actions, and validate in thunks/effects only when the validation operation is part of an async workflow.

### Step 10 — Complete Working Example

```tsx
import { FormEvent, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ValidationMessage, ValidationSummary, useValidationRules } from '@validation-rules-engine/react';
import { ProfileDraft, profilePolicy } from './profilePolicy';
import { profileActions, selectProfile } from './profileSlice';

export function ReduxProfileForm() {
  const dispatch = useDispatch();
  const model = useSelector(selectProfile);
  const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
  const groups = useMemo(() => [{ name: 'profileGroup', policies: ['profile'], formGroups: ['profile'], fields: ['firstName', 'lastName', 'email', 'accepted'] }], []);
  const validation = useValidationRules<ProfileDraft>({ model, policies, policyNames: ['profile'], groups });
  const emailErrors = validation.getFieldErrors('email');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const snapshot = await validation.validate({ showAllErrors: true });
    dispatch(profileActions.validated(structuredClone(validation.model)));
    if (snapshot.isValid) await saveProfile(validation.model);
  }

  return (
    <form onSubmit={submit} noValidate>
      <ValidationSummary errors={validation.errors} />
      <input
        aria-label="Email"
        value={model.email}
        onChange={(event) => dispatch(profileActions.fieldChanged({ path: 'email', value: event.target.value }))}
        onBlur={() => void validation.validateField('email')}
      />
      <ValidationMessage errors={emailErrors} />
      <label>
        <input type="checkbox" checked={model.accepted} onChange={(event) => dispatch(profileActions.fieldChanged({ path: 'accepted', value: event.target.checked }))} />
        Accept terms
      </label>
      <button type="submit">Save</button>
      <button type="button" onClick={() => { validation.clear(); dispatch(profileActions.reset()); }}>Reset</button>
    </form>
  );
}
```

## Installation

```bash
npm install @validation-rules-engine/react @reduxjs/toolkit react-redux
```

## Package imports

```tsx
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { useValidationRules, useValidationField, ValidationSummary } from '@validation-rules-engine/react';
```

## Provider setup

Create a scoped store for the form route and render it under both Redux and Validation Rules Engine providers.

```tsx
<Provider store={store}>
  <ValidationRulesProvider>
    <ProfileForm />
  </ValidationRulesProvider>
</Provider>
```

## Policy registration

Read the Redux model with a selector and pass it to `useValidationRules`.

```tsx
const model = useSelector(selectProfileDraft);
const validation = useValidationRules({ model, policies, policyNames: ['profile'], groups });
```

## Policy unregistration

The React hook unregisters policies on unmount. Redux cleanup should reset the draft slice when leaving the route if the draft should not persist.

## Validation lifecycle

Dispatch field updates, then call `validation.validateField(path)` for focused validation or `validation.validate({ showAllErrors: true })` for submit.

## Validation Groups

Store group status on the validated model or derive section badges from `validation.errors` and the group field list.

## Validation Summary

```tsx
<ValidationSummary errors={validation.errors} />
```

## Custom Inputs

Use `useValidationField` for metadata and dispatch the Redux action from `onChange`.

```tsx
const field = useValidationField(formBridge, 'email', { validateOnChange: true });
dispatch(profileSlice.actions.fieldChanged({ path: 'email', value }));
```

## Performance Considerations

Keep selectors focused, store serializable form values, and avoid placing mutable validation metadata in long-lived global state unless the route owns cleanup.

## Troubleshooting

If Redux Toolkit freezes state, clone or serialize the form model before validation metadata is written. Keep policies stable so registration does not churn on every dispatch.

## Complete code example

```tsx
const slice = createSlice({
  name: 'profile',
  initialState: { firstName: '', email: '' },
  reducers: {
    fieldChanged(state, action) {
      state[action.payload.path] = action.payload.value;
    },
    reset: () => ({ firstName: '', email: '' })
  }
});

function ProfileForm() {
  const dispatch = useDispatch();
  const model = useSelector((state) => state.profile);
  const form = useReduxValidationBridge({
    model,
    setFieldValue: (path, value) => dispatch(slice.actions.fieldChanged({ path, value })),
    policies: [{ name: 'profile', policy: profilePolicy }],
    policyNames: ['profile']
  });

  return (
    <form onSubmit={form.handleSubmit(async () => save(model))}>
      <ValidationSummary errors={form.errors} />
      <ConnectedInput form={form} path="email" label="Email" />
      <button type="submit">Save</button>
    </form>
  );
}
```

## Architecture

`configureStore` hosts a dedicated slice. Slice actions replace or reset the serializable model, and selectors read the model, revision, and populated-value count. The React adapter receives the selected model through the shared showcase bridge.

```text
Controls → slice actions → Redux store → selectors → validation hooks → core
```

## Why use this state management library

Choose Redux Toolkit when form state participates in a larger application workflow, explicit events matter, Redux DevTools are valuable, or several distant features consume the same draft.

## How Validation Rules Engine integrates

Validation remains outside reducers. Reducers store form transitions; hooks run policies against the selected model and dispatch the next immutable model after field changes.

## Best Practices

- Keep reducers pure and state serializable.
- Use memoized selectors for model decoding and derived data.
- Scope transient forms unless global persistence is intentional.
- Dispatch semantic reset and replace actions.

## Common Mistakes

- Running validation side effects inside reducers.
- Selecting the entire application state for every input.
- Storing non-serializable engine instances in Redux.
- Confusing server entities with editable drafts.

## Code Example

```tsx
const slice = createSlice({
  name: 'validationShowcase',
  initialState,
  reducers: {
    modelReplaced(state, action) { state.serializedModel = JSON.stringify(action.payload); },
    modelReset(state, action) { state.serializedModel = JSON.stringify(action.payload); }
  }
});

const model = useSelector(selectModel);
dispatch(slice.actions.modelReplaced(nextModel));
```

[Open Live Showcase](http://127.0.0.1:4204/state/redux-toolkit)
