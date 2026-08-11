# Contributing to Validation Rules Engine

Thanks for helping improve Validation Rules Engine (VRE). This guide covers local setup, tests, style expectations, review norms, and compatibility rules for the public packages:

- `@validation-rules-engine/core`
- `@validation-rules-engine/angular`
- `@validation-rules-engine/react`

Please also follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately using [SECURITY.md](SECURITY.md)—do not open a public issue for undisclosed vulnerabilities.

## Prerequisites

- Node.js 22 (LTS aligned with the repository)
- npm (workspace-aware; use the version that ships with Node 22)
- A local Chrome or Chromium browser for Karma unit tests

## Setup

```bash
git clone https://github.com/kalyan-k/validation-rules-engine.git
cd validation-rules-engine
npm ci
npm run architecture:verify
```

Optional one-command local platform (single-host production build):

```bash
npm start
```

## Architecture and compatibility

Keep the existing dependency direction:

```text
Angular showcase --> @validation-rules-engine/angular --> @validation-rules-engine/core
React showcase ----> @validation-rules-engine/react -----> @validation-rules-engine/core
Vanilla showcase --------------------------------------> @validation-rules-engine/core
```

- Core must remain framework-independent (no Angular or React imports).
- Adapters may depend on core; core must never depend on an adapter.
- Do not scaffold placeholder packages for future frameworks without a complete implementation, tests, docs, and showcase.
- Preserve public package contracts unless a breaking SemVer major is explicitly planned.
- Keep synchronized versions across the three public packages. Prefer documenting consumer-visible changes in [CHANGELOG.md](CHANGELOG.md).

`npm run architecture:verify` and `npm run version:check` enforce these invariants.

## Code style

- Match the surrounding TypeScript style in each package or app.
- Prefer clear, behavior-focused names over speculative abstractions.
- Keep framework-specific code inside the matching adapter or showcase.
- Do not exclude executable production code solely to raise coverage numbers.
- Leave comments only when they explain non-obvious intent or constraints.

## Tests

Add or update tests with behavior changes. Useful commands:

| Command | Purpose |
| --- | --- |
| `npm test` | Unit suites across platform, packages, and showcases |
| `npm run test:coverage` | Independent 90% coverage gates |
| `npm run test:reports` | Browsable HTML reports under the report platform |
| `npm run test:e2e:smoke` | Fast Playwright smoke suite |
| `npm run lint:all` | Lint configured projects |

Before opening a pull request, run:

```bash
npm ci
npm run version:check
npm run architecture:verify
npm run test:reports
npm run build:site
npm run site:verify
npm run lint:all
```

For release-shaped confidence (slower), use `npm run release:dry-run` or `npm run release:verify`.

## Pull requests

- Keep PRs focused on one concern when practical.
- Describe the consumer impact and note any public API changes.
- Link related issues.
- Include tests for new behavior and regression coverage for bug fixes.
- Do not commit secrets, local tokens, or generated scanner output under `reports/`.

Maintainers review for correctness, architecture boundaries, SemVer impact, docs updates, and test evidence.

## Documentation

- Consumer-facing docs live under `docs/site/`.
- Package landing pages are `packages/*/README.md` and ship inside npm tarballs.
- Repository overview and install guidance live in the root [README.md](README.md).
- Record user-visible release notes in [CHANGELOG.md](CHANGELOG.md).

## Publishing notes

The workspace root and showcase apps are private. Only synchronized, quality-gated artifacts under `dist/packages/{core,angular,react}` are published. Prefer the tagged GitHub Actions release workflow with npm trusted publishing. Local publish requires an authenticated npm session and `VRE_CONFIRM_PUBLISH=YES`.

## Questions and support

- Docs and demos: https://kalyan-k.github.io/validation-rules-engine/
- Issues: https://github.com/kalyan-k/validation-rules-engine/issues
- Contact: [validationrulesengine@gmail.com](mailto:validationrulesengine@gmail.com)
