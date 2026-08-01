# React Architecture

The adapter is layered so validation semantics stay framework independent and React concerns remain isolated.

## Package boundary

```text
Components and application state
            ↓
Provider + hooks + components
            ↓
ValidationEngine registration and subscriptions
            ↓
Core Validator, ValidatorHelper, policy contracts, and metadata
```

`@validation-rules-engine/core` defines `ValidationPolicy`, `Validator`, rules, result shapes, required-state metadata, touch state, and group status contracts. `@validation-rules-engine/react` executes those validators, handles asynchronous results, owns registrations, and publishes model-specific revisions to React.

## Engine state

Validation errors and required results remain on the model using the established core shape. Engine listeners and revision counters are held in weak maps, so subscribing to a model does not create a global model registry or keep an abandoned model alive.

## Rendering flow

1. A hook registers policies in an effect.
2. A field update creates the next controlled model.
3. Field or form validation executes relevant core rules.
4. The engine applies only the newest result for each property path.
5. The model-specific revision changes and subscribed hooks render current errors.

## Async safety

Rules may return a value, a promise, or an observable-like object with `subscribe`. Each field receives a monotonic validation token. An older asynchronous result cannot overwrite a newer validation of the same field.

## Server rendering

Package imports do not read `window`, `document`, or layout state. Provider and hook registration uses React effects, which do not run during server rendering. Hydrate beneath the same provider and use deterministic initial models and field paths.

Read [Provider](/docs/react-provider), [Core Hooks](/docs/react-hooks), and [Performance](/docs/react-performance) for the lifecycle and rendering details.
