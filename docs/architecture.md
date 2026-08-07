# Architecture

## Goals

Validation Rules Engine (VRE) separates reusable validation behavior from framework integration while preserving the established Angular and React APIs and runtime behavior. Product navigation, documentation, and framework showcases are separate applications so each can scale independently.

```text
validation-rules-engine/
|-- packages/
|   |-- core/                 # @validation-rules-engine/core
|   `-- angular/              # @validation-rules-engine/angular and Angular CLI workspace
|-- apps/
|   |-- portal/                 # framework-neutral launcher and status dashboard
|   |-- docs/                 # Markdown documentation application
|   |-- angular-showcase/         # private Angular forms and state-management consumer
|   |-- react-showcase/           # private React adapter consumer
|   `-- vanilla-showcase/         # private core-only TypeScript + Vite consumer
|-- tools/
|   |-- architecture/         # dependency-boundary verification
|   |-- platform-shell/       # framework-neutral product shell and layout theme
|   `-- testing/              # shared Karma config and persistent report pipeline
|-- package.json              # private npm-workspaces root
`-- tsconfig.json
```

There is no `shared` package because the current code has no additional ownership boundary that justifies one. Future-framework adapters and showcases are not scaffolded until they have complete implementations.

## Dependency graph

```text
apps/angular-showcase --> @validation-rules-engine/angular --> @validation-rules-engine/core
apps/react-showcase ----> @validation-rules-engine/react -----> @validation-rules-engine/core
apps/vanilla-showcase ---------------------------------------> @validation-rules-engine/core

apps/portal ----URLs----> apps/docs and framework showcases
```

The Angular showcase imports only `@validation-rules-engine/angular` plus showcase-only state libraries. The React showcase imports only `@validation-rules-engine/react`. The vanilla showcase imports `@validation-rules-engine/core` directly and must not depend on either adapter. The Angular and React adapters import `@validation-rules-engine/core`. Core imports neither Angular nor an adapter. The Node portal and docs applications import no Angular or state-management runtime. npm workspaces link the local packages during repository development; Angular-owned TypeScript path mappings support tests and local compilation.

Run `npm run architecture:verify` to validate this direction. CI runs the same command before tests. The verifier rejects framework dependencies in core, reverse adapter imports, Angular/React showcase-to-core bypasses, missing workspace relationships, and out-of-scope placeholder adapters.

## Core engine boundary

`packages/core` owns behavior that does not require a framework runtime:

- `ValidationPolicy` and `ValidationModel` contracts
- validation result, required-state, form-group, and policy-group types
- `Validator`, `ValidatorHelper`, and built-in `ValidationHelper` rules
- validation metadata, touched-field, reset, and failure-shape utilities

The package compiles as a publishable Angular Package Format library through ng-packagr, but its runtime sources and manifest have no Angular dependency. Reusing the workspace packager avoids introducing a second build system solely for the neutral package.

## Angular adapter boundary

`packages/angular` owns framework-specific behavior:

- `ValidationModule` and providers
- `ValidationProviderService`
- `ValidatorDirective`
- summary and status components
- DOM rendering utilities and display strategies
- Angular expression parsing and `Policy` execution

The adapter consumes engine types and helpers through the `@validation-rules-engine/core` public entry point. Its own entry point re-exports neutral symbols that existing Angular consumers historically imported from the adapter.

## Compatibility boundary

The repository, npm scope, imports, package metadata, report titles, and build destinations use the Validation Rules Engine identity. Existing runtime and public API contracts remain unchanged:

- Angular selectors such as `policy-validation-group-status`
- the `policyValidator` directive selector and inputs
- DOM attributes and `policy-validation-*` CSS classes
- the `styles/policy-validation.css` package export
- public policy-domain types such as `ValidationPolicy`, `Policy`, and `POLICY_VALIDATION_DOM`

Those names are compatibility hooks or domain concepts, not workspace branding. Renaming them would require a separately planned breaking release and consumer migration.

## Why policy execution remains in Angular

The existing `Policy` implementation creates expressions through `@angular/compiler`. Moving that implementation to core would give core an Angular dependency, while replacing the parser would be a behavioral rewrite with compatibility risk.

A future extraction should first define a small expression-evaluator port in core, provide an Angular-backed implementation in the adapter, and run the existing policy specifications against both evaluators. Until that work is justified, the current boundary is the safest behavior-preserving design.

## Application boundaries

`apps/angular-showcase` is a private application. It consumes the Angular package name instead of package source paths, making its builds and integration tests representative of real consumers. It now owns both UI-framework showcases and the comparable Angular state-management showcases for ngModel, Reactive Forms, NgRx, NGXS, Akita, Elf, RxAngular State, Signals, and a custom RxJS store.

`apps/portal` owns process startup, health polling, the application registry, report links, and the browser entry point. `apps/docs` owns Markdown rendering, navigation, and search. These Node applications communicate with the showcases through URLs and remain framework-neutral.

`tools/platform-shell` owns the shared product chrome as a dependency-free Web Component plus static CSS. Node servers expose those files directly and Angular targets copy them as application assets. Applications keep their existing Bootstrap, Angular Material, and Tailwind components inside the shell slot; no application imports another application's runtime. The shell contract standardizes branding, application identity, version, the compact Home / Docs / Showcases / Reports / GitHub navigation, report subnavigation, footer links, page width, spacing, breadcrumbs, action bars, card rhythm, and responsive breakpoints.

The same directory owns the product SVG, raster application icons, favicon, and web manifest. Applications preload the shell stylesheet and define the custom element before their own scripts, reserving header space and avoiding a flash of unstyled navigation. Node servers cache these shared static assets; Angular builds copy them through a single asset glob.

Generated reports use `tools/testing/report-branding.cjs` to instantiate the same `validation-platform-shell` Web Component and CSS as every application. Persistent test reports and the unified dashboard therefore inherit identical header spacing, navigation behavior, branding, responsive layout, and footer treatment. The dashboard groups package and showcase-application reports separately and uses a Summary / Tests / Coverage tab set to update one content pane. Direct coverage landing pages still embed the original Istanbul output, so branding is added without changing generated coverage data or source views.

## Build order

Package builds follow dependency order:

1. `@validation-rules-engine/core` to `dist/packages/core`
2. `@validation-rules-engine/angular` to `dist/packages/angular`
3. Portal and documentation TypeScript to `dist/apps/*`
4. `angular-showcase` to `dist/showcases/angular`

The root scripts encode this order and delegate Angular CLI commands to the workspace configuration owned by `packages/angular`. Individual project targets remain available for focused development, but the Angular package build requires a current core artifact.

## Testing ownership

Specifications live beside the code whose behavior they protect:

- Core validator and metadata tests live under `packages/core`.
- Angular services, policy execution, directive, component, parser, display, and DOM tests live under `packages/angular`.
- Application and integration tests live under each application.
- Repository-level browser automation lives under `tests/e2e` with Playwright configuration at the repository root (`playwright.config.ts` and `playwright/`).

Each Angular target generates separate HTML, JSON, LCOV, and JUnit reports and independently enforces 90% global thresholds. The Node applications use the built-in Node test runner. High coverage in one Angular layer cannot hide gaps in another. Playwright complements unit and coverage gates with smoke, regression, accessibility, and targeted visual checks; generated Playwright artifacts are published into the portal Automation Testing area without becoming part of the E2E subject under test.

## Adding an adapter

Add a framework adapter only when there is concrete integration to implement. A complete adapter should:

1. Depend on `@validation-rules-engine/core` without introducing a reverse dependency.
2. Own its framework lifecycle, form bindings, and rendering behavior.
3. Export a deliberate public entry point and document its compatibility contract.
4. Include a private application that consumes the package name rather than source paths.
5. Carry independent lint, build, test, coverage, and report targets.
6. Extend the architecture guard and CI pipeline.

If two or more adapters later share non-engine infrastructure, evaluate a shared package at that time; do not add one preemptively.

## Known risks and opportunities

- The Angular expression parser still anchors policy execution to the adapter.
- `underscore` remains a core peer dependency to preserve validator semantics.
- Public package versions are synchronized and verified automatically; tagged releases pass the complete quality gate before npm trusted publishing.
- Compatibility identifiers retain their historic names and require clear documentation for new consumers.
