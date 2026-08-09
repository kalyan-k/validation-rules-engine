# FAQ

## Does Validation Rules Engine require Angular Forms?

No. The engine evaluates models. The pure NgRx showcase validates store state without `FormGroup` or `ngModel`. The Vanilla Showcase validates plain TypeScript objects with DOM controls and no Angular or React runtime.

## Why does the Angular adapter own policy execution?

The current expression parser uses `@angular/compiler`. Moving it into core would introduce an Angular dependency. A future extraction requires a parser abstraction and compatibility tests.

## Can policies contain asynchronous rules?

Yes. Policy execution waits for asynchronous results through its observable lifecycle.

## Should validation results live in NgRx?

They can. Clone selected state before evaluation, then dispatch the validated snapshot so reducer immutability remains intact.

## How should dynamic forms register policies?

Use `replacePolicy()` when generated fields change and unregister the policy when the feature is destroyed.

## Are React or Vue packages available?

React is available today as `@validation-rules-engine/react`, with a complete documentation section and React Showcase. Vue is still a roadmap direction until a complete adapter, tests, docs, and consumer showcase exist.

## Can I use Core without Angular or React?

Yes. Install `@validation-rules-engine/core` and evaluate policies from plain TypeScript. The [Vanilla Showcase](/docs/vanilla-overview) is the live Core-only demo (simple, complex, and performance forms).

## Where are coverage reports?

Generate them with `npm run test:reports`, then open the report dashboard from the Portal or run `npm run reports:open`.

## Does the portal publish packages?

No. Portal startup, tests, builds, and local documentation do not publish npm packages or create Git tags.
