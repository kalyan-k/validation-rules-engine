# Security Policy

## Supported versions

Security fixes are accepted for the latest published `1.x` line of:

- `@validation-rules-engine/core`
- `@validation-rules-engine/angular`
- `@validation-rules-engine/react`

Older major lines may not receive patches. Prefer upgrading to the latest release.

## Reporting a vulnerability

Please report security issues privately. Do **not** open a public GitHub issue for undisclosed vulnerabilities.

Preferred contact:

- Email: [validationrulesengine@gmail.com](mailto:validationrulesengine@gmail.com)
- Or use GitHub Security Advisories for this repository when available

Include:

- Affected package name and version
- Description of the issue and impact
- Reproduction steps or proof of concept
- Whether the issue is already public

We aim to acknowledge reports within a few business days.

## Responsible disclosure

Please give maintainers a reasonable window to investigate and release a fix before public disclosure. Do not include exploit details in public channels until a fix or coordinated disclosure date is agreed.

## Security expectations

This project uses automated security scanning and release gates to identify known dependency vulnerabilities, source-code security issues, exposed secrets, and runtime web security issues. Scans reduce risk; they do not guarantee the absence of vulnerabilities.

Layers include:

- SAST (CodeQL, Semgrep)
- Dependency scanning (npm audit, OWASP Dependency-Check)
- Secret scanning (Gitleaks)
- Optional runtime testing (OWASP ZAP)
- SBOM generation (CycloneDX)
- Automated release security gates

AI-assisted code is treated as ordinary application code and must pass the same validation.

## What not to disclose publicly

Until coordinated:

- Unfixed vulnerability details and exploit steps
- Private credentials, tokens, or customer data discovered during research
- Contents of private documentation under `docs/private/`

## Further reading

- Security tooling and local/CI commands: [tools/security/README.md](tools/security/README.md)
- Central thresholds: [tools/security/config/security-policy.json](tools/security/config/security-policy.json)
