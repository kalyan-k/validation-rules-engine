# Single-Host Deployment

The production platform is one Node service, one public port, and one origin. It serves independently built portal, documentation, Angular, React, report, and automation assets beneath stable subpaths.

| Route | Hosted application |
| --- | --- |
| `/` | Portal |
| `/docs/` | Documentation |
| `/showcases/angular/` | Angular Showcase |
| `/showcases/react/` | React Showcase |
| `/reports/` | Tests and coverage |
| `/automation/` | Playwright automation summary and artifacts |

Angular and React remain separate framework applications. The production host composes their build artifacts instead of merging their source code or runtimes.

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

`npm run portal` is an alias for this mode. It serves the portal, documentation, Angular Showcase, and React Showcase on ports `4200`, `4201`, `4202`, and `4204`. `npm run portal:dev` retains live framework development servers when that workflow is specifically needed.

Verify that every top-menu link is correct in both topologies with:

```bash
npm run test:hosting
```

## Runtime configuration

The production server accepts:

- `VRE_PORTAL_PORT`: public listening port; defaults to `4200` outside the container.
- `VRE_HOST`: listening interface; defaults to `0.0.0.0` in unified-host mode.
- `VRE_PUBLIC_URL`: optional canonical public origin, such as `https://validation-rules-engine.azurewebsites.net`. Leave it unset to derive the origin automatically from each browser request.
- `VRE_NO_OPEN=1`: prevents opening a browser on server startup.
- `VRE_BUILD_TIME`: build timestamp returned by portal metadata.

No Azure hostname is hardcoded. By default, `platform-config.js` derives the active origin from `window.location` and maps every application to its hosted subpath. The same generated configuration is available at the root and within both framework build directories, so direct Angular and React deep links remain correctly configured. Set `VRE_PUBLIC_URL` only when navigation must use a specific canonical domain instead of the incoming request origin.

## Azure Static Web Apps (free static hosting)

Azure Static Web Apps can host the assembled `dist/site` artifact as a single-origin static website. The GitHub workflow `.github/workflows/azure-static-web-apps-*.yml` must:

1. Install Node 22 and run `npm ci`
2. Run `npm run test:ci` so coverage and the reports dashboard land in `reports/`
3. Build apps, run Playwright (Chromium), then `npm run build:site` so `reports/` and `artifacts/playwright/` are copied into `dist/site`
4. Deploy with `skip_app_build: true` and `app_location: dist/site`

Do **not** point `app_location` at `./apps` or rely on Oryx to build this monorepo. Oryx cannot detect a single app under `apps/`, so deploy fails looking for `index.html` in the wrong folder.

`tools/hosting/build-site.mjs` copies `staticwebapp.config.json` into `dist/site` and writes static `/api/*.json` stubs so the portal status panel and health routes work without the Node portal process. Showcase deep links use SPA rewrites under `/showcases/angular|react|vanilla/*`. Avoid defining both `/path` and `/path/` route rules (with or without `trailingSlash`), which Azure rejects as duplicates.

After connecting the repo in the Azure portal, push to `master` (or re-run the workflow). The default Azure-generated paths (`./apps` + `build`) will fail until the workflow matches the settings above.

## Azure container deployment

For the full Node unified host (dynamic `/api/*`, process health, optional live tooling), deploy the container to Azure Container Apps, Azure App Service for Containers, or Azure Kubernetes Service. Configure the public container port as `8080` and use `/health/ready` for readiness checks. TLS can terminate at Azure because the application derives its public origin in the browser.

For an App Service custom container, set `WEBSITES_PORT=8080`. An optional canonical-domain configuration looks like:

```text
VRE_PUBLIC_URL=https://validation-rules-engine.azurewebsites.net
VRE_NO_OPEN=1
```

Replace the example with the assigned `azurewebsites.net` URL or a verified custom domain. The setting is optional when the platform is hosted at the root of a single Azure origin.

## Container deployment

The repository Dockerfile creates a multi-stage production image containing only the compiled portal server and `dist/site` artifact. It listens on port `8080` and includes a `/health/ready` container health check.

```bash
docker build -t validation-rules-engine:1.0.0 .
docker run --rm -p 8080:8080 validation-rules-engine:1.0.0
```

The image can run on any managed container host that supports a single HTTP port. Terminate TLS at the hosting platform or ingress, forward traffic to the container, and preserve the route paths listed above.

## Reports and automation

`build:site` includes generated `reports/` and `artifacts/playwright/` content when those directories are available. A clean build still serves useful empty states. For a public deployment, review retained traces, screenshots, source maps, and test data before exposing full artifacts; an enterprise CI environment may choose to publish only the automation summary and retain detailed artifacts behind access control.
