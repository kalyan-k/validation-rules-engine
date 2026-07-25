# Validation Rules rebranding report

## Scope

This milestone aligns the monorepo, npm packages, build artifacts, reports, CI labels, showcase copy, and documentation under the Validation Rules identity. It preserves application behavior, Angular APIs, validation logic, selectors, styling hooks, and consumer-facing runtime contracts.

No packages were published, and no tags or releases were created.

## Identity

| Surface | Final identity |
| --- | --- |
| Product | Validation Rules |
| Repository | `validation-rules` |
| Workspace | `validation-rules-workspace` |
| npm scope | `@validation-rules` |
| Core package | `@validation-rules/core` |
| Angular package | `@validation-rules/angular` |
| Showcase workspace | `@validation-rules/angular-showcase` (private) |

## Architecture

```text
apps/angular-showcase
        |
        v
@validation-rules/angular
        |
        v
@validation-rules/core
```

The existing package ownership and one-way dependency model are unchanged. Core remains framework-independent, Angular owns integration and expression execution, and the showcase consumes the Angular public API. The architecture verifier was updated to enforce the final package identities.

## Final repository tree

```text
validation-rules/
|-- .github/
|   `-- workflows/test.yml
|-- apps/
|   `-- angular-showcase/
|       |-- src/app/
|       |-- karma.conf.cjs
|       |-- package.json
|       `-- tsconfig.*.json
|-- docs/
|   |-- architecture.md
|   |-- rebranding-report.md
|   `-- testing.md
|-- packages/
|   |-- angular/
|   |   |-- angular.json
|   |   |-- karma.conf.cjs
|   |   |-- src/lib/
|   |   |-- ng-package.json
|   |   `-- package.json
|   `-- core/
|       |-- karma.conf.cjs
|       |-- src/lib/
|       |-- ng-package.json
|       `-- package.json
|-- tools/
|   |-- architecture/
|   `-- testing/               # shared Karma and report tooling
|-- package-lock.json
|-- package.json
|-- README.md
`-- tsconfig.json
```

## Compatibility decisions

The following existing identifiers remain intentionally unchanged because they are public or runtime compatibility contracts:

- `policyValidator` and Angular `policy-validation-*` component selectors
- `policy-validation-*` CSS classes and `data-policy-validation-*` DOM attributes
- the `styles/policy-validation.css` exported stylesheet path
- policy-domain APIs including `ValidationPolicy`, `Policy`, and `POLICY_VALIDATION_DOM`

Changing these identifiers would be a functional, consumer-visible breaking change. This milestone is an identity and architecture-alignment change with zero intended runtime behavior changes.

## Workspace and build changes

- Updated npm workspace package names, peer dependencies, local dependencies, imports, and TypeScript path aliases.
- Updated package metadata and repository URLs for the intended `validation-rules` repository.
- Updated the local Git `origin` URL without fetching, pushing, or changing the hosted repository.
- Renamed core and Angular package output folders under `dist/packages/core` and `dist/packages/angular`.
- Updated the showcase stylesheet input, package dry-run path, and publication path to the new Angular artifact location.
- Regenerated npm workspace links and `package-lock.json`.
- Updated report dashboard branding, safe-clean workspace identity, CI artifact names, and architecture checks.

## Documentation changes

- Rebuilt the root README around the product, architecture, installation, usage, policies, rules, groups, packages, roadmap, development, contribution, and licensing.
- Updated package READMEs with focused installation, examples, APIs, and compatibility guidance.
- Updated architecture and testing guides for the final package identities, artifacts, reports, and CI labels.
- Updated visible showcase product copy without changing its forms, routes, selectors, or behavior.
- Replaced the earlier repository migration record with this current rebranding and alignment report.

## Change inventory

No production source files were moved in this milestone. The documentation record was renamed and replaced:

```text
docs/migration-report.md -> docs/rebranding-report.md
```

Root configuration, CI, and documentation files modified:

```text
.github/workflows/test.yml
README.md
packages/angular/angular.json
docs/architecture.md
docs/testing.md
package-lock.json
package.json
tsconfig.json
```

Package files modified:

```text
packages/core/README.md
packages/core/ng-package.json
packages/core/package.json
packages/angular/README.md
packages/angular/ng-package.json
packages/angular/package.json
packages/angular/src/public-api.ts
packages/angular/src/lib/display/validation-display.constants.ts
packages/angular/src/lib/styles/policy-validation.css
```

Angular adapter files modified only to update their core package imports:

```text
packages/angular/src/lib/components/validation-components.spec.ts
packages/angular/src/lib/components/validation-group-status.component.ts
packages/angular/src/lib/components/validation-group-summary.component.ts
packages/angular/src/lib/components/validation-policy-group-status.component.ts
packages/angular/src/lib/components/validation-policy-group-summary.component.ts
packages/angular/src/lib/components/validation-summary.component.ts
packages/angular/src/lib/directives/validator.directive.spec.ts
packages/angular/src/lib/directives/validator.directive.ts
packages/angular/src/lib/display/abstract-validation-display.strategy.ts
packages/angular/src/lib/display/examples/prime-ng-display.example.ts
packages/angular/src/lib/interfaces/validation-display.interface.ts
packages/angular/src/lib/policy.spec.ts
packages/angular/src/lib/policy.ts
packages/angular/src/lib/services/validation-provider.service.spec.ts
packages/angular/src/lib/services/validation-provider.service.ts
packages/angular/src/lib/strategies/bootstrap-validation-display.strategy.ts
packages/angular/src/lib/strategies/default-validation-display.strategy.ts
packages/angular/src/lib/strategies/generic-validation-display.strategy.ts
packages/angular/src/lib/strategies/material-validation-display.strategy.ts
packages/angular/src/lib/strategies/tailwind-validation-display.strategy.ts
packages/angular/src/lib/strategies/validation-display-strategies.spec.ts
```

Angular showcase files modified for package imports or visible product copy:

```text
apps/angular-showcase/package.json
apps/angular-showcase/src/app/app.integration.spec.ts
apps/angular-showcase/src/app/app.module.ts
apps/angular-showcase/src/app/application-behavior.spec.ts
apps/angular-showcase/src/app/validation.providers.ts
apps/angular-showcase/src/app/showcase/showcase-framework.providers.ts
apps/angular-showcase/src/app/layout/showcase-shell.component.html
apps/angular-showcase/src/app/pages/home/home.component.html
apps/angular-showcase/src/app/components/complex-form/complex-form-material.component.ts
apps/angular-showcase/src/app/components/complex-form/complex-form-tailwind.component.ts
apps/angular-showcase/src/app/components/complex-form/complex-form.component.ts
apps/angular-showcase/src/app/components/complex-form/complex-form.validation.policy.ts
apps/angular-showcase/src/app/components/performance-form/performance-components.spec.ts
apps/angular-showcase/src/app/components/performance-form/performance-form-builder.service.spec.ts
apps/angular-showcase/src/app/components/performance-form/performance-form-builder.service.ts
apps/angular-showcase/src/app/components/performance-form/performance-form-error-summary.component.ts
apps/angular-showcase/src/app/components/performance-form/performance-form-section.component.ts
apps/angular-showcase/src/app/components/performance-form/performance-form.component.ts
apps/angular-showcase/src/app/components/performance-form/performance-form.validation.policy.ts
apps/angular-showcase/src/app/components/sample-form/sample-form-material.component.ts
apps/angular-showcase/src/app/components/sample-form/sample-form-tailwind.component.ts
apps/angular-showcase/src/app/components/sample-form/sample-form.component.ts
apps/angular-showcase/src/app/components/sample-form/sample-form.validation.policy.ts
```

Repository tools modified:

```text
tools/architecture/verify-dependencies.mjs
tools/testing/clean-reports.mjs
tools/testing/generate-report-platform.mjs
```

Local Git metadata modified outside the source tree:

```text
.git/config                 # origin URL only
```

Two generated and ignored pre-rebrand package output directories were removed from `dist/`; only the final core, Angular, and showcase artifact directories remain.

The physical repository directory rename was attempted only after verifying the exact source, target, and workspace junction. Windows rejected it because the active Codex parent process holds the repository directory open. No partial move occurred and the existing junction was verified intact. The source-controlled repository has no obsolete repository-name references; the on-disk folder rename must be completed after this workspace closes.

## Validation

| Check | Result |
| --- | --- |
| `npm install` | Passed; workspace links refreshed, 0 vulnerabilities |
| scoped workspace dependency listing | Passed; showcase to Angular to core links resolved locally |
| `npm run architecture:verify` | Passed |
| `npm run build` | Passed; core and Angular artifacts use renamed destinations |
| `npm run build:angular-showcase` | Passed; existing 1.75 MB warning remains below the 2 MB error budget |
| `npm test` | Passed: core 16, Angular 91, showcase 65 tests |
| `npm run test:coverage` | Passed all independent 90% gates |
| `npm run test:reports` | Passed; dashboard generated and report structure/local navigation verified |
| `npm run lint:all` | Passed all three projects |
| obsolete-name audit | Passed for packages, workspace, repository URLs, artifacts, reports, CI, and visible branding |
| `git diff --check` | Passed |

Coverage from the final report run:

| Project | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Core | 99.49% | 98.43% | 100% | 99.49% |
| Angular | 97.14% | 90.32% | 99.63% | 97.09% |
| Angular showcase | 98.86% | 92.70% | 100% | 98.83% |

Generated outputs:

```text
dist/
|-- angular-showcase/
|-- validation-rules-angular/
`-- validation-rules-core/

reports/
|-- angular/
|-- angular-showcase/
|-- core/
`-- index.html
```

## Future opportunities

- Close the active workspace and rename the physical repository directory to `validation-rules`; the Windows directory handle is the only incomplete identity surface.
- Rename the hosted Git repository to match the already-updated local `origin` after human review.
- Plan a separately versioned migration only if compatibility selectors or stylesheet names ever need a new identity.
- Extract an expression-evaluator abstraction before considering policy execution framework-neutral.
- Add release coordination and publishing automation in a separate, explicitly approved milestone.
- Add another framework adapter only when a complete implementation, showcase, tests, and documentation are ready.

This milestone stops for human review before publishing, tagging, releasing, or adding speculative framework packages.
