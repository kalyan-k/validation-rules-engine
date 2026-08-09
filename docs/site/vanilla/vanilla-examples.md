# Vanilla Examples

Live routes under the Vanilla JS Showcase:

| Example | URL | What to notice |
| --- | --- | --- |
| Simple | [http://127.0.0.1:4205/simple](http://127.0.0.1:4205/simple) | Required and format rules, inline field messages, form summary |
| Complex | [http://127.0.0.1:4205/complex](http://127.0.0.1:4205/complex) | Nested paths, multiple policies, group status |
| Performance | [http://127.0.0.1:4205/performance](http://127.0.0.1:4205/performance) | Generated sections/controls, timed validation runs |

Single-host routes use the same paths under `/showcases/vanilla/`.

## Shared policies with adapters

Write policies against `@validation-rules-engine/core` only. The same policy classes can drive Vanilla JS DOM forms, Angular directives, and React hooks without rewriting rule definitions.

## Source location

Application code lives in `apps/vanilla-showcase/`. It is a private workspace app, not an npm package. Start it with:

```bash
npm run serve:vanilla-showcase
```

Or launch every application from the Portal with `npm run start:multi-host` / `npm run portal`.
