# React with Context API

## Overview

The Context API showcase uses only React's built-in provider, consumer hook, and reducer to share a form model across a subtree.

[Open Live Showcase](http://127.0.0.1:4204/state/context)

## Using @validation-rules/react

Context API is useful when a form draft must be shared by a bounded subtree. Keep the reducer pure and run Validation Rules in components that consume the context model.

### Step 1 — Install Package

Install the React adapter and Core package.

```bash
npm install @validation-rules/react @validation-rules/core
```

No additional state library is required.

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "@validation-rules/react": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Compose your form context provider with `ValidationRulesProvider`.

```tsx
import { ValidationRulesProvider } from '@validation-rules/react';
import { ProfileStateProvider } from './ProfileStateContext';

export function ProfileRoute() {
  return (
    <ValidationRulesProvider>
      <ProfileStateProvider>
        <ContextProfileForm />
      </ProfileStateProvider>
    </ValidationRulesProvider>
  );
}
```

### Step 3 — Create Validation Policy

The policy targets the context model value.

```tsx
import type { ValidationPolicy, ValidationTarget } from '@validation-rules/react';

export type ProfileModel = ValidationTarget & {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  attested: boolean;
};

export const profilePolicy: ValidationPolicy = {
  addValidations: (v) => [
    v.validateFor('firstName').isRequired('First name is required'),
    v.validateFor('lastName').isRequired('Last name is required'),
    v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
    v.validateFor('role').isRequired('Role is required'),
    v.validateFor('attested').isChecked('Attestation is required')
  ]
};
```

### Step 4 — Register Policy

Register policies in the consuming form component.

```tsx
const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
const groups = useMemo(() => [
  { name: 'profileGroup', policies: ['profile'], formGroups: ['profile'], fields: ['firstName', 'lastName', 'email', 'role', 'attested'] }
], []);

const validation = useValidationRules({ model: state.model, policies, policyNames: ['profile'], groups });
```

### Step 5 — Connect State Management

Use a reducer with explicit actions. Do not dispatch validation side effects from the reducer.

```tsx
import { createContext, PropsWithChildren, useContext, useMemo, useReducer } from 'react';
import type { ProfileModel } from './profilePolicy';

const initialModel: ProfileModel = { firstName: '', lastName: '', email: '', role: '', attested: false };

type Action =
  | { type: 'fieldChanged'; path: keyof ProfileModel; value: unknown }
  | { type: 'validated'; model: ProfileModel }
  | { type: 'reset' };

function reducer(state: { model: ProfileModel }, action: Action) {
  if (action.type === 'fieldChanged') return { model: { ...state.model, [action.path]: action.value } };
  if (action.type === 'validated') return { model: structuredClone(action.model) };
  return { model: initialModel };
}

const ProfileStateContext = createContext<{ state: { model: ProfileModel }; dispatch: React.Dispatch<Action> } | null>(null);
```

### Step 6 — Bind Controls

Consume context state, dispatch changes, and show adapter messages.

```tsx
const { state, dispatch } = useProfileState();
const emailErrors = validation.getFieldErrors('email');

<input value={state.model.email} onChange={(event) => dispatch({ type: 'fieldChanged', path: 'email', value: event.target.value })} onBlur={() => void validation.validateField('email')} />
<ValidationMessage errors={emailErrors} />
<ValidationSummary errors={validation.errors} />
```

### Step 7 — Validate

Validate from the consumer component and dispatch a validated model action.

```tsx
async function submit() {
  const snapshot = await validation.validate({ showAllErrors: true });
  dispatch({ type: 'validated', model: validation.model });
  if (snapshot.isValid) await saveProfile(validation.model);
}

await validation.validateField('email');
await validation.validateGroup('profileGroup');
```

### Step 8 — Reset

Clear adapter metadata and dispatch reset.

```tsx
function reset() {
  validation.clear();
  dispatch({ type: 'reset' });
}
```

Policy cleanup is automatic on unmount.

```tsx
useEffect(() => () => dispatch({ type: 'reset' }), [dispatch]);
```

### Step 9 — Best Practices

Memoize provider values so consumers do not rerender unnecessarily.

```tsx
const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
return <ProfileStateContext.Provider value={value}>{children}</ProfileStateContext.Provider>;
```

Keep the provider close to the form subtree, split read/write contexts for very large forms, and avoid treating one global context as an application-wide store.

### Step 10 — Complete Working Example

```tsx
import { FormEvent, useMemo } from 'react';
import { ValidationMessage, ValidationSummary, useValidationRules } from '@validation-rules/react';
import { ProfileModel, profilePolicy } from './profilePolicy';

export function ContextProfileForm() {
  const { state, dispatch } = useProfileState();
  const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
  const validation = useValidationRules<ProfileModel>({ model: state.model, policies, policyNames: ['profile'] });
  const emailErrors = validation.getFieldErrors('email');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const snapshot = await validation.validate({ showAllErrors: true });
    dispatch({ type: 'validated', model: validation.model });
    if (snapshot.isValid) await saveProfile(validation.model);
  }

  return (
    <form onSubmit={submit} noValidate>
      <ValidationSummary errors={validation.errors} />
      <input aria-label="Email" value={state.model.email} onChange={(event) => dispatch({ type: 'fieldChanged', path: 'email', value: event.target.value })} onBlur={() => void validation.validateField('email')} />
      <ValidationMessage errors={emailErrors} />
      <label><input type="checkbox" checked={state.model.attested} onChange={(event) => dispatch({ type: 'fieldChanged', path: 'attested', value: event.target.checked })} /> Attested</label>
      <button type="submit">Save</button>
      <button type="button" onClick={() => { validation.clear(); dispatch({ type: 'reset' }); }}>Reset</button>
    </form>
  );
}

function ProfileStateProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, { model: initialModel });
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <ProfileStateContext.Provider value={value}>{children}</ProfileStateContext.Provider>;
}
```

## Installation

```bash
npm install @validation-rules/react @validation-rules/core
```

## Package imports

```tsx
import { createContext, useContext, useReducer } from 'react';
import { useValidationRules, useValidationField, ValidationSummary } from '@validation-rules/react';
```

## Provider setup

Create a dedicated form context instead of placing every form in a global application context.

```tsx
const ProfileContext = createContext(null);

function ProfileProvider({ children }) {
  const [model, dispatch] = useReducer(profileReducer, initialModel);
  return <ProfileContext.Provider value={{ model, dispatch }}>{children}</ProfileContext.Provider>;
}
```

## Policy registration

Read the context model and pass it to validation hooks.

```tsx
const { model, dispatch } = useContext(ProfileContext);
const form = useValidationRules({ model, policies, policyNames: ['profile'], groups });
```

## Policy unregistration

Policies unregister when the route unmounts. Reset context state when users cancel or leave a draft.

## Validation lifecycle

Dispatch model updates, then validate fields, groups, or the full form through the bridge.

## Validation Groups

Reducers work well when group state and form state should be reset through one action.

## Validation Summary

```tsx
<ValidationSummary errors={form.errors} />
```

## Custom Inputs

Custom inputs can dispatch field changes and read validation metadata from `useValidationField`.

## Performance Considerations

Split contexts or memoize provider values for large forms. Context updates all consumers that read the provider value.

## Troubleshooting

If unrelated components rerender, move the form context closer to the route or split model/actions into separate contexts.

## Complete code example

```tsx
function profileReducer(model, action) {
  switch (action.type) {
    case 'field':
      return { ...model, [action.path]: action.value };
    case 'reset':
      return { firstName: '', email: '' };
    default:
      return model;
  }
}

function ProfileForm() {
  const { model, dispatch } = useProfileContext();
  const form = useExternalValidationBridge({
    model,
    setFieldValue: (path, value) => dispatch({ type: 'field', path, value }),
    policies,
    policyNames: ['profile']
  });

  return <ProfileFields form={form} onReset={() => dispatch({ type: 'reset' })} />;
}
```

## Architecture

A dedicated Context Provider owns a reducer. A consumer bridge maps reducer state and dispatch into the same contract consumed by the shared validation pages.

```text
Controls → reducer dispatch → Context Provider → consumers → validation hooks
```

## Why use this state management library

Choose Context when a form must be shared through a bounded component subtree and adding a state library would not provide enough value.

## How Validation Rules integrates

The provider owns model updates; validation hooks consume the current context model. Neither the context nor reducer depends on the validation engine.

## Best Practices

- Keep the provider close to its consumers.
- Memoize provider values and callbacks.
- Use a reducer for explicit complex transitions.
- Split contexts when consumers need unrelated update frequencies.

## Common Mistakes

- Using one application-wide context for every form.
- Recreating provider values unnecessarily.
- Treating Context itself as a complete state-management architecture.
- Dispatching validation side effects from the reducer.

## Code Example

```tsx
const FormContext = createContext(null);
const [state, dispatch] = useReducer(reducer, { model: initialModel, revision: 0 });

<FormContext.Provider value={{ state, dispatch }}>
  <Form />
</FormContext.Provider>
```

[Open Live Showcase](http://127.0.0.1:4204/state/context)
