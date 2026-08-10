# Testing, Coverage & Reports

The repository tests the core engine, Angular and React adapters, all showcases, portal, and documentation while keeping coverage results isolated by project.

## Common commands

```bash
npm test
npm run test:coverage
npm run test:reports
npm run test:ci
npm run test:e2e:smoke
npm run test:hosting
```

For the full root script catalog and recommended sequences (setup → PR checks → release), see [npm Scripts Guide](/docs/npm-scripts).

`test:hosting` launches the platform twice. The multi-host pass checks the configured portal, documentation, Vanilla, Angular, and React origins; the single-host pass checks the equivalent `/docs/`, `/showcases/vanilla/`, `/showcases/angular/`, `/showcases/react/`, `/reports/`, and `/automation/` routes on one origin. Each pass renders Portal, Documentation, Vanilla Showcase, Angular Showcase, React Showcase, and Reports pages and asserts their complete shared top-menu URL matrix.

## Coverage gates

Every Karma and Vitest target enforces at least 90% statements, branches, functions, and lines. A strong result in one project cannot hide a weak result in another.

## Persistent reports

Each package and showcase target writes:

- browsable test execution HTML,
- JSON summaries,
- JUnit XML,
- Istanbul HTML coverage,
- LCOV and coverage-summary JSON.

The Portal exposes report pages from the Reports menu. Tests & Coverage opens `/reports/` after reports have been generated. Automation Testing opens `/automation/` and displays the latest Playwright manifest when available. The Automation Testing page separates the full configured Playwright catalog from the latest executed run, which matches enterprise dashboards where smoke, focused, regression, and full-suite runs are distinct. The Tests & Coverage dashboard left navigation tree separates collapsible Packages and Showcase Applications groups, both expanded by default. Summary, Tests, and Coverage tabs update one right-hand workspace with Summary selected initially, so report exploration stays in a single browser tab.

The dashboard, test execution pages, and coverage wrappers share product navigation and a collapsible metadata summary with application name, version, report type, and generation time. The summary starts expanded, collapses automatically after about ten seconds, and remembers a manual preference for the current browser session. Coverage views embed untouched Istanbul pages, preserving folder navigation, source views, highlighting, and generated metrics.

## Node application tests

The portal and documentation use Node's test runner for application registry and Markdown rendering behavior. They compile as strict TypeScript before tests execute.

React uses Vitest, jsdom, React Testing Library, and user-event. A normalization step converts Vitest JSON into the same branded summary/test workspace used by Karma while preserving Vitest JUnit and V8/Istanbul coverage output.

## Playwright E2E testing

Repository-level Playwright tests cover the portal, documentation, reports, Angular Showcase, React Showcase, Vanilla Showcase, accessibility, visual checks, and responsive behavior. The portal also displays the latest normalized Playwright execution manifest when available.

Read the dedicated [Playwright E2E Testing](./playwright.md) guide for commands, tags, browser projects, artifact locations, portal integration, and contribution guidance.

## CI behavior

CI verifies dependency boundaries, runs tests and coverage, validates report navigation, and builds all packages and applications. No package is published by the test workflow.
