# Security Scanning & Reports

Validation Rules Engine applies layered security controls before packages are published and while the developer platform is maintained. The goal is to identify known dependency vulnerabilities, source-code security issues, exposed secrets, and (optionally) runtime web issues—not to claim the software is free of all vulnerabilities.

## Public packages covered

| Package | Role |
| --- | --- |
| `@validation-rules-engine/core` | Framework-neutral engine |
| `@validation-rules-engine/angular` | Angular adapter |
| `@validation-rules-engine/react` | React adapter |

All three share a synchronized version and are published together with npm provenance after release gates succeed.

## Security layers

| Layer | Tooling | Where it runs |
| --- | --- | --- |
| SAST | GitHub CodeQL, Semgrep | CodeQL in CI (`.github/workflows/codeql.yml`); Semgrep locally and in CI |
| SCA | npm audit, OWASP Dependency-Check | Local security profiles, CI, release gate |
| Secrets | Gitleaks | Local and CI |
| Supply chain | CycloneDX SBOM | Local, CI, release |
| DAST | OWASP ZAP (optional) | Explicit workflow / `npm run security:zap` against a running site |
| Process | `release:security` / `release:verify` | Before pack or publish |

Code generated or assisted by AI is treated as ordinary application code and must pass the same controls.

## How packages stay compliant

Before npm publish (local or tagged GitHub release):

1. **Release security gate** — npm audit (moderate+), Gitleaks, Semgrep, Dependency-Check when available, SBOM.
2. **Quality gates** — version sync, lint, unit tests, coverage reports, single-host build, hosting navigation checks.
3. **Package inspection** — verifies publishable artifacts do not include secrets, private docs, or unexpected paths.
4. **Provenance** — CI publish uses npm trusted publishing / OIDC provenance.

Thresholds and profiles live in `tools/security/config/security-policy.json`. Disclosure process: [SECURITY.md](https://github.com/kalyan-k/validation-rules-engine/blob/master/SECURITY.md).

## Hosted Security report

The portal **Reports → Security** page (`/security/`) shows the latest published security summary alongside Tests & Coverage and Automation Testing.

```bash
npm run security:full
npm run security:portal-data   # also run automatically by evidence:publish
npm run evidence:publish
```

Evidence is stored under `hosted/evidence/security/` (scanner outputs plus `portal-data/latest.json`). The live page reads `/api/security/latest` and links artifacts under `/security/artifacts/`.

CodeQL results remain in the GitHub **Security** / code scanning UI; the hosted page documents CodeQL as a CI control and surfaces local/CI scanner artifacts that are published as evidence.

## Commands

```bash
npm run security:quick       # developer scan
npm run security:full        # broader scan + SBOM
npm run security:ci          # CI profile
npm run release:security     # strictest pre-publish gate
npm run security:portal-data # rebuild portal summary JSON
```

See [npm Scripts Guide](/docs/npm-scripts), [Release & Versioning](/docs/release-versioning), and `tools/security/README.md` for installation (Gitleaks, Semgrep, Docker / NVD API key) and false-positive handling.
