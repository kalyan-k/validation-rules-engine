# Migration and Compatibility

`@validation-rules-engine/react` 1.0 is tested with React and React DOM 19.2, TypeScript 5.8, and `@validation-rules-engine/core` 1.x.

## From direct core orchestration

Keep existing policy classes/objects and rule chains. Replace application-owned registration, error refresh, and model metadata plumbing with:

1. `ValidationRulesProvider` near the application/form root.
2. `useValidationForm` for locally controlled models or `useValidationRules` for externally owned state.
3. `useValidationField` for each control.
4. `ValidationMessage` and `ValidationSummary` or equivalent custom markup.

The model still receives `validationResults`, `requiredResults`, and core metadata, so domain code that reads those established shapes remains compatible.

## From Angular

Policies can preserve their `ValidatorHelper` chains. Angular directives, services, Observables, and display strategies do not move into React. Replace directive bindings with field hooks and React events. Replace Angular DI policy registration with provider/hook registration.

## React 18

The implementation uses APIs available in React 18, including `useSyncExternalStore`, but React 18 is not claimed by this milestone because the package is tested and peer-declared against React 19.2. Test before widening the peer range.

## Controlled state

If an existing form mutates models in place, migrate to `useValidationForm.setFieldValue`, immutable reducers, or an external store that emits updates. Direct engine methods still accept the established mutable validation result shape.

## Package format

The package is ESM with declarations and modern-bundler exports. CommonJS-only environments require an ESM-capable bundler or loader.
