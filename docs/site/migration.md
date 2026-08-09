# Migration

The current architecture separates a framework-neutral core from Angular integration without changing validation behavior or public APIs.

## Package imports

Framework-neutral consumers should import from `@validation-rules-engine/core`. Existing Angular consumers may continue importing historically re-exported neutral symbols from `@validation-rules-engine/angular`.

## Styles

Use the stable stylesheet export:

```text
@validation-rules-engine/angular/styles/policy-validation.css
```

## Repository development

The Angular CLI workspace is owned by `packages/angular`. Root npm commands delegate to that workspace, so normal commands remain unchanged.

The default developer entry point is now:

```bash
npm start
```

This launches the portal, documentation, Vanilla showcase, Angular showcase, and React showcase.

## TypeScript path mappings

Angular-owned path mappings live in `packages/angular/tsconfig.base.json`. They use explicit relative paths and do not rely on the deprecated `baseUrl` option.

## Behavioral compatibility

Policies, groups, rule execution, selectors, CSS hooks, and result shapes are unchanged. Treat any behavioral change as a separate milestone with its own migration plan.
