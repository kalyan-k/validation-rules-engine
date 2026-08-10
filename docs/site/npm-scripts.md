# npm Scripts Guide

This page explains every script in the repository root `package.json`, when to use it, and which order to run scripts for common workflows.

All commands assume you are in the repository root after `npm install` (or `npm ci`).

## Recommended sequences

Use these sequences instead of running every script ad hoc. Later steps usually depend on earlier builds or reports.

### 1. First-time setup

```bash
npm ci
npm run architecture:verify
npm run version:check
npm run build:packages
npm start
```

| Step | Why |
| --- | --- |
| `npm ci` | Install locked dependencies |
| `architecture:verify` | Confirm package/app dependency direction |
| `version:check` | Confirm synchronized package versions |
| `build:packages` | Produce Core / Angular / React artifacts under `dist/packages` |
| `npm start` | Build the single-host site and open the local portal |

### 2. Daily local development

Pick one path:

**Whole platform (recommended default)**

```bash
npm start
```

**Multi-host platform** (separate ports for docs/showcases)

```bash
npm run start:multi-host
```

**Live Angular/React servers behind the portal**

```bash
npm run portal:dev
```

**One showcase only**

```bash
npm run serve:vanilla-showcase
# or serve:angular-showcase / serve:react-showcase / serve:docs
```

### 3. After code changes (before a PR)

```bash
npm run version:check
npm run architecture:verify
npm run lint:all
npm run test:ci
npm run build:site
npm run site:verify
npm run test:hosting
npm run security:quick
```

Optional focused checks:

```bash
npm run test:e2e:smoke
npm test
npm run reports:open
```

### 4. Generate browsable test/coverage reports

```bash
npm run test:reports
npm run reports:open
```

Or the CI-shaped path used by release gates:

```bash
npm run test:ci
```

### 5. Security scanning

```bash
npm run security:quick      # day-to-day
npm run security:full       # broader local scan + SBOM
npm run release:security    # strictest gate before publishing
```

Install Gitleaks, Semgrep, and Dependency-Check (or Docker) for full/release profiles. See [Release & Versioning](/docs/release-versioning) and the repository file `tools/security/README.md`.

### 6. Release / publish rehearsal

Do **not** start with publish. Follow this order:

```bash
npm run release:dry-run
# or the fuller local gate:
npm run release:verify
```

Only after a green rehearsal and an intentional tag/trusted-publisher setup:

```bash
# preferred explicit local publish
VRE_CONFIRM_PUBLISH=YES npm run release:publish

# or existing wrapper (also runs release:verify first)
npm run publish:packages
```

Tagged releases on GitHub run `.github/workflows/release.yml`, which re-runs the quality gates and publishes with provenance.

### 7. Hosted evidence refresh (slow)

```bash
npm run evidence:refresh
```

This runs unit/coverage reports, the full Playwright suite, then publishes evidence into the hosted site layout. Prefer `test:e2e:smoke` during normal development.

## Decision cheat sheet

| Goal | Start with |
| --- | --- |
| Open the product locally | `npm start` |
| Edit one showcase quickly | matching `serve:*` script |
| Validate a PR | sequence in “After code changes” |
| Check security quickly | `npm run security:quick` |
| Rehearse npm publish | `npm run release:dry-run` |
| Publish packages | `release:publish` or `publish:packages` after a green gate |
| Refresh public evidence | `npm run evidence:refresh` |

## Script reference

Aliases are noted where a script simply forwards to another command.

### Launch & serve

| Script | Description |
| --- | --- |
| `start` | Default entry: same as `start:single-host`. |
| `host` | Alias of `start:single-host`. |
| `start:single-host` | Builds the production single-origin site, then serves it. |
| `serve:single-host` | Serves an already-built single-host site from `dist/apps/portal/server.js`. |
| `serve:host` | Alias of `serve:single-host`. |
| `start:multi-host` | Builds packages/platform/showcases, then starts multi-host orchestration. |
| `serve:multi-host` | Starts multi-host processes without rebuilding. |
| `portal` | Alias of `start:multi-host`. |
| `portal:dev` | Builds packages + platform, then runs the portal with live Angular/React servers. |
| `serve` | Alias of `serve:angular-showcase`. |
| `serve:portal` | Serves the compiled portal only. |
| `serve:docs` | Builds docs, then serves the docs app. |
| `serve:docs:portal` | Serves an already-built docs server. |
| `serve:angular-showcase` | Serves the Angular showcase via Angular CLI. |
| `serve:angular-showcase:portal` | Alias of `serve:angular-showcase`. |
| `serve:react-showcase` | Serves the React showcase via Vite. |
| `serve:react-showcase:portal` | Alias of `serve:react-showcase`. |
| `serve:vanilla-showcase` | Serves the Vanilla JS showcase via Vite. |
| `serve:vanilla-showcase:portal` | Alias of `serve:vanilla-showcase`. |
| `start:react-showcase` | Alias of `serve:react-showcase`. |
| `start:vanilla-showcase` | Alias of `serve:vanilla-showcase`. |
| `serve:static` | Serves Playwright static fixtures/helpers. |
| `ng` | Forwards arguments to the Angular CLI inside `packages/angular`. |

### Build

| Script | Description |
| --- | --- |
| `build` | Alias of `build:packages`. |
| `build:packages` | Builds Core, then Angular adapter, then React adapter. |
| `build:package:core` | Builds `@validation-rules-engine/core`. |
| `build:package:angular` | Builds Core, then `@validation-rules-engine/angular`. |
| `build:package:react` | Builds Core, then `@validation-rules-engine/react`. |
| `build:core` / `build-core` | Aliases of `build:package:core`. |
| `build:angular` | Alias of `build:package:angular`. |
| `build:react` | Alias of `build:package:react`. |
| `build:lib` | Historical alias of `build:package:angular`. |
| `build:platform` | Compiles portal and docs Node apps. |
| `build:app:portal` | TypeScript compile for the portal. |
| `build:app:docs` | TypeScript compile for the docs app. |
| `build:portal` / `build:docs` | Aliases of the matching `build:app:*` scripts. |
| `build:showcases` | Builds packages, then all three showcase apps. |
| `build:showcase:angular` | Production Angular showcase build. |
| `build:showcase:react` | Production React showcase build. |
| `build:showcase:vanilla` | Production Vanilla showcase build. |
| `build:showcase:angular:hosted` | Angular showcase build for single-host base paths. |
| `build:showcase:react:hosted` | React showcase build for single-host mode. |
| `build:showcase:vanilla:hosted` | Vanilla showcase build for single-host mode. |
| `build:angular-showcase` | Packages + Angular showcase. |
| `build:react-showcase` | React package + React showcase. |
| `build:vanilla-showcase` | Core + Vanilla showcase. |
| `build:all` | Platform apps + showcases (packages included via showcase builds). |
| `build:site` | Full single-host assembly under `dist/site` (packages, platform, hosted showcases, site packager). |
| `site:verify` | Verifies assembled single-host routes, assets, and health. |
| `watch` / `watch:lib` | Watches Angular library development builds after Core. |

Build dependency order for publishable packages:

```text
core → angular
core → react
```

Single-host site order:

```text
build:packages → build:platform → hosted showcase builds → build-site packager
```

### Version, architecture, branding

| Script | Description |
| --- | --- |
| `version:check` | Verifies synchronized workspace/package versions and peer ranges. |
| `version:check:dist` | Same checks against built `dist/packages/*` manifests. |
| `architecture:verify` | Enforces dependency direction (showcases → adapters → core). |
| `branding:verify` | Checks shared branding/shell expectations. |

### Security

| Script | Description |
| --- | --- |
| `security:scan` | Alias of `security:quick`. |
| `security:quick` | Developer security profile (npm audit high+, optional Gitleaks/Semgrep). |
| `security:full` | Broader scan including Dependency-Check and SBOM when tooling is available. |
| `security:ci` | CI security profile. |
| `security:release` | Strictest scanner profile used before publish. |
| `security:dependencies` | npm audit wrapper + OWASP Dependency-Check. |
| `security:secrets` | Gitleaks only. |
| `security:sast` | Semgrep only. |
| `security:sbom` | CycloneDX SBOM generation under `reports/security/sbom`. |
| `security:zap` | Optional OWASP ZAP baseline (Docker; target must be running). |

Reports land in `reports/security/` (gitignored). Details: [Release & Versioning](/docs/release-versioning) and the repository file `tools/security/README.md`.

### Release & publish

| Script | Description |
| --- | --- |
| `release:security` | Runs the release security gate and stops on failure. |
| `release:check` | Security + version + lint + `test:ci` + package build + inspect. |
| `release:dry-run` | Full publish rehearsal without publishing to npm. **Start here for releases.** |
| `release:pack` | Security + build + inspect + write tarballs under `artifacts/release-packs`. |
| `release:publish` | Full gated publish; requires `VRE_CONFIRM_PUBLISH=YES`. |
| `release:inspect` | Inspects built package contents for required/forbidden files. |
| `release:verify` | Local release mega-gate: security, versions, lint, tests, site build, hosting tests, pack dry-run, inspect. |
| `pack:packages:dry-run` | Builds packages and dry-runs `npm pack` for Core/Angular/React. |
| `pack:lib` | Legacy Angular-only pack dry-run. |
| `publish:lib` | Legacy Angular-only publish (prefer synchronized package publish). |
| `publish:packages` | Runs `release:verify`, then publishes all three packages with provenance. |

Recommended release order:

```text
release:security
   → tests / lint (via dry-run or verify)
   → build packages
   → SBOM / inspect / pack
   → explicit publish
```

### Unit, coverage, and report generation

| Script | Description |
| --- | --- |
| `test` | Runs platform + Core + Angular + React + all showcase unit suites. |
| `test:platform` | Builds platform apps, then runs Node tests for portal/docs. |
| `test:core` / `test:angular` / `test:react` | Package unit tests. |
| `test:showcase:angular` / `:react` / `:vanilla` | Showcase unit tests. |
| `test:coverage` | Coverage-enabled suite across platform and all projects. |
| `test:coverage:*` | Per-project coverage runs (local Chrome). |
| `test:coverage:*:ci` | CI Chrome variants where applicable. |
| `test:reports` | Generates branded HTML/JSON/JUnit/coverage reports for every project. |
| `test:reports:*` | Per-project report generation. |
| `test:ci` | Platform tests + CI report generation (used by release gates). |
| `test:all` | `npm test` plus report index regeneration. |
| `test:watch:*` | Watch-mode unit tests for a single project. |
| `reports:clean` | Deletes generated report outputs. |
| `reports:index` | Rebuilds the reports dashboard index. |
| `reports:verify` | Verifies expected report artifacts exist and are consistent. |
| `reports:open` | Opens the local reports dashboard. |

Typical report sequence:

```text
test:reports → reports:verify → reports:open
```

### Playwright E2E & hosting navigation

| Script | Description |
| --- | --- |
| `test:e2e` | Default Chromium Playwright suite. |
| `test:e2e:smoke` | Fast `@smoke` Chromium subset. Prefer this while iterating. |
| `test:e2e:all` | Chromium + Firefox + WebKit. |
| `test:e2e:full` | Broad regression: browsers, a11y, visual, responsive (slow). |
| `test:e2e:angular` / `:react` / `:vanilla` / `:docs` / `:portal` / `:reports` | Tag-filtered suites. |
| `test:e2e:chromium` / `:firefox` / `:webkit` | Browser-specific runs. |
| `test:e2e:headed` / `:debug` / `:ui` | Interactive Playwright modes. |
| `test:e2e:visual` / `:visual:update` | Visual snapshot run / update. |
| `test:e2e:accessibility` | Accessibility project. |
| `test:e2e:responsive` | Tablet + mobile responsive projects. |
| `test:e2e:report` | Opens the last Playwright HTML report. |
| `test:e2e:catalog` | Regenerates the Playwright test catalog metadata. |
| `test:e2e:clean` | Cleans Playwright artifacts. |
| `test:e2e:portal-data` | Regenerates portal automation data. |
| `test:hosting` | Multi-host then single-host shared-navigation checks. |
| `test:hosting:multi` / `test:hosting:single` | Individual hosting navigation modes. |

Suggested E2E order while developing:

```text
test:e2e:smoke → focused tag suite → test:e2e → test:e2e:full (before evidence/release)
```

### Evidence publishing

| Script | Description |
| --- | --- |
| `evidence:publish` | Copies/publishes generated evidence into the hosted layout. |
| `evidence:refresh` | `test:ci` → `test:e2e:full` → `evidence:publish`. Slow; use when refreshing public proof artifacts. |

### Lint

| Script | Description |
| --- | --- |
| `lint` | Lints the Angular project. |
| `lint:all` | Lints every configured ESLint/Angular project. |

## What not to run first

| Avoid starting here | Why |
| --- | --- |
| `publish:packages` / `release:publish` | Publishing must follow a green security + quality gate. |
| `evidence:refresh` | Very slow; not needed for routine local work. |
| `test:e2e:full` | Use smoke/focused E2E first. |
| `serve:single-host` before `build:site` | Needs a prior site build. |
| `release:inspect` before `build:packages` | Inspects `dist/packages/*`. |
| `security:zap` before a running target | ZAP needs a live URL (usually `npm start` or `serve:single-host`). |

## Related docs

- [Architecture](/docs/architecture)
- [Single-Host Deployment](/docs/single-host-deployment)
- [Release & Versioning](/docs/release-versioning)
- [Testing, Coverage & Reports](/docs/testing)
- [Playwright E2E Testing](/docs/playwright)
