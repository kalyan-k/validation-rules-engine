# React with MobX

## Overview

The MobX showcase uses observable state, computed data, actions, and an observer bridge. Validation policies remain ordinary core policies.

[Open Live Showcase](http://127.0.0.1:4204/state/mobx)

## Using @validation-rules-engine/react

MobX stores can own observable draft state, while `@validation-rules-engine/react` stays in the observer component that reads the current model and performs validation.

### Step 1 — Install Package

Install the React adapter, Core package, MobX, and MobX React bindings.

```bash
npm install @validation-rules-engine/react @validation-rules-engine/core mobx mobx-react-lite
```

Keep MobX bindings aligned with your React version.

```json
{
  "dependencies": {
    "mobx": "^6.0.0",
    "mobx-react-lite": "^4.0.0",
    "@validation-rules-engine/react": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Provide Validation Rules Engine and a route-scoped MobX store.

```tsx
import { createContext, useContext, useMemo } from 'react';
import { ValidationRulesProvider } from '@validation-rules-engine/react';
import { ProfileStore } from './ProfileStore';

const ProfileStoreContext = createContext<ProfileStore | null>(null);

export function ProfileRoute() {
  const store = useMemo(() => new ProfileStore(), []);
  return (
    <ValidationRulesProvider>
      <ProfileStoreContext.Provider value={store}>
        <MobxProfileForm />
      </ProfileStoreContext.Provider>
    </ValidationRulesProvider>
  );
}
```

### Step 3 — Create Validation Policy

Policies validate the observable model shape, not the store class itself.

```tsx
import type { ValidationPolicy, ValidationTarget } from '@validation-rules-engine/react';

export type ProfileModel = ValidationTarget & {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  consent: boolean;
};

export const profilePolicy: ValidationPolicy = {
  addValidations: (v) => [
    v.validateFor('firstName').isRequired('First name is required'),
    v.validateFor('lastName').isRequired('Last name is required'),
    v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
    v.validateFor('country').isRequired('Country is required'),
    v.validateFor('consent').isChecked('Consent is required')
  ]
};
```

### Step 4 — Register Policy

Use stable policy arrays inside the `observer` component.

```tsx
const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
const validation = useValidationRules({ model: store.model, policies, policyNames: ['profile'] });
```

Policy unregistration happens automatically when the component unmounts.

```tsx
useEffect(() => () => validation.clear(), [validation]);
```

### Step 5 — Connect State Management

Use MobX actions for field changes, validated commits, and resets.

```tsx
import { makeAutoObservable, observable } from 'mobx';
import type { ProfileModel } from './profilePolicy';

const emptyProfile = (): ProfileModel => ({ firstName: '', lastName: '', email: '', country: '', consent: false });

export class ProfileStore {
  model: ProfileModel = emptyProfile();

  constructor() {
    makeAutoObservable(this, { model: observable.ref });
  }

  change(path: keyof ProfileModel, value: unknown): void {
    this.model = { ...this.model, [path]: value };
  }

  commit(model: ProfileModel): void {
    this.model = structuredClone(model);
  }

  reset(): void {
    this.model = emptyProfile();
  }
}
```

### Step 6 — Bind Controls

Wrap the form with `observer`, read observable state, and use adapter messages.

```tsx
const emailErrors = validation.getFieldErrors('email');

<input value={store.model.email} onChange={(event) => store.change('email', event.target.value)} onBlur={() => void validation.validateField('email')} />
<ValidationMessage errors={emailErrors} />
<ValidationSummary errors={validation.errors} />
```

### Step 7 — Validate

Validate the observable model and commit the decorated clone through an action.

```tsx
async function submit() {
  const snapshot = await validation.validate({ showAllErrors: true });
  store.commit(validation.model);
  if (snapshot.isValid) await saveProfile(validation.model);
}

await validation.validateField('email');
await validation.validateGroup('profileGroup');
```

### Step 8 — Reset

Clear adapter state and reset the store in the same user operation.

```tsx
function reset() {
  validation.clear();
  store.reset();
}
```

If a MobX store is route-scoped, no global reset is needed after unmount.

```tsx
useEffect(() => () => store.reset(), [store]);
```

### Step 9 — Best Practices

Keep validation policy registration out of store constructors.

```tsx
class ProfileStore {
  get hasValidationErrors(): boolean {
    return (this.model.validationResults?.length ?? 0) > 0;
  }
}
```

Use `observable.ref` when replacing draft models as a unit, keep store methods semantic, and wrap only components that need observable reads with `observer`.

### Step 10 — Complete Working Example

```tsx
import { FormEvent, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { ValidationMessage, ValidationSummary, useValidationRules } from '@validation-rules-engine/react';
import { ProfileModel, profilePolicy } from './profilePolicy';

export const MobxProfileForm = observer(function MobxProfileForm() {
  const store = useProfileStore();
  const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
  const validation = useValidationRules<ProfileModel>({ model: store.model, policies, policyNames: ['profile'] });
  const emailErrors = validation.getFieldErrors('email');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const snapshot = await validation.validate({ showAllErrors: true });
    store.commit(validation.model);
    if (snapshot.isValid) await saveProfile(validation.model);
  }

  return (
    <form onSubmit={submit} noValidate>
      <ValidationSummary errors={validation.errors} />
      <input aria-label="Email" value={store.model.email} onChange={(event) => store.change('email', event.target.value)} onBlur={() => void validation.validateField('email')} />
      <ValidationMessage errors={emailErrors} />
      <label><input type="checkbox" checked={store.model.consent} onChange={(event) => store.change('consent', event.target.checked)} /> Consent</label>
      <button type="submit">Save</button>
      <button type="button" onClick={() => { validation.clear(); store.reset(); }}>Reset</button>
    </form>
  );
});

function useProfileStore(): ProfileStore {
  const store = useContext(ProfileStoreContext);
  if (!store) throw new Error('ProfileStoreContext is missing');
  return store;
}
```

## Installation

```bash
npm install @validation-rules-engine/react mobx mobx-react-lite
```

## Package imports

```tsx
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useValidationRules, useValidationField, ValidationSummary } from '@validation-rules-engine/react';
```

## Provider setup

Create a route-scoped MobX store and provide it through context.

```tsx
class ProfileStore {
  model = initialModel;
  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }
}
```

## Policy registration

Observer components read the observable model and pass the current snapshot to validation hooks.

```tsx
const form = useValidationRules({ model: store.model, policies, policyNames: ['profile'], groups });
```

## Policy unregistration

The hook unregisters policies on unmount. Dispose route-scoped stores by unmounting their provider.

## Validation lifecycle

MobX actions update values. Validation helpers evaluate the current model and summaries render in observer components.

## Validation Groups

Computed values are useful for group badges and populated-value counts.

## Validation Summary

```tsx
<ValidationSummary errors={form.errors} />
```

## Custom Inputs

Custom inputs can call store actions in `onChange` and use `useValidationField` for invalid state and messages.

## Performance Considerations

Use actions for updates and computed values for readouts. Avoid mutating frozen or serialized state from another library.

## Troubleshooting

If observer components do not refresh, confirm the component is wrapped in `observer` and the model field is observable.

## Complete code example

```tsx
class ProfileStore {
  model = { firstName: '', email: '' };

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setField(path, value) {
    this.model = { ...this.model, [path]: value };
  }
}

const ProfileForm = observer(({ store }) => {
  const form = useExternalValidationBridge({
    model: store.model,
    setFieldValue: store.setField,
    policies,
    policyNames: ['profile']
  });

  return <ProfileFields form={form} />;
});
```

## Architecture

A route-scoped class is made observable with `makeAutoObservable`. Bound actions replace or reset the model, a computed getter derives populated values, and an `observer` component connects the store to React.

```text
Controls → MobX actions → observable store → observer → validation hooks
```

## Why use this state management library

Choose MobX when an application favors observable domain models, computed values, and action-oriented object design.

## How Validation Rules Engine integrates

MobX owns reactive model transitions. The bridge exposes the current plain model to validation hooks; policy registration stays in the React lifecycle.

## Best Practices

- Use actions for meaningful model transitions.
- Keep the form model reference observable when updates are immutable.
- Wrap the narrowest rendering bridge with `observer`.
- Scope draft stores to their intended lifetime.

## Common Mistakes

- Mixing multiple MobX runtime instances.
- Deep-observing data that is always replaced as a unit.
- Forgetting `observer` around consumers.
- Putting policy registration inside store constructors.

## Code Example

```tsx
class FormStore {
  model = initialModel;
  revision = 0;
  constructor() { makeAutoObservable(this, { model: observable.ref }); }
  replaceModel(model) { this.model = model; this.revision += 1; }
  get populatedValues() { return countPopulatedValues(this.model); }
}
```

[Open Live Showcase](http://127.0.0.1:4204/state/mobx)
