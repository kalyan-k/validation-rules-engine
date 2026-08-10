# Single-Host Deployment

The production platform is one Node service, one public port, and one origin. It serves independently built portal, documentation, Vanilla, Angular, React, report, and automation assets beneath stable subpaths.

| Route | Hosted application |
| --- | --- |
| `/` | Portal |
| `/docs/` | Documentation |
| `/showcases/vanilla/` | Vanilla Showcase |
| `/showcases/angular/` | Angular Showcase |
| `/showcases/react/` | React Showcase |
| `/reports/` | Tests and coverage |
| `/automation/` | Playwright automation summary and artifacts |

Vanilla, Angular, and React remain separate applications. The production host composes their build artifacts instead of merging their source code or runtimes.

## Build and run

Build the deployable site without starting it:

```bash
npm run build:site
npm run site:verify
```

The assembled immutable web artifact is written to `dist/site`. The Node entry point remains `dist/apps/portal/server.js`.

Start the complete hosted platform locally:

```bash
npm start
```

`npm start` and `npm run start:single-host` build the site and start the unified host at `http://127.0.0.1:4200`. They do not spawn separate documentation or showcase processes.

Run the separately served topology explicitly with:

```bash
npm run start:multi-host
```

`npm run portal` is an alias for this mode. It serves the portal, documentation, Vanilla Showcase, Angular Showcase, and React Showcase on ports `4200`, `4201`, `4205`, `4202`, and `4204`. `npm run portal:dev` retains live framework development servers when that workflow is specifically needed.

Verify that every top-menu link is correct in both topologies with:

```bash
npm run test:hosting
```

## Runtime configuration

The production server accepts:

- `VRE_PORTAL_PORT`: public listening port; defaults to `4200` outside the container.
- `VRE_HOST`: listening interface; defaults to `0.0.0.0` in unified-host mode.
- `VRE_PUBLIC_URL`: optional canonical public origin, such as `https://kalyan-k.github.io/validation-rules-engine`. Leave it unset to derive the origin automatically from each browser request.
- `VRE_SITE_BASE_PATH`: optional public path prefix when the site is not hosted at domain root (GitHub Pages project sites). Leave unset for local, Docker, and Azure Static Web Apps.
- `VRE_CONTACT_FORM_URL`: optional Google Form embed URL (`https://docs.google.com/forms/d/e/.../viewform?embedded=true`). Injected into `platform-config.js` at build time for the Contact page. Store it as a GitHub Actions secret named `VRE_CONTACT_FORM_URL` so it is not committed to the public repository.
- `VRE_NO_OPEN=1`: prevents opening a browser on server startup.
- `VRE_BUILD_TIME`: build timestamp returned by portal metadata.

No Azure hostname is hardcoded. By default, `platform-config.js` derives the active origin from `window.location` and maps every application to its hosted subpath. The same generated configuration is available at the root and within showcase build directories, so direct Vanilla, Angular, and React deep links remain correctly configured. Set `VRE_PUBLIC_URL` only when navigation must use a specific canonical domain instead of the incoming request origin.

## Azure Static Web Apps (free static hosting)

Azure Static Web Apps hosts the assembled `dist/site` artifact. The GitHub workflow builds and uploads that folder only — it does **not** run unit tests, coverage, or Playwright.

### Reports and automation on Azure

Generate evidence locally, commit it, then deploy:

```bash
npm run evidence:refresh
git add hosted/evidence
git commit -m "Update hosted test and automation evidence"
```

`evidence:refresh` runs unit/coverage reports, the full Playwright catalog (`test:e2e:full`), then publishes into `hosted/evidence/`.

`hosted/evidence/` is the deployable snapshot. `build:site` copies it into `/reports` and `/automation` (Azure sets `VRE_HOSTED_EVIDENCE=1`). If evidence is missing, those routes still load with empty placeholders.

Workflow requirements:

1. Install Node 22 and run `npm ci`
2. Run `npm run build:site` with `VRE_HOSTED_EVIDENCE=1` and `VRE_STATIC_WEB_APPS=1`
3. Deploy with `skip_app_build: true` and `app_location: dist/site`

Those environment variables are Azure-workflow-only. Local `npm start`, `npm run start:single-host`, and `npm run start:multi-host` / `npm run portal` are unchanged: the Node portal still owns routing, health, and `/api/*`, and live `reports/` / Playwright artifacts are preferred when present.

Do **not** point `app_location` at `./apps` or rely on Oryx to build this monorepo.

`tools/hosting/build-site.mjs` copies `staticwebapp.config.json` for SWA validation. Do not define both `/showcases/angular` and `/showcases/angular/`, and do not use catch-all `/showcases/{app}/*` rewrites — Azure applies those even when real CSS/JS files exist, which blank the React and Vanilla showcases. Use explicit SPA path prefixes (`/state/*`, `/simple`, etc.) instead.

After connecting the repo in the Azure portal, push to `master` (or re-run the workflow).

## GitHub Pages

GitHub Pages also hosts the assembled `dist/site` artifact. Do **not** upload the repository root — it has no `index.html`, which produces the Pages “File not found” 404.

The workflow `.github/workflows/github-pages-static.yml`:

1. Installs Node 22 and runs `npm ci`
2. Reads the Pages base path from `actions/configure-pages` (for project sites this is `/<repo-name>`)
3. Runs `npm run build:site` with `VRE_HOSTED_EVIDENCE=1` and `VRE_SITE_BASE_PATH` set to that base path
4. Uploads only `dist/site` (which includes `index.html`, `.nojekyll`, and a root `404.html` fallback)

Leave `VRE_SITE_BASE_PATH` unset for local single/multi-host, Docker, and Azure Static Web Apps so those hosts stay at domain root.

## Azure container deployment

For the full Node unified host (dynamic `/api/*`, process health, optional live tooling), deploy the container to Azure Container Apps, Azure App Service for Containers, or Azure Kubernetes Service. Configure the public container port as `8080` and use `/health/ready` for readiness checks. TLS can terminate at Azure because the application derives its public origin in the browser.

For an App Service custom container, set `WEBSITES_PORT=8080`. An optional canonical-domain configuration looks like:

```text
VRE_PUBLIC_URL=https://kalyan-k.github.io/validation-rules-engine
VRE_NO_OPEN=1
```

Replace the example with your public origin (GitHub Pages, Azure Static Web Apps / App Service URL, or a verified custom domain). The setting is optional when the platform is hosted at the root of a single origin.

## Container deployment

The repository Dockerfile creates a multi-stage production image containing only the compiled portal server and `dist/site` artifact. It listens on port `8080` and includes a `/health/ready` container health check.

```bash
docker build -t validation-rules-engine:1.0.0 .
docker run --rm -p 8080:8080 validation-rules-engine:1.0.0
```

The image can run on any managed container host that supports a single HTTP port. Terminate TLS at the hosting platform or ingress, forward traffic to the container, and preserve the route paths listed above.

## Reports and automation

Prefer committing published evidence under `hosted/evidence/` for Azure and other static hosts (`npm run evidence:publish`). Locally, `build:site` still prefers fresh `reports/` and `artifacts/playwright/` when those directories exist. A clean build without either source serves empty-state pages for `/reports` and `/automation`. For a public deployment, review retained traces, screenshots, source maps, and test data before exposing full artifacts; the publish script excludes videos/traces/screenshots by default.
