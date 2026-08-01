# React with Recoil

## Overview

The Recoil showcase is provided for teams maintaining existing Recoil applications. It shows atoms, selectors, and the same Validation Rules Engine lifecycle as every other React example.

The upstream Recoil repository is archived. Prefer an actively maintained option for new applications, and treat this page as integration and migration support.

[Open Live Showcase](http://127.0.0.1:4204/state/recoil)

## Using @validation-rules-engine/react

Use this guide when you already have Recoil in an application. Keep Validation Rules Engine in React components/hooks and keep Recoil atoms focused on plain draft state.

### Step 1 — Install Package

Install the React adapter, Core package, and Recoil.

```bash
npm install @validation-rules-engine/react @validation-rules-engine/core recoil
```

Recoil has been archived by its maintainers, so prefer this integration for existing apps rather than new long-lived greenfield architecture.

```json
{
  "dependencies": {
    "recoil": "^0.7.7",
    "@validation-rules-engine/react": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Wrap the route with `RecoilRoot` and `ValidationRulesProvider`.

```tsx
import { RecoilRoot } from 'recoil';
import { ValidationRulesProvider } from '@validation-rules-engine/react';

export function ProfileRoute() {
  return (
    <RecoilRoot>
      <ValidationRulesProvider>
        <RecoilProfileForm />
      </ValidationRulesProvider>
    </RecoilRoot>
  );
}
```

### Step 3 — Create Validation Policy

Policies target the atom model shape.

```tsx
import type { ValidationPolicy, ValidationTarget } from '@validation-rules-engine/react';

export type ProfileModel = ValidationTarget & {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  complianceAccepted: boolean;
};

export const profilePolicy: ValidationPolicy = {
  addValidations: (v) => [
    v.validateFor('firstName').isRequired('First name is required'),
    v.validateFor('lastName').isRequired('Last name is required'),
    v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
    v.validateFor('country').isRequired('Country is required'),
    v.validateFor('complianceAccepted').isChecked('Compliance acceptance is required')
  ]
};
```

### Step 4 — Register Policy

Register policies through `useValidationRules`. The hook unregisters them on unmount.

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

Create stable atoms. Allow mutability only when your validation metadata is written onto the model object.

```tsx
import { atom, selector } from 'recoil';

const initialProfile: ProfileModel = { firstName: '', lastName: '', email: '', country: '', complianceAccepted: false };
export const profileFields = ['firstName', 'lastName', 'email', 'country', 'complianceAccepted'] as const;

export const profileModelState = atom<ProfileModel>({
  key: 'profileModelState',
  default: initialProfile,
  dangerouslyAllowMutability: true
});

export const profileErrorCountState = selector({
  key: 'profileErrorCountState',
  get: ({ get }) => get(profileModelState).validationResults?.length ?? 0
});
```

### Step 6 — Bind Controls

Use `useRecoilState` for draft values and adapter helpers for validation messages.

```tsx
const [model, setModel] = useRecoilState(profileModelState);
const emailErrors = validation.getFieldErrors('email');

<input
  value={model.email}
  onChange={(event) => setModel((current) => ({ ...current, email: event.target.value }))}
  onBlur={() => void validation.validateField('email')}
/>
<ValidationMessage errors={emailErrors} />
<ValidationSummary errors={validation.errors} />
```

### Step 7 — Validate

Validate the atom value and store the decorated clone.

```tsx
async function submit() {
  const snapshot = await validation.validate({ showAllErrors: true });
  setModel(structuredClone(validation.model));
  if (snapshot.isValid) await saveProfile(validation.model);
}

await validation.validateField('email');
await validation.validateGroup('profileGroup');
```

### Step 8 — Reset

Clear adapter state and replace the atom value.

```tsx
function reset() {
  validation.clear();
  setModel(initialProfile);
}
```

Recoil atom cleanup is controlled by `RecoilRoot`; adapter policy cleanup is controlled by the hook.

```tsx
useEffect(() => () => setModel(initialProfile), [setModel]);
```

### Step 9 — Best Practices

Use selectors for derived display values instead of duplicating validation status.

```tsx
const invalidFieldsState = selector({
  key: 'profileInvalidFieldsState',
  get: ({ get }) => (get(profileModelState).validationResults ?? []).map((result) => result.propertyName)
});
```

Plan a migration path for long-lived products, keep atom keys stable, and isolate any React compatibility shims outside validation code.

### Step 10 — Complete Working Example

```tsx
import { FormEvent, useMemo } from 'react';
import { useRecoilState } from 'recoil';
import { ValidationMessage, ValidationSummary, useValidationRules } from '@validation-rules-engine/react';
import { ProfileModel, profilePolicy } from './profilePolicy';
import { profileFields, profileModelState } from './profileRecoilState';

export function RecoilProfileForm() {
  const [model, setModel] = useRecoilState(profileModelState);
  const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
  const groups = useMemo(() => [{ name: 'profileGroup', policies: ['profile'], formGroups: ['profile'], fields: [...profileFields] }], []);
  const validation = useValidationRules<ProfileModel>({ model, policies, policyNames: ['profile'], groups });
  const emailErrors = validation.getFieldErrors('email');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const snapshot = await validation.validate({ showAllErrors: true });
    setModel(structuredClone(validation.model));
    if (snapshot.isValid) await saveProfile(validation.model);
  }

  return (
    <form onSubmit={submit} noValidate>
      <ValidationSummary errors={validation.errors} />
      <input aria-label="Email" value={model.email} onChange={(event) => setModel((current) => ({ ...current, email: event.target.value }))} onBlur={() => void validation.validateField('email')} />
      <ValidationMessage errors={emailErrors} />
      <label>
        <input type="checkbox" checked={model.complianceAccepted} onChange={(event) => setModel((current) => ({ ...current, complianceAccepted: event.target.checked }))} />
        Compliance accepted
      </label>
      <button type="submit">Save</button>
      <button type="button" onClick={() => { validation.clear(); setModel({ firstName: '', lastName: '', email: '', country: '', complianceAccepted: false }); }}>Reset</button>
    </form>
  );
}
```

## Installation

```bash
npm install @validation-rules-engine/react recoil
```

## Package imports

```tsx
import { atom, selector, RecoilRoot, useRecoilState, useRecoilValue } from 'recoil';
import { useValidationRules, useValidationField, ValidationSummary } from '@validation-rules-engine/react';
```

## Provider setup

Wrap the route with `RecoilRoot` and initialize the model atom.

```tsx
<RecoilRoot initializeState={({ set }) => set(profileAtom, initialModel)}>
  <ProfileForm />
</RecoilRoot>
```

## Policy registration

Read the atom value and register policies with the React adapter.

```tsx
const model = useRecoilValue(profileAtom);
const form = useValidationRules({ model, policies, policyNames: ['profile'], groups });
```

## Policy unregistration

The hook unregisters policies on unmount. Reset atoms when leaving long-lived Recoil roots.

## Validation lifecycle

Field updates write to atoms. Validation helpers evaluate the current atom snapshot and publish metadata through the bridge.

## Validation Groups

Use selectors for group status summaries when existing Recoil screens already use derived state.

## Validation Summary

```tsx
<ValidationSummary errors={form.errors} />
```

## Custom Inputs

Custom inputs should write through `useRecoilState` or a setter hook and use validation metadata for ARIA and message rendering.

## Performance Considerations

Keep the form route boundary small. Recoil is best shown here for existing codebases; new projects should weigh maintenance status before choosing it.

## Troubleshooting

If React compatibility issues appear, isolate Recoil usage behind the route provider and keep validation policies independent of Recoil APIs.

## Complete code example

```tsx
const profileAtom = atom({ key: 'profile', default: { firstName: '', email: '' } });
const populatedCount = selector({
  key: 'profilePopulatedCount',
  get: ({ get }) => Object.values(get(profileAtom)).filter(Boolean).length
});

function ProfileForm() {
  const [model, setModel] = useRecoilState(profileAtom);
  const form = useExternalValidationBridge({
    model,
    setFieldValue: (path, value) => setModel((current) => ({ ...current, [path]: value })),
    policies,
    policyNames: ['profile']
  });

  return <ProfileFields form={form} populated={useRecoilValue(populatedCount)} />;
}
```

## Architecture

A `RecoilRoot` initializes a model atom and revision atom. A selector derives populated-value state. Because Recoil 0.7 checks a React 18 internal dispatcher name, the React 19 showcase includes a narrow app-only compatibility alias; no adapter or engine API is changed.

```text
Controls → Recoil atoms → selector → validation hooks → core policies
```

## Why use this state management library

Choose this integration when an existing Recoil application needs Validation Rules Engine. For greenfield work, account for the project's archived status before adopting it.

## How Validation Rules Engine integrates

Atom setters own model transitions. Recoil selectors provide derived UI state, while validation policies stay outside the state graph.

## Best Practices

- Keep `RecoilRoot` ownership explicit.
- Use selectors for derived values rather than duplicated atoms.
- Isolate the React 19 compatibility layer to the application.
- Plan a migration path for long-lived products.

## Common Mistakes

- Ignoring Recoil's archived maintenance status.
- Freezing values that the current validation engine annotates during evaluation.
- Creating atom keys dynamically without stable uniqueness.
- Storing engine instances inside atoms.

## Code Example

```tsx
const modelState = atom({
  key: 'vreShowcaseModel',
  default: initialModel,
  dangerouslyAllowMutability: true
});
const populatedState = selector({
  key: 'vreShowcasePopulated',
  get: ({ get }) => countPopulatedValues(get(modelState))
});
```

[Open Live Showcase](http://127.0.0.1:4204/state/recoil)
