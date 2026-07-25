# React with Jotai

## Overview

The Jotai showcase models form state as atoms and uses a derived atom for live populated-value state. The validation layer consumes ordinary model values.

[Open Live Showcase](http://127.0.0.1:4204/state/jotai)

## Using @validation-rules/react

Jotai works well when form state is naturally atomic. Keep atoms responsible for draft transitions, and run `@validation-rules/react` hooks in components that read the current model.

### Step 1 — Install Package

Install the React adapter, Core package, and Jotai.

```bash
npm install @validation-rules/react @validation-rules/core jotai
```

Jotai does not need any adapter-specific setup.

```json
{
  "dependencies": {
    "jotai": "^2.0.0",
    "@validation-rules/react": "^1.0.0"
  }
}
```

### Step 2 — Configure Project

Wrap the route with `ValidationRulesProvider`. Add a Jotai `Provider` when you need route-scoped atom state.

```tsx
import { Provider as JotaiProvider } from 'jotai';
import { ValidationRulesProvider } from '@validation-rules/react';

export function ProfileRoute() {
  return (
    <JotaiProvider>
      <ValidationRulesProvider>
        <JotaiProfileForm />
      </ValidationRulesProvider>
    </JotaiProvider>
  );
}
```

### Step 3 — Create Validation Policy

Policies validate the full model atom value.

```tsx
import type { ValidationPolicy, ValidationTarget } from '@validation-rules/react';

export type ProfileModel = ValidationTarget & {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  approved: boolean;
};

export const profilePolicy: ValidationPolicy = {
  addValidations: (v) => [
    v.validateFor('firstName').isRequired('First name is required'),
    v.validateFor('lastName').isRequired('Last name is required'),
    v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email'),
    v.validateFor('country').isRequired('Country is required'),
    v.validateFor('approved').isChecked('Approval is required')
  ]
};
```

### Step 4 — Register Policy

`useValidationRules` registers policy objects and group definitions from the component lifecycle.

```tsx
const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
const validation = useValidationRules({
  model,
  policies,
  policyNames: ['profile'],
  groups: [{ name: 'profileGroup', policies: ['profile'], formGroups: ['profile'], fields: ['firstName', 'lastName', 'email', 'country', 'approved'] }]
});
```

### Step 5 — Connect State Management

Use one model atom plus write atoms for domain transitions.

```tsx
import { atom } from 'jotai';

const initialModel: ProfileModel = { firstName: '', lastName: '', email: '', country: '', approved: false };

export const profileModelAtom = atom<ProfileModel>(initialModel);
export const profileErrorCountAtom = atom((get) => get(profileModelAtom).validationResults?.length ?? 0);
export const profileFieldChangedAtom = atom(null, (get, set, update: { path: keyof ProfileModel; value: unknown }) => {
  set(profileModelAtom, { ...get(profileModelAtom), [update.path]: update.value });
});
export const profileResetAtom = atom(null, (_get, set) => set(profileModelAtom, initialModel));
```

### Step 6 — Bind Controls

Read and write atoms in the form component, then use adapter message/summary components.

```tsx
const [model, setModel] = useAtom(profileModelAtom);
const [, changeField] = useAtom(profileFieldChangedAtom);
const emailErrors = validation.getFieldErrors('email');

<input value={model.email} onChange={(event) => changeField({ path: 'email', value: event.target.value })} onBlur={() => void validation.validateField('email')} />
<ValidationMessage errors={emailErrors} />
<ValidationSummary errors={validation.errors} />
```

### Step 7 — Validate

Validate the atom value and set the decorated model back into the atom.

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

Clear Validation Rules state, then dispatch the reset atom.

```tsx
function reset() {
  validation.clear();
  resetProfile();
}
```

The hook unregisters policies when the component unmounts.

```tsx
useEffect(() => () => resetProfile(), [resetProfile]);
```

### Step 9 — Best Practices

Define atoms outside components and use write atoms for meaningful transitions.

```tsx
export const profileCanSubmitAtom = atom((get) => {
  const model = get(profileModelAtom);
  return Boolean(model.email && model.approved);
});
```

Do not store the validation engine in atoms. Store plain draft data and let adapter hooks derive validation state.

### Step 10 — Complete Working Example

```tsx
import { FormEvent, useMemo } from 'react';
import { useAtom } from 'jotai';
import { ValidationMessage, ValidationSummary, useValidationRules } from '@validation-rules/react';
import { ProfileModel, profilePolicy } from './profilePolicy';
import { profileFieldChangedAtom, profileModelAtom, profileResetAtom } from './profileAtoms';

export function JotaiProfileForm() {
  const [model, setModel] = useAtom(profileModelAtom);
  const [, changeField] = useAtom(profileFieldChangedAtom);
  const [, resetProfile] = useAtom(profileResetAtom);
  const policies = useMemo(() => [{ name: 'profile', policy: profilePolicy }], []);
  const validation = useValidationRules<ProfileModel>({ model, policies, policyNames: ['profile'] });
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
      <input aria-label="Email" value={model.email} onChange={(event) => changeField({ path: 'email', value: event.target.value })} onBlur={() => void validation.validateField('email')} />
      <ValidationMessage errors={emailErrors} />
      <label><input type="checkbox" checked={model.approved} onChange={(event) => changeField({ path: 'approved', value: event.target.checked })} /> Approved</label>
      <button type="submit">Save</button>
      <button type="button" onClick={() => { validation.clear(); resetProfile(); }}>Reset</button>
    </form>
  );
}
```

## Installation

```bash
npm install @validation-rules/react jotai
```

## Package imports

```tsx
import { atom, Provider, useAtom, useAtomValue } from 'jotai';
import { useValidationRules, useValidationField, ValidationSummary } from '@validation-rules/react';
```

## Provider setup

Use a route-scoped Jotai provider when the form should not share atoms globally.

```tsx
<Provider>
  <ProfileForm />
</Provider>
```

## Policy registration

Read the model atom and register policies through `useValidationRules`.

```tsx
const model = useAtomValue(profileAtom);
const validation = useValidationRules({ model, policies, policyNames: ['profile'], groups });
```

## Policy unregistration

Policies unregister with the hook. Reset route atoms when leaving the page if the draft should not persist.

## Validation lifecycle

Update primitive atoms or a model atom, then run field, group, or submit validation from the bridge.

## Validation Groups

Use derived atoms for group counts and status readouts.

```tsx
const errorCountAtom = atom((get) => get(profileAtom).validationResults?.length ?? 0);
```

## Validation Summary

```tsx
<ValidationSummary errors={validation.errors} />
```

## Custom Inputs

Custom controls can write through atom setters while reading validation metadata from `useValidationField`.

## Performance Considerations

Split large models into atoms only when it improves rendering. For policy validation, still provide a complete model snapshot.

## Troubleshooting

If validation sees stale data, make sure the model passed to the hook is reconstructed after atom updates and not mutated in place.

## Complete code example

```tsx
const profileAtom = atom({ firstName: '', email: '' });
const setFieldAtom = atom(null, (get, set, { path, value }) => {
  set(profileAtom, { ...get(profileAtom), [path]: value });
});

function ProfileForm() {
  const model = useAtomValue(profileAtom);
  const [, setField] = useAtom(setFieldAtom);
  const form = useExternalValidationBridge({
    model,
    setFieldValue: (path, value) => setField({ path, value }),
    policies,
    policyNames: ['profile']
  });

  return <ProfileFields form={form} />;
}
```

## Architecture

Primitive atoms hold the form model and revision. A derived atom reads the model and calculates display-only state. A scoped Jotai Provider prevents form drafts from leaking between routes.

```text
Controls → model atom → derived atoms → validation hooks → core policies
```

## Why use this state management library

Choose Jotai when state is naturally atomic, derived dependencies are important, or components need focused subscriptions composed from small units.

## How Validation Rules integrates

Atom writes publish immutable model transitions. The validation hooks register policies and evaluate the current atom value without putting the engine or policies into atoms.

## Best Practices

- Scope atom stores for independent form instances.
- Derive display state instead of synchronizing duplicate atoms.
- Keep policy objects stable.
- Use write atoms for domain-specific transitions in larger forms.

## Common Mistakes

- Creating atom definitions during every consumer render.
- Splitting tightly coupled form data into too many atoms.
- Storing validation engine instances in atoms.
- Duplicating derivable error counts.

## Code Example

```tsx
const modelAtom = atom(initialModel);
const populatedAtom = atom((get) => countPopulatedValues(get(modelAtom)));

const [model, setModel] = useAtom(modelAtom);
const populated = useAtomValue(populatedAtom);
```

[Open Live Showcase](http://127.0.0.1:4204/state/jotai)
