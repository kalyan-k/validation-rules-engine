# Testing and reports

The workspace tests the framework-independent core engine, Angular adapter, Angular showcase, React adapter, React showcase, and both Node applications. Every Angular project produces persistent test results, source coverage, and JUnit XML and independently enforces 90% global coverage thresholds.

## Test stack

Tests use Jasmine 5.4, Karma 6.4, and headless Chrome through Angular CLI targets. Core specifications exercise plain TypeScript behavior; adapter and showcase specifications also use Angular TestBed, browser DOM APIs, routing, dependency injection, and template rendering where appropriate.

Two browsable HTML report types are generated:

- The repository-owned `persistent-test-results` Karma reporter writes suites, cases, pass/fail/skip state, timing, browser data, repository-relative spec files, and failure logs. It also writes JSON summaries and JUnit XML.
- `karma-coverage` writes Istanbul HTML source coverage with folder/file navigation, four coverage metrics, and highlighted source lines. LCOV and JSON summaries are generated beside it.

The unified dashboard, persistent test pages, and coverage landing pages use the shared report branding module. Every page identifies the application, workspace version, report type, and generation time. This metadata is initially expanded, automatically collapses after about ten seconds, and stores a manual expanded/collapsed preference in session storage.

The dashboard keeps report exploration in one browser tab. Its left tree separates collapsible Packages and Showcase Applications groups, both expanded by default. Each project exposes Summary, Tests, and Coverage in that order; the same ordered tabs update the right pane with Summary selected initially. Coverage views load the unmodified Istanbul site in an iframe, and the raw source report remains available under each project's `coverage/` directory.

The interactive `kjhtml` page and console progress remain enabled for local watch runs. Persistent reports remain usable after Karma exits and can be opened directly from the file system.

Karma 6 expects older `glob` and `minimatch` APIs. `tools/testing/karma-glob-compat.cjs` adapts the two properties Karma reads, while a scoped npm override gives Karma patched `minimatch` 3.1.4. This compatibility is limited to the runner.

The Angular test targets and showcase builds enable `preserveSymlinks`, keeping module identity stable when the workspace is opened through a junction or symbolic link. The portal and docs use Node's built-in test runner after TypeScript compilation.

## Install and run

```bash
npm ci

npm run test:reports:core       # core engine reports
npm run test:reports:angular    # Angular adapter reports
npm run test:reports:showcase:angular
npm run test:reports:showcase:react
npm run test:reports            # all projects plus dashboard and verification
npm run test:ci                 # same pipeline with ChromeHeadlessCI
```

Focused commands:

```bash
npm test
npm run test:core
npm run test:angular
npm run test:showcase:angular
npm run test:showcase:react
npm run test:platform

npm run test:coverage
npm run test:coverage:core
npm run test:coverage:angular
npm run test:coverage:showcase:angular
npm run test:coverage:showcase:react

npm run test:watch:core
npm run test:watch:angular
npm run test:watch:showcase:angular
npm run test:watch:showcase:react
```

Report management:

```bash
npm run reports:open       # open reports/index.html
npm run reports:clean      # delete only generated reports
npm run reports:index      # rebuild the dashboard from current summaries
npm run reports:verify     # validate output structure and local navigation
```

## Report locations

| Project | Test execution | Coverage | JUnit |
| --- | --- | --- | --- |
| Unified | `reports/index.html` | - | - |
| Core engine | `reports/packages/core/tests/index.html` | `reports/packages/core/coverage.html` | `reports/packages/core/junit/test-results.xml` |
| Angular adapter | `reports/packages/angular/tests/index.html` | `reports/packages/angular/coverage.html` | `reports/packages/angular/junit/test-results.xml` |
| React adapter | `reports/packages/react/tests/index.html` | `reports/packages/react/coverage.html` | `reports/packages/react/junit/test-results.xml` |
| Angular showcase | `reports/showcases/angular/tests/index.html` | `reports/showcases/angular/coverage.html` | `reports/showcases/angular/junit/test-results.xml` |
| React showcase | `reports/showcases/react/tests/index.html` | `reports/showcases/react/coverage.html` | `reports/showcases/react/junit/test-results.xml` |

Each `tests/` directory also contains `summary.json`. Each `coverage/` directory contains the original Istanbul `index.html`, browsable source pages, `lcov.info`, and `coverage-summary.json`.

`reports/` and the Angular CLI `coverage/` directory are generated and ignored by Git. Cleaning resolves the path relative to the repository, validates the Validation Rules workspace identity, and removes only the expected report root.

## Failure behavior

Project report commands preserve Karma's non-zero status for compilation, test, browser, and coverage failures. They also fail if any required report file is missing. The all-project runner attempts every project, generates the dashboard from whatever outputs are available, verifies report links and source mappings, then returns a non-zero status if any stage failed. This retains diagnostic HTML and JUnit outputs without converting failures into success.

Karma exposes mapped stacks for failed Jasmine results. Passing results do not expose a source location, so the persistent reporter maps suite and test descriptions back to colocated spec files. A dynamically generated description that cannot be mapped is shown as `Not exposed by the runner`. A compilation failure before Karma starts cannot produce per-test results.

## Coverage gates

`tools/testing/karma.shared.conf.cjs` enforces these minimums independently:

| Metric | Core | Angular | Angular Showcase |
| --- | ---: | ---: | ---: |
| Statements | 90% | 90% | 90% |
| Branches | 90% | 90% | 90% |
| Functions | 90% | 90% | 90% |
| Lines | 90% | 90% | 90% |

Below-threshold metrics return a non-zero process status locally and in CI. Report generation does not weaken the gate.

## Coverage scope and exclusions

All executable TypeScript reached by a target is instrumented. Exclusions are narrow and structural:

- `packages/core/src/public-api.ts`: export-only package barrel.
- `packages/core/src/lib/interfaces/**/*.ts`: type-only declarations.
- `packages/angular/src/public-api.ts`: export-only adapter barrel.
- `apps/angular-showcase/src/main.ts`: platform bootstrap; `AppModule` behavior is covered by integration tests.

Do not exclude executable production code merely to increase a percentage. Add behavior-focused tests or separately review and remove dead code.

## Test inventory

### Core engine

| Production surface | Primary specifications |
| --- | --- |
| Built-in validation rules | `validation-helper.spec.ts` |
| Fluent validators and validator construction | `validator.spec.ts` |
| Validation metadata, touched state, resets, and failure shapes | `utils/validation-utils.spec.ts` |

### Angular adapter

| Production surface | Primary specifications |
| --- | --- |
| Policy execution, dependencies, nested paths, async rules, and group state | `policy.spec.ts` |
| Angular expression parsing | `parser/expression-parser.spec.ts` |
| Policy registration, replacement, refresh, cleanup, and groups | `services/validation-provider.service.spec.ts` |
| Directive lifecycle, events, UI refresh, and teardown | `directives/validator.directive.spec.ts` |
| Display configuration, factories, providers, and module setup | `display/validation-display-config.spec.ts` |
| Bootstrap, Material, Tailwind, generic, default, and Prime-style DOM behavior | `strategies/validation-display-strategies.spec.ts` |
| Validation summary and group status/summary components | `components/validation-components.spec.ts` |
| Angular DOM helpers | `utils/validation-utils.spec.ts` |

### Angular showcase

| Production surface | Primary specifications |
| --- | --- |
| Models, policies, state integrations, registrations, routes, and component actions | `application-behavior.spec.ts` |
| AppModule routing, rendered forms, clicks, clear, and submit flows | `app.integration.spec.ts` |
| Deterministic dynamic performance-form construction | `performance-form-builder.service.spec.ts` |
| Performance form rendering and state transitions | `performance-components.spec.ts` |

### Node applications

The portal tests its central application registry and missing-launcher failure state in `process-manager.spec.ts`. The documentation app tests Markdown rendering, escaping, and safe links in `markdown.spec.ts`, plus title, heading, content, code, ranking, and deep-link search behavior in `search.spec.ts`.

Tests are colocated with production code and named `*.spec.ts`. Prefer public behavior, model state, emitted values, and rendered DOM over private implementation details. Cover meaningful success, failure, empty, boundary, conditional, and asynchronous behavior.

## CI integration

GitHub Actions installs with `npm ci`, verifies dependency boundaries, runs `npm run test:ci`, and builds every package and application. `CI=true` selects the no-sandbox `ChromeHeadlessCI` launcher. On success or failure, the workflow uploads:

- `validation-rules-test-reports`: the complete `reports/` tree, with `reports/index.html` as the landing page.
- `validation-rules-junit-results`: every `reports/**/junit/test-results.xml` file.

The workflow does not publish packages.

## Troubleshooting

- Dashboard missing: run `npm run test:reports`; `reports:open` fails intentionally when the dashboard does not exist.
- One project incomplete: inspect its console output and the dashboard missing-output list, then rerun its project report command.
- Coverage gate failure: open `reports/<project>/coverage.html` and inspect uncovered lines and branches in the embedded Istanbul report.
- Browser launch failure in a container: use `npm run test:ci` to select `ChromeHeadlessCI`.
- Stale output after moving tests: run `npm run reports:clean` and regenerate all reports.
- Boundary failure: run `npm run architecture:verify` and remove the reported reverse or framework dependency rather than weakening the guard.
