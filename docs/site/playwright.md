# Playwright End-to-End Testing

Validation Rules Engine (VRE) uses repository-level Playwright automation for browser-level confidence across the portal, documentation, existing reports, Angular Showcase, React Showcase, and Vanilla Showcase.

## Purpose

The Playwright suite verifies public user behavior:

- validation behavior,
- policy composition,
- Angular and React state-management integrations,
- documentation navigation and search,
- portal navigation,
- existing report access,
- accessibility checks,
- targeted visual stability,
- responsive layouts.

The suite does not replace Karma, Vitest, Node tests, coverage gates, or report generation. It complements them.

## Folder structure

```text
playwright/
  config/
  scripts/
  README.md
tests/
  e2e/
    angular/
    react/
    documentation/
    demo-portal/
    reports/
    shared/
      fixtures/
      page-objects/
      components/
      helpers/
      assertions/
      test-data/
      factories/
      accessibility/
      visual/
      responsive/
      cross-framework/
    smoke/
artifacts/
  playwright/
```

Generated artifacts are ignored by Git. Source tests and approved visual snapshots are source-controlled.

## Installation

```bash
npm install
npm exec playwright install chromium firefox webkit
```

## Local execution

```bash
npm run test:e2e
npm run test:e2e:smoke
npm run test:e2e:angular
npm run test:e2e:react
npm run test:e2e:docs
npm run test:e2e:portal
npm run test:e2e:reports
```

The default local command runs Chromium. Browser-specific commands are available:

```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
npm run test:e2e:all
npm run test:e2e:full
```

`test:e2e:all` runs the cross-browser regression projects. `test:e2e:full` runs every configured Playwright project: Chromium, Firefox, WebKit, accessibility, visual, tablet responsive, and mobile responsive. The full dashboard command uses a deliberately steadier enterprise profile with limited workers and one retry, so browser-driver flakes are reported as flaky instead of hiding the configured test estate behind transient local runner failures.

## Configurable application URLs

Playwright defaults to isolated local ports so it does not collide with normal development servers:

```text
Portal:            http://127.0.0.1:4300
Documentation:     http://127.0.0.1:4301
Angular Showcase:  http://127.0.0.1:4302
React Showcase:    http://127.0.0.1:4304
Vanilla Showcase:  http://127.0.0.1:4305
```

Override them without changing source code:

```bash
PLAYWRIGHT_PORTAL_BASE_URL=http://127.0.0.1:4400 npm run test:e2e
PLAYWRIGHT_DOCS_BASE_URL=https://docs.example.com npm run test:e2e:docs
PLAYWRIGHT_ANGULAR_BASE_URL=https://angular.example.com npm run test:e2e:angular
PLAYWRIGHT_REACT_BASE_URL=https://react.example.com npm run test:e2e:react
PLAYWRIGHT_VANILLA_BASE_URL=https://vanilla.example.com npm run test:e2e:vanilla
```

Set `PLAYWRIGHT_SKIP_PLATFORM_BUILD=1` when CI or a local workflow has already built `dist/`.

## Debugging

```bash
npm run test:e2e:headed
npm run test:e2e:debug
npm run test:e2e:ui
```

## Tags

Tests use Playwright grep-friendly tags:

- `@smoke`
- `@regression`
- `@angular`
- `@react`
- `@docs`
- `@portal`
- `@reports`
- `@accessibility`
- `@visual`
- `@performance-form`
- state tags such as `@ngrx`, `@signals`, `@redux-toolkit`, and `@zustand`

Example:

```bash
npm run test:e2e -- --grep @ngrx
```

## Reports and diagnostics

Playwright writes:

- HTML report: `artifacts/playwright/html-report/`
- JSON report: `artifacts/playwright/json/results.json`
- JUnit report: `artifacts/playwright/junit/test-results.xml`
- configured test catalog: `artifacts/playwright/catalog/results.json`
- screenshots, traces, and retained videos under `artifacts/playwright/test-results/`
- visual diffs under `artifacts/playwright/visual-diffs/`

Open the HTML report:

```bash
npm run test:e2e:report
```

## Accessibility

Representative accessibility checks use `@axe-core/playwright`:

```bash
npm run test:e2e:accessibility
```

The suite does not suppress violations automatically. If an exception is accepted, document the rule, reason, scope, and follow-up recommendation.

## Visual regression

Visual tests are targeted, not exhaustive:

```bash
npm run test:e2e:visual
npm run test:e2e:visual:update
```

Only use the update command when intentionally approving snapshot changes.

Responsive projects use Chromium tablet and mobile viewports so local responsive checks do not require WebKit. Full WebKit coverage remains available through `npm run test:e2e:webkit` and scheduled cross-browser CI.

## Portal integration

After a Playwright run, `playwright/scripts/generate-portal-data.mjs` reads the JSON report and writes:

```text
artifacts/playwright/portal-data/latest-run.json
```

The portal reads this manifest through `/api/playwright/latest` and displays it under Reports -> Automation Testing at `/automation/`. Full report assets are available below `/automation/artifacts/` in the unified host. The page separates the full configured test catalog from the latest executed run, so a focused smoke run does not look like the repository only has a handful of tests. Missing report data shows an empty state with the command required to generate a local run.

For an enterprise-style complete automation dashboard, run:

```bash
npm run test:e2e:full
```

Enterprise CI systems usually publish the same set of artifacts: human-readable HTML, machine-readable JSON, JUnit XML for CI/test-management ingestion, failure screenshots, retained videos, traces, accessibility results, and visual diffs.

The Playwright Results area, generated Playwright HTML report, traces, videos, and screenshot galleries are intentionally excluded from Playwright E2E coverage.

## Adding a new state-management implementation

1. Add the showcase route and documentation.
2. Add or reuse a strategy-specific Playwright spec under `tests/e2e/angular/` or `tests/e2e/react/`.
3. Tag the tests with the state-management tag.
4. Verify Overview, Simple Form, Complex Form, and Performance Form behavior.
5. Run the relevant targeted command and smoke suite.

## Troubleshooting

- If servers fail to start, check port overrides and whether another process is already using the Playwright ports.
- If browser binaries are missing, run `npm exec playwright install chromium firefox webkit`.
- If the portal shows no Playwright data, run `npm run test:e2e:portal-data` after a Playwright JSON report exists.
- If a visual test fails, inspect `artifacts/playwright/visual-diffs/` before updating snapshots.
- On constrained local machines, prefer Chromium regression plus Firefox/WebKit smoke (`--grep "@smoke" --workers=1`). Full Firefox/WebKit regression is intended for CI or scheduled runs.
