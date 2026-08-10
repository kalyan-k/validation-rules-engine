# Security tooling

Validation Rules Engine uses layered automated security checks before CI merges and npm releases.

## Scanners

| Scanner | Layer | Purpose |
| --- | --- | --- |
| CodeQL | SAST | GitHub-hosted source analysis for JavaScript/TypeScript |
| Semgrep | SAST | Local/CI rules for JS/TS security patterns |
| npm audit | SCA | Primary npm advisory gate from `package-lock.json` |
| OWASP Dependency-Check | SCA | Independent dependency signal (incomplete for npm graphs) |
| Gitleaks | Secrets | Detects high-confidence secrets in git history/source |
| OWASP ZAP | DAST | Optional runtime baseline against a running site |
| CycloneDX SBOM | Supply chain | Dependency composition for release artifacts |

Code generated or assisted by AI is treated as ordinary application code and must pass the same SAST, SCA, secret scanning, runtime testing, automated tests, and review.

## Profiles

Configured in `config/security-policy.json`.

| Profile | Command | Scanners |
| --- | --- | --- |
| quick | `npm run security:quick` | npm audit (high+), Gitleaks, Semgrep |
| full | `npm run security:full` | quick + Dependency-Check + SBOM |
| ci | `npm run security:ci` | same as full (CI installs CLIs) |
| release | `npm run security:release` / `npm run release:security` | strictest pre-publish gate |

ZAP is optional. Run with `npm run security:zap` or `npm run security:full -- --zap` after starting a target (default `http://127.0.0.1:4200`).

## Reports

Generated output is written under `reports/security/` (gitignored):

```text
reports/security/
├── security-summary.json
├── npm-audit/
├── semgrep/
├── gitleaks/
├── dependency-check/
├── sbom/
└── zap/
```

CodeQL results appear in the GitHub Security tab, not under `reports/security/`.

## Thresholds

| Severity | Local quick | CI / release |
| --- | --- | --- |
| Critical / High | fail | fail |
| Moderate | report | fail (`npm audit --audit-level=moderate`) |
| Low / Informational | report | report |

Dependency-Check fails at CVSS ≥ 7. Documented limitation: it is not a complete replacement for npm audit on npm lockfiles.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | PASS |
| 1 | FAIL — findings exceeded threshold |
| 2 | ERROR — scanner could not execute |

Quick scans may treat missing optional CLIs (Gitleaks/Semgrep/ODC/ZAP) as skipped. Release/CI profiles do not treat scanner execution errors as success.

## Installation

### Required for a meaningful local quick scan

- Node.js 22+
- npm (for `npm audit`)

### Required for full/release locally

- [Gitleaks](https://github.com/gitleaks/gitleaks/releases) on `PATH`
- Semgrep (`pip install semgrep`)
- OWASP Dependency-Check CLI **or** Docker (`owasp/dependency-check`)
- Optional `NVD_API_KEY` to reduce NVD rate limiting

### Optional / CI-only

- CodeQL (GitHub Actions workflow `.github/workflows/codeql.yml`)
- Docker for ZAP (`ghcr.io/zaproxy/zaproxy:stable`)
- Workflow dispatch `include_zap` on `.github/workflows/security.yml`

### Windows notes

Orchestration is Node-based for PowerShell/Git Bash/CI. Install Gitleaks and Semgrep so `where gitleaks` / `where semgrep` succeed. Dependency-Check can use Docker Desktop when the native CLI is absent.

### Docker Desktop setup (Windows) for Dependency-Check / ZAP

Dependency-Check uses the `owasp/dependency-check` image when the native CLI is not installed. ZAP also needs Docker.

1. Install [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/) if needed.
2. Start **Docker Desktop** from the Start menu.
3. Wait until the whale icon shows **Docker Desktop is running** (engine ready).  
   If you see `failed to connect ... dockerDesktopLinuxEngine`, the engine is not up yet.
4. In PowerShell, confirm the daemon:
   ```powershell
   docker version
   docker info
   ```
   Both should succeed without connection errors.
5. Pull the Dependency-Check image (first run can take several minutes):
   ```powershell
   docker pull owasp/dependency-check:latest
   ```
6. Re-run:
   ```powershell
   npm run security:dependencies
   # or
   npm run security:full
   ```
7. **Required for a reliable first NVD download:** create a free [NVD API key](https://nvd.nist.gov/developers/request-an-api-key).

   **Recommended (works for PowerShell and Command Prompt):**
   ```powershell
   copy tools\security\config\nvd-api-key.local.example tools\security\config\nvd-api-key.local
   # edit nvd-api-key.local and paste only your key on one line
   npm run security:dependencies
   ```
   `nvd-api-key.local` is gitignored.

   **Or set the env var in the same shell that runs npm** (PowerShell and cmd do not share variables):
   ```powershell
   # PowerShell
   $env:NVD_API_KEY = "your-key"
   npm run security:full
   ```
   ```bat
   REM Command Prompt
   set NVD_API_KEY=your-key
   npm run security:full
   ```

   Without a valid key visible to the npm process, Dependency-Check often fails while updating NVD data. npm audit remains the primary SCA gate if Dependency-Check cannot run.

If you prefer not to use Docker locally, install the [OWASP Dependency-Check CLI](https://github.com/jeremylong/DependencyCheck) and put `dependency-check` on your `PATH`. CI still runs Dependency-Check when Docker is available on the runner.

## False positives

Never disable a scanner to silence noise. Prefer narrow suppressions:

| Tool | Suppression mechanism |
| --- | --- |
| Gitleaks | `config/gitleaks.toml` allowlist paths/regexes |
| Semgrep | `# nosemgrep` with justification, or narrow rule ignore |
| Dependency-Check | `config/dependency-check-suppressions.xml` |
| npm audit | dependency override / upgrade; avoid blanket ignores |

Document why the finding is false, who reviewed it, and when to revisit. See also root `SECURITY.md`.

## Release gate

```bash
npm run release:security   # security only
npm run release:dry-run    # recommended first-time release rehearsal
npm run release:check      # security + lint + tests + build + inspect
npm run release:pack       # security + build + inspect + tarballs
npm run release:publish    # requires VRE_CONFIRM_PUBLISH=YES
```

`npm run release:verify` and `npm run publish:packages` also run the release security gate first.

## npm authentication

Do not commit npm tokens. Use:

- local `npm login` / trusted publisher setup
- GitHub Actions OIDC provenance (`id-token: write`) with the `npm` environment
- repository secrets for any supplemental keys (for example `NVD_API_KEY`)

## Portal integration

Security reports are available under `reports/security/`. Portal UI integration is intentionally deferred so existing report navigation stays stable; a future enhancement can surface `security-summary.json` without executing scans from the portal.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `gitleaks is not installed` | Install CLI or rely on CI; quick profile can skip |
| Semgrep missing | `pip install semgrep` and ensure Scripts dir is on PATH |
| Dependency-Check ERROR / `dockerDesktopLinuxEngine` | Start Docker Desktop and wait until ready; see Docker setup above |
| Dependency-Check ERROR / NVD update / `No documents exist` | Set a non-empty `$env:NVD_API_KEY` and retry with Docker running |
| Dependency-Check FAIL with HTML/JSON reports | Real CVSS findings; review `reports/security/dependency-check/` |
| ZAP ERROR | Start target site, set `ZAP_TARGET_URL`, ensure Docker works |
| SBOM fails with npx/`ECOMPROMISED`/`Cannot find module './scan'` | Run `npm ci` (CycloneDX is a workspace devDependency; avoid relying on a corrupted npx cache) |
| SBOM CLI missing | Ensure `@cyclonedx/cyclonedx-npm` is installed via `npm ci` |

## Configuration

Central policy: `config/security-policy.json`

Supporting files:

- `config/codeql/codeql-config.yml`
- `config/semgrep.yml`
- `config/gitleaks.toml`
- `config/dependency-check-suppressions.xml`
