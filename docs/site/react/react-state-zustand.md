# React with Zustand

## Overview

The Zustand showcase uses a route-scoped external store and focused selectors. Validation behavior is identical to the local and Redux examples.

[Open Live Showcase](http://127.0.0.1:4204/state/zustand)

## Using @validation-rules/react

With Zustand, keep the store focused on model transitions and let React components call Validation Rules hooks with the selected model.

### Step 1 — Install Package

Install the React adapter, Core package, and Zustand.

```bash
npm install @validation-rules/react @validation-rules/core zustand
```

Zustand is independent of the adapter and should be versioned with the application.

```json
{
  "dependencies": {
    "zustand": "^5.0.0",
    "@validation-rules/react": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Wrap the route in `ValidationRulesProvider`. Provide a scoped Zustand store when independent draft instances are needed.

```tsx
import { createContext, useContext, useMemo } from 'react';
import { createStore, useStore } from 'zustand';
import { ValidationRulesProvider } from '@validation-rules/react';

const ProfileStoreContext = createContext<ReturnType<typeof createProfileStore> | null>(null);

export function ProfileRoute() {
  const store = useMemo(() => createProfileStore(), []);
  return (
    <ValidationRulesProvider>
      <ProfileStoreContext.Provider value={store}>
        <ZustandProfileForm />
      </ProfileStoreContext.Provider>
    </ValidationRulesProvider>
  );
}
```

### Step 3 — Create Validation Policy

Keep policies separate from Zustand store creation.

```tsx
import type { ValidationPolicy, ValidationTarget } from '@validation-rules/react';

export type ProfileModel = ValidationTarget & {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  subscribed: boolean;
};

export const profilePolicy: ValidationPolicy = {
  addValidations: (v) => [
    v.validateFor('firstName').isRequired('First name is required'),
    v.validateFor('lastName').isRequired('Last name is required'),
    v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
    v.validateFor('country').isRequired('Country is required'),
    v.validateFor('subscribed').isChecked('Subscription confirmation is required')
  ]
};
```

### Step 4 — Register Policy

Use `useValidationRules` for policy registration and automatic cleanup.

```tsx
const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
const validation = useValidationRules({
  model,
  policies,
  policyNames: ['profile'],
  groups: [{ name: 'profileGroup', policies: ['profile'], formGroups: ['profile'], fields: profileFields }]
});
```

### Step 5 — Connect State Management

Create a store with explicit field, commit, and reset actions.

```tsx
const initialModel: ProfileModel = { firstName: '', lastName: '', email: '', country: '', subscribed: false };
const profileFields = ['firstName', 'lastName', 'email', 'country', 'subscribed'] as const;

function createProfileStore() {
  return createStore<{
    model: ProfileModel;
    change(path: keyof ProfileModel, value: unknown): void;
    commit(model: ProfileModel): void;
    reset(): void;
  }>((set) => ({
    model: initialModel,
    change: (path, value) => set((state) => ({ model: { ...state.model, [path]: value } })),
    commit: (model) => set({ model: structuredClone(model) }),
    reset: () => set({ model: initialModel })
  }));
}
```

### Step 6 — Bind Controls

Select only the model and actions that the component uses.

```tsx
const store = useProfileStore();
const model = useStore(store, (state) => state.model);
const change = useStore(store, (state) => state.change);
const emailErrors = validation.getFieldErrors('email');

<input value={model.email} onChange={(event) => change('email', event.target.value)} onBlur={() => void validation.validateField('email')} />
<ValidationMessage errors={emailErrors} />
<ValidationSummary errors={validation.errors} />
```

### Step 7 — Validate

Run validation against the selected model, then commit the decorated clone to Zustand.

```tsx
async function submit() {
  const snapshot = await validation.validate({ showAllErrors: true });
  commit(structuredClone(validation.model));
  if (snapshot.isValid) await saveProfile(validation.model);
}

await validation.validateGroup('profileGroup');
```

### Step 8 — Reset

Clear validation state before resetting the store.

```tsx
function reset() {
  validation.clear();
  resetStore();
}
```

Policy cleanup is owned by the hook; store cleanup is owned by the scoped provider.

```tsx
useEffect(() => () => resetStore(), [resetStore]);
```

### Step 9 — Best Practices

Use scoped stores for form drafts unless persistence is intentional.

```tsx
const email = useStore(store, (state) => state.model.email);
const errorCount = validation.errors.length;
```

Avoid subscribing every field component to the entire store, keep actions immutable, and do not put the Validation Engine into Zustand.

### Step 10 — Complete Working Example

```tsx
import { FormEvent, useMemo } from 'react';
import { useStore } from 'zustand';
import { ValidationMessage, ValidationSummary, useValidationRules } from '@validation-rules/react';
import { ProfileModel, profilePolicy } from './profilePolicy';

export function ZustandProfileForm() {
  const store = useProfileStore();
  const model = useStore(store, (state) => state.model);
  const change = useStore(store, (state) => state.change);
  const commit = useStore(store, (state) => state.commit);
  const resetStore = useStore(store, (state) => state.reset);
  const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
  const validation = useValidationRules<ProfileModel>({ model, policies, policyNames: ['profile'] });
  const emailErrors = validation.getFieldErrors('email');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const snapshot = await validation.validate({ showAllErrors: true });
    commit(validation.model);
    if (snapshot.isValid) await saveProfile(validation.model);
  }

  return (
    <form onSubmit={submit} noValidate>
      <ValidationSummary errors={validation.errors} />
      <input aria-label="Email" value={model.email} onChange={(event) => change('email', event.target.value)} onBlur={() => void validation.validateField('email')} />
      <ValidationMessage errors={emailErrors} />
      <label><input type="checkbox" checked={model.subscribed} onChange={(event) => change('subscribed', event.target.checked)} /> Subscribe</label>
      <button type="submit">Save</button>
      <button type="button" onClick={() => { validation.clear(); resetStore(); }}>Reset</button>
    </form>
  );
}

function useProfileStore() {
  const store = useContext(ProfileStoreContext);
  if (!store) throw new Error('ProfileStoreContext is missing');
  return store;
}
```

## Installation

```bash
npm install @validation-rules/react zustand
```

## Package imports

```tsx
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { useValidationRules, useValidationField, ValidationSummary } from '@validation-rules/react';
```

## Provider setup

Create a scoped vanilla store for the form route and expose it through React context.

```tsx
const store = createStore(() => ({ model: initialModel, revision: 0 }));
```

## Policy registration

Select the model from Zustand and pass it to the validation hook.

```tsx
const model = useStore(store, (state) => state.model);
const form = useValidationRules({ model, policies, policyNames: ['profile'], groups });
```

## Policy unregistration

Validation policies unregister when the hook unmounts. Dispose the route-scoped store by unmounting its provider.

## Validation lifecycle

Use store actions for value changes and call validation helpers for field, group, and submit workflows.

## Validation Groups

Zustand works well with derived selectors for group badges because selectors can subscribe to just the group status or error count.

## Validation Summary

```tsx
<ValidationSummary errors={form.errors} />
```

## Custom Inputs

Bridge `useValidationField` metadata with a store action:

```tsx
const field = useValidationField(formBridge, 'email');
store.getState().setField('email', nextValue);
```

## Performance Considerations

Use selectors instead of subscribing every component to the full model. Keep large generated forms route-scoped.

## Troubleshooting

If controls do not update, confirm the selector reads the same store instance as the provider and the action replaces the nested value immutably.

## Complete code example

```tsx
const profileStore = createStore((set) => ({
  model: { firstName: '', email: '' },
  setField: (path, value) => set((state) => ({ model: { ...state.model, [path]: value } })),
  reset: () => set({ model: { firstName: '', email: '' } })
}));

function ProfileForm() {
  const model = useStore(profileStore, (state) => state.model);
  const setField = useStore(profileStore, (state) => state.setField);
  const form = useExternalValidationBridge({ model, setField, policies, policyNames: ['profile'] });

  return <ProfileFields form={form} onReset={() => profileStore.getState().reset()} />;
}
```

## Architecture

A vanilla Zustand store exposes the model, a revision, and replace/reset actions. React's `useStore` hook subscribes to each selected value before the shared bridge passes the model to the validation hooks.

```text
Controls → Zustand actions → vanilla store → focused selectors → validation
```

## Why use this state management library

Choose Zustand for a small external store, concise actions, scoped or shared state, and selector-based rendering without Redux-style ceremony.

## How Validation Rules integrates

The store owns model transitions. Validation policies and groups are registered by React hooks and never imported by the Zustand store.

## Best Practices

- Create a scoped store per form when drafts must be isolated.
- Select only the state a component renders.
- Keep actions explicit and immutable.
- Reset model and validation state as one user operation.

## Common Mistakes

- Creating a store during every render.
- Subscribing every field to the whole store.
- Mutating nested data without returning a new model.
- Reusing singleton draft state between unrelated forms.

## Code Example

```tsx
const store = createStore((set) => ({
  model: initialModel,
  replaceModel: (model) => set((state) => ({ model, revision: state.revision + 1 })),
  resetModel: (model) => set((state) => ({ model, revision: state.revision + 1 }))
}));

const model = useStore(store, (state) => state.model);
```

[Open Live Showcase](http://127.0.0.1:4204/state/zustand)
