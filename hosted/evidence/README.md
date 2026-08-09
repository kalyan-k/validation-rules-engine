# Hosted evidence (reports & automation)

This folder holds **pre-generated** test, coverage, and Playwright summary artifacts for single-host deployments (including Azure Static Web Apps).

CI does **not** run the full test matrix for Azure. Instead:

1. Locally generate reports and automation summaries
2. Publish them into this folder
3. Commit and push so `npm run build:site` can copy them into `dist/site`

## Publish locally

```bash
npm run test:ci
npm run test:e2e:chromium
npm run evidence:publish
git add hosted/evidence
git commit -m "Update hosted test and automation evidence"
```

Or in one step after you already have fresh `reports/` and Playwright output:

```bash
npm run evidence:publish
```

## What gets published

| Source | Destination |
| --- | --- |
| `reports/` | `hosted/evidence/reports/` |
| `artifacts/playwright/portal-data/` | `hosted/evidence/playwright/portal-data/` |
| `artifacts/playwright/html-report/` | `hosted/evidence/playwright/html-report/` |
| `artifacts/playwright/json/` | `hosted/evidence/playwright/json/` |
| `artifacts/playwright/junit/` | `hosted/evidence/playwright/junit/` |
| `artifacts/playwright/catalog/` | `hosted/evidence/playwright/catalog/` |
| `artifacts/playwright/visual-diffs/` (when present) | `hosted/evidence/playwright/visual-diffs/` |

Videos, traces, and screenshots stay local. If visual diffs are missing, a placeholder page is published at `playwright/visual-diffs/index.html` so the Automation “Visual diffs” link does not 404.

## Deploy behavior

`tools/hosting/build-site.mjs` prefers live `reports/` / `artifacts/playwright/` when present (local development), otherwise falls back to this evidence folder. If neither has usable content, `/reports/` and `/automation/` still load with empty states.
