# Installation

Install the adapter with the core package and its tested React peers.

```bash
npm install @validation-rules/core @validation-rules/react react react-dom
```

## Peer dependencies

The 1.0 adapter line is tested with:

- `@validation-rules/core` 1.x
- React 19.2
- React DOM 19.2

The package emits ESM and TypeScript declarations and declares `sideEffects: false` for tree shaking. It does not require RxJS, a router, a state-management library, or a CSS framework.

## Workspace development

In this repository, use the workspace scripts:

```bash
npm run build:react
npm run test:react
npm run test:coverage:react
```

The React showcase consumes the workspace package through `@validation-rules/react`; it does not copy adapter source into the application.

## TypeScript

Use TypeScript 5.8 or a compatible newer compiler with `jsx` set to `react-jsx`. JavaScript consumers can use the runtime API without TypeScript, but policies and nested model paths are easier to maintain with model types.

## Next step

Build the first provider, policy, controlled field, and submit flow in [Quick Start](/docs/react-quick-start).
