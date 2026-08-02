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

`npm start` builds the site and starts the unified host at `http://127.0.0.1:4200`. It does not spawn separate documentation or showcase processes. Use `npm run portal` when separate local development servers and health monitoring are preferred.

## Runtime configuration

The production server accepts:

- `VRE_PORTAL_PORT`: public listening port; defaults to `4200` outside the container.
- `VRE_HOST`: listening interface; defaults to `0.0.0.0` in unified-host mode.
- `VRE_PUBLIC_URL`: optional canonical public origin, such as `https://validation-rules-engine.azurewebsites.net`. Leave it unset to derive the origin automatically from each browser request.
- `VRE_NO_OPEN=1`: prevents opening a browser on server startup.
- `VRE_BUILD_TIME`: build timestamp returned by portal metadata.

No Azure hostname is hardcoded. By default, `platform-config.js` derives the active origin from `window.location` and maps every application to its hosted subpath. The same generated configuration is available at the root and within both framework build directories, so direct Angular and React deep links remain correctly configured. Set `VRE_PUBLIC_URL` only when navigation must use a specific canonical domain instead of the incoming request origin.

## Azure deployment

The container can be deployed to Azure Container Apps, Azure App Service for Containers, or Azure Kubernetes Service. Configure the public container port as `8080` and use `/health/ready` for readiness checks. TLS can terminate at Azure because the application derives its public origin in the browser.

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
