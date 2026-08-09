# Roadmap

Validation Rules Engine grows through complete, tested capabilities rather than placeholder packages. The current platform keeps future additions discoverable without changing the core dependency direction.

## Framework adapters and showcases

React is implemented as a complete adapter, showcase, documentation section, and independently reported test target. The Vanilla Showcase is a complete Core-only consumer application (simple, complex, and performance forms) with documentation under [Vanilla Showcase](/docs/vanilla-overview); it is not a separate npm package. Vue and other adapters can be evaluated only when there is a concrete integration, a deliberate public API, independent tests, and a real consumer showcase. Each adapter must depend on `@validation-rules-engine/core`; core must never depend on an adapter.

## Expression evaluation

A future evaluator abstraction could allow policy execution to move beyond the Angular compiler while preserving existing behavior. That work requires compatibility tests against the current Angular-backed implementation before any public change.

## Developer experience

Potential improvements include an interactive playground, larger performance scenarios, and richer migration tooling. Package releases already use synchronized version checks and a tagged publishing workflow. New applications join the Showcases menu and central launcher registry only when their implementations are complete.

## Compatibility commitment

Existing validation behavior, policies, groups, selectors, styles, and public APIs remain stable unless a separately planned breaking release includes explicit migration guidance.
