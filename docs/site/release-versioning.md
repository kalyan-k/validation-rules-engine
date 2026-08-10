# Release and Versioning

Validation Rules Engine uses a synchronized Semantic Versioning release train for its three public packages:

```text
@validation-rules-engine/core
@validation-rules-engine/angular
@validation-rules-engine/react
```

All three package manifests and the private workspace carry the same release version. The adapters declare a compatible peer dependency on the corresponding Core major version. `npm run version:check` enforces these invariants before packaging or publishing.

## Version policy

The first stable public release is `1.0.0`. Subsequent changes follow standard Semantic Versioning:

- Patch (`1.0.1`): backward-compatible bug fixes, documentation corrections, and internal hardening.
- Minor (`1.1.0`): backward-compatible rules, APIs, adapters, or capabilities.
- Major (`2.0.0`): intentional breaking changes to supported public contracts.
- Prerelease (`1.1.0-beta.1` or `1.1.0-rc.1`): preview validation published with a non-default npm distribution tag.

Deprecate a public API in a minor release before removing it in the next planned major release. Record consumer-visible changes in `CHANGELOG.md`.

## Release quality gates

Recommended first rehearsal (does not publish):

```bash
npm run release:dry-run
```

Run the complete local release gate before creating a version tag:

```bash
npm run release:verify
```

This runs the release security gate first (`npm audit`, Gitleaks, Semgrep, OWASP Dependency-Check, SBOM), then synchronized versions, lint, unit and coverage suites, the single-host production build, hosting navigation checks, dry-run npm package contents, and package inspection.

Security-only gate:

```bash
npm run release:security
```

To inspect package contents without publishing:

```bash
npm run pack:packages:dry-run
```

See [npm Scripts Guide](/docs/npm-scripts) for the full release command sequence, [Security tooling](../../tools/security/README.md) for scanner installation and thresholds, and [SECURITY.md](../../SECURITY.md) for disclosure policy.

## Publishing

Stable releases use a matching Git tag such as `v1.0.0`. Pushing the tag starts `.github/workflows/release.yml`, verifies that the tag and package versions match, reruns every release quality gate (including the security gate), and publishes Core before the Angular and React adapters with npm provenance.

Local explicit publish (requires `VRE_CONFIRM_PUBLISH=YES`):

```bash
npm run release:publish
```

Do not store npm tokens in the repository. Use npm trusted publishing / OIDC in GitHub Actions or a local authenticated npm session.

Configure the `npm` GitHub environment and npm trusted publishing for the repository before pushing the first release tag. The `@validation-rules-engine` npm organization or user scope must exist and grant the repository permission to publish all three packages.

For a preview, use a prerelease version and a non-default distribution tag so it does not replace `latest`:

```bash
npm publish ./dist/packages/core --access public --tag next
```

Repeat the preview publication for Angular and React only after all synchronized artifacts pass `npm run version:check:dist`.
