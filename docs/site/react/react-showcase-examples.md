# React Showcase Examples

Live entry points under the React Showcase:

| Area | URL | Related docs |
| --- | --- | --- |
| Showcase home / local state | [http://127.0.0.1:4204/state/local-state](http://127.0.0.1:4204/state/local-state) | [Local State](/docs/react-state-local-state) |
| Simple form | [http://127.0.0.1:4204/state/local-state/simple](http://127.0.0.1:4204/state/local-state/simple) | [Field Validation](/docs/react-field-validation), [Form Validation](/docs/react-form-validation) |
| Complex form | [http://127.0.0.1:4204/state/local-state/complex](http://127.0.0.1:4204/state/local-state/complex) | [Validation Groups](/docs/react-groups), [Dynamic Fields](/docs/react-dynamic-fields) |
| Performance form | [http://127.0.0.1:4204/state/local-state/performance](http://127.0.0.1:4204/state/local-state/performance) | [Performance](/docs/react-performance) |
| Redux Toolkit | [http://127.0.0.1:4204/state/redux-toolkit](http://127.0.0.1:4204/state/redux-toolkit) | [Redux Toolkit](/docs/react-state-redux-toolkit) |
| Zustand | [http://127.0.0.1:4204/state/zustand](http://127.0.0.1:4204/state/zustand) | [Zustand](/docs/react-state-zustand) |

Single-host routes use the same paths under `/showcases/react/`.

## Package guidance

For provider setup, hooks, troubleshooting, and API details, stay in the React Package section:

- [Provider](/docs/react-provider)
- [Core Hooks](/docs/react-hooks)
- [React Examples](/docs/react-examples)
- [Public API](/docs/react-api)
- [React FAQ](/docs/react-faq)

## Source location

Application code lives in `apps/react-showcase/`. Start it with:

```bash
npm run serve:react-showcase
```

Or launch every application from the Portal with `npm run start:multi-host` / `npm run portal`.
