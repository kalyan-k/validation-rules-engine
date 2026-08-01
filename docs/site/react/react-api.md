# React API Reference

This page lists the supported public surface of `@validation-rules-engine/react` 1.0.

## ValidationEngine

- `registerPolicy(name, policy): () => void` acquires a named policy and returns idempotent cleanup.
- `replacePolicy(name, policy): void` replaces validators for dynamic workflows.
- `unregisterPolicy(name): void` forcibly removes a policy.
- `hasPolicy(name): boolean` checks case-insensitive registration.
- `registerGroup(group): () => void` registers a group and returns cleanup.
- `unregisterGroup(name): void` removes a group.
- `subscribe(model, listener): () => void` subscribes to one model.
- `getRevision(model): number` returns its monotonic revision.
- `getSnapshot(model): ValidationSnapshot` returns copied errors/results and validity.
- `getErrors(model, path?): ValidationResult[]` filters current errors.
- `validate(model, policyNames?, options?): Promise<ValidationSnapshot>` validates policies or a group.
- `validateField(model, path, policyNames?): Promise<ValidationSnapshot>` validates one path.
- `validateGroup(model, name): Promise<ValidationSnapshot>` validates a registered group.
- `touch(model, path): void`, `clear(model, paths?): void`, and `notify(model): void` update adapter state.

## Provider and context

- `ValidationRulesProvider`
- `useValidationRulesContext`
- `ValidationRulesProviderProps`
- `ValidationRulesContextValue`

Provider props are `children`, optional `engine`, and optional `{ validateOnBlur, validateOnChange }` configuration.

## Hooks

- `useValidationRules(options): UseValidationRulesResult`
- `useValidationForm(options): UseValidationFormResult`
- `useValidationField(form, propertyPath, options?): ValidationFieldResult`

Read [Core Hooks](/docs/react-hooks) for signatures and lifecycle.

## Components

- `ValidationMessage({ errors, id?, live?, ...divProps })`
- `ValidationSummary({ errors, heading?, linkErrors?, ...sectionProps })`

Both return `null` for an empty error list and accept neutral HTML attributes/class names.

## React types

- `PolicyRegistration`
- `ValidationGroupRegistration`
- `ValidationRulesConfiguration`
- `ValidationSnapshot`
- `ValidationTarget`
- `ValidateOptions`
- `UseValidationRulesOptions`
- `UseValidationFormOptions`
- `ValidationFieldOptions`
- `ValidationSubmitHandler`

## Re-exported core symbols

The adapter re-exports policy-authoring and result symbols needed by React consumers: `ValidationHelper`, `Validator`, `ValidatorHelper`, `ValidationPolicy`, `ValidationModel`, `ValidationError`, `ValidationResult`, `RequiredResult`, `FormGroupStatus`, `PolicyGroupConfig`, and core validation-metadata helpers.

Internal path cloning, context instances, engine maps, and test setup are not public exports.
