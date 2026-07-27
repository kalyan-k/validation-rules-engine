# Playwright E2E Automation

This folder contains repository-level Playwright automation support for the Validation Rules platform.

## Responsibilities

- Start the local portal, documentation, Angular Showcase, React Showcase, and reports routes through existing repository scripts.
- Keep E2E source code separate from generated artifacts.
- Normalize Playwright JSON results into `artifacts/playwright/portal-data/latest-run.json`.
- Support local Chromium smoke/regression runs and CI-oriented cross-browser runs.

## Artifact policy

Generated output belongs under `artifacts/playwright/` and is ignored by Git:

- `html-report/`
- `json/`
- `junit/`
- `catalog/`
- `test-results/`
- `visual-diffs/`
- `portal-data/`

Approved visual snapshots live under `tests/e2e/shared/visual/__snapshots__/` and are intentionally not ignored.

## Server orchestration

`playwright/scripts/start-platform.mjs` builds the platform/showcase output unless `PLAYWRIGHT_SKIP_PLATFORM_BUILD=1` is set, then launches `npm run serve:portal` with no browser auto-open. The portal starts documentation and static showcase servers through the existing process manager, so Playwright reuses the same application orchestration rather than duplicating startup logic.

Default Playwright ports are separate from the usual development ports:

- Portal: `4300`
- Documentation: `4301`
- Angular Showcase: `4302`
- React Showcase: `4304`

Override with `PLAYWRIGHT_PORTAL_BASE_URL`, `PLAYWRIGHT_DOCS_BASE_URL`, `PLAYWRIGHT_ANGULAR_BASE_URL`, and `PLAYWRIGHT_REACT_BASE_URL`.
