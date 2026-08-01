# FAQ

## Does Validation Rules Engine require Angular Forms?

No. The engine evaluates models. The pure NgRx showcase validates store state without `FormGroup` or `ngModel`.

## Why does the Angular adapter own policy execution?

The current expression parser uses `@angular/compiler`. Moving it into core would introduce an Angular dependency. A future extraction requires a parser abstraction and compatibility tests.

## Can policies contain asynchronous rules?

Yes. Policy execution waits for asynchronous results through its observable lifecycle.

## Should validation results live in NgRx?

They can. Clone selected state before evaluation, then dispatch the validated snapshot so reducer immutability remains intact.

## How should dynamic forms register policies?

Use `replacePolicy()` when generated fields change and unregister the policy when the feature is destroyed.

## Are React or Vue packages available?

No. They remain roadmap directions until complete adapters and real consumer showcases exist.

## Where are coverage reports?

Generate them with `npm run test:reports`, then open the report dashboard from the Portal or run `npm run reports:open`.

## Does the portal publish packages?

No. Portal startup, tests, builds, and local documentation do not publish npm packages or create Git tags.
