# React Overview

`@validation-rules-engine/react` is the first-class React adapter for Validation Rules Engine (VRE). It turns framework-neutral core policies into provider-scoped hooks and accessible, style-neutral error components while preserving core rule semantics.

## What the adapter provides

- A `ValidationRulesProvider` that owns or receives a `ValidationEngine`.
- `useValidationRules` for low-level model and engine access.
- `useValidationForm` for an immutable controlled model, submit handling, reset, and dirty state.
- `useValidationField` for field errors, touched/dirty state, native input props, and checkbox props.
- `ValidationMessage` and `ValidationSummary` for accessible feedback.
- Multiple policies, groups, nested paths, conditional rules, dynamic arrays, async-safe validation, Strict Mode-safe registration, and independent forms.

## Dependency direction

```text
React application
        ↓
@validation-rules-engine/react
        ↓
@validation-rules-engine/core
```

Core contains rules and framework-independent metadata. The React package owns hooks, context, lifecycle, subscriptions, controlled-state helpers, and rendering. Core never imports React, and the Angular adapter remains independent.

## Design-system independence

The adapter does not render inputs or ship a visual theme. Use native controls, Material UI, Chakra UI, Ant Design, Bootstrap, Tailwind, or custom controls. Field hooks expose values, event handlers, ARIA attributes, and errors without dictating markup.

## Choose an example

- [Simple form](http://127.0.0.1:4204/state/local-state/simple) for blur, change, submit, reset, and summary behavior.
- [Complex form](http://127.0.0.1:4204/state/local-state/complex) for nested paths, arrays, policies, and groups.
- [Performance form](http://127.0.0.1:4204/state/local-state/performance) for generated fields and live measurements.

## Compare state management integrations

Every state module contains an overview plus the same Simple, Complex, and Performance forms:

- [Local State](/docs/react-state-local-state)
- [Redux Toolkit](/docs/react-state-redux-toolkit)
- [Zustand](/docs/react-state-zustand)
- [Jotai](/docs/react-state-jotai)
- [Recoil](/docs/react-state-recoil)
- [MobX](/docs/react-state-mobx)
- [Context API](/docs/react-state-context)

Continue with [Installation](/docs/react-installation) or jump to the [Quick Start](/docs/react-quick-start).
