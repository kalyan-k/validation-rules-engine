#!/usr/bin/env node
/**
 * Builds a portal-friendly security summary for /api/security/latest
 * from reports/security/security-summary.json (or latest.json).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const securityRoot = path.join(workspaceRoot, 'reports', 'security');
const outDir = path.join(securityRoot, 'portal-data');
const outFile = path.join(outDir, 'latest.json');

const packages = [
  '@validation-rules-engine/core',
  '@validation-rules-engine/angular',
  '@validation-rules-engine/react'
];

const programLayers = [
  {
    id: 'codeql',
    name: 'CodeQL',
    layer: 'SAST',
    scope: 'CI (GitHub code scanning)',
    description: 'GitHub CodeQL analyzes JavaScript/TypeScript under packages/, apps/, tests/, playwright/, and tools/. Results appear in the repository Security tab.'
  },
  {
    id: 'semgrep',
    name: 'Semgrep',
    layer: 'SAST',
    scope: 'Local + CI',
    description: 'Community Semgrep rulesets for JavaScript/TypeScript security patterns on application and library source.'
  },
  {
    id: 'npm-audit',
    name: 'npm audit',
    layer: 'SCA',
    scope: 'Local + CI + release',
    description: 'Primary npm advisory gate against package-lock.json. Release fails on moderate+ findings.'
  },
  {
    id: 'dependency-check',
    name: 'OWASP Dependency-Check',
    layer: 'SCA',
    scope: 'Local + CI (when Docker/CLI available)',
    description: 'Independent dependency analysis. Complements npm audit; incomplete for some npm graphs.'
  },
  {
    id: 'gitleaks',
    name: 'Gitleaks',
    layer: 'Secrets',
    scope: 'Local + CI',
    description: 'Detects high-confidence secrets, tokens, and credentials in repository content.'
  },
  {
    id: 'zap',
    name: 'OWASP ZAP',
    layer: 'DAST',
    scope: 'Optional runtime',
    description: 'Baseline dynamic scan against the running single-host site when explicitly enabled.'
  },
  {
    id: 'sbom',
    name: 'CycloneDX SBOM',
    layer: 'Supply chain',
    scope: 'Local + CI + release',
    description: 'Software Bill of Materials for workspace and publishable packages (core, angular, react).'
  },
  {
    id: 'release-gate',
    name: 'Release security gate',
    layer: 'Process',
    scope: 'Pre-publish',
    description: 'npm publish paths require release:security / release:verify before packaging or publishing with provenance.'
  }
];

const summaryPath = [
  path.join(securityRoot, 'security-summary.json'),
  path.join(securityRoot, 'latest.json')
].find((candidate) => existsSync(candidate));

const packageJson = JSON.parse(readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'));
let scan = null;
if (summaryPath) {
  try {
    scan = JSON.parse(readFileSync(summaryPath, 'utf8'));
  } catch {
    scan = null;
  }
}

const resultByScanner = new Map(
  Array.isArray(scan?.results)
    ? scan.results.map((item) => [item.scanner, item])
    : []
);

const checks = programLayers.map((layer) => {
  const result = resultByScanner.get(layer.id);
  if (result) {
    return {
      ...layer,
      status: result.label || (result.status === 0 ? 'PASS' : result.status === 1 ? 'FAIL' : 'ERROR'),
      summary: result.summary || '',
      at: result.at || scan?.at || null,
      artifactHints: artifactHintsFor(layer.id)
    };
  }
  if (layer.id === 'codeql' || layer.id === 'release-gate' || layer.id === 'zap') {
    return {
      ...layer,
      status: layer.id === 'zap' ? 'OPTIONAL' : 'CI/PROCESS',
      summary: layer.description,
      at: null,
      artifactHints: artifactHintsFor(layer.id)
    };
  }
  return {
    ...layer,
    status: 'NOT RUN',
    summary: 'No local scan result in the latest security summary. Run npm run security:full to refresh.',
    at: null,
    artifactHints: artifactHintsFor(layer.id)
  };
});

const executed = checks.filter((item) => ['PASS', 'FAIL', 'ERROR'].includes(item.status));
const totals = {
  configured: checks.length,
  executed: executed.length,
  passed: executed.filter((item) => item.status === 'PASS').length,
  failed: executed.filter((item) => item.status === 'FAIL').length,
  errored: executed.filter((item) => item.status === 'ERROR').length
};

const payload = {
  available: Boolean(scan),
  version: packageJson.version || '1.0.0',
  generatedAt: new Date().toISOString(),
  profile: scan?.profile || null,
  label: scan?.label || (scan ? 'UNKNOWN' : 'UNAVAILABLE'),
  exitCode: typeof scan?.exitCode === 'number' ? scan.exitCode : null,
  scannedAt: scan?.at || null,
  packages,
  standards: [
    'OWASP dependency and application security practices',
    'GitHub CodeQL / code scanning',
    'CycloneDX SBOM (ECMA-424 aligned tooling)',
    'npm provenance on publish',
    'Secret scanning before merge and release'
  ],
  compliance: {
    summary: 'Public packages are released only after synchronized version checks, lint, unit/coverage gates, hosting verification, and the release security gate (SAST/SCA/secrets/SBOM). AI-assisted code is treated as ordinary code and must pass the same controls.',
    packages: packages.map((name) => ({
      name,
      controls: [
        'Source scanned by CodeQL (CI) and Semgrep',
        'Dependencies gated by npm audit (and Dependency-Check when available)',
        'Repository scanned by Gitleaks',
        'CycloneDX SBOM generated for the workspace package',
        'Published with npm provenance from the release workflow'
      ]
    }))
  },
  totals,
  checks,
  artifacts: {
    summary: 'security-summary.json',
    latest: 'latest.json',
    npmAudit: 'npm-audit/',
    semgrep: 'semgrep/',
    gitleaks: 'gitleaks/',
    dependencyCheck: 'dependency-check/',
    sbom: 'sbom/',
    zap: 'zap/'
  },
  message: scan
    ? `Latest ${scan.profile || 'security'} gate: ${scan.label}.`
    : 'No local security summary is available yet.',
  command: 'npm run security:full && npm run evidence:publish'
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(workspaceRoot, outFile)} (available=${payload.available}, label=${payload.label})`);

function artifactHintsFor(id) {
  const map = {
    'npm-audit': ['npm-audit/npm-audit.json', 'npm-audit/npm-audit.txt'],
    semgrep: ['semgrep/semgrep.json', 'semgrep/semgrep.sarif'],
    gitleaks: ['gitleaks/gitleaks.json', 'gitleaks/gitleaks.sarif'],
    'dependency-check': ['dependency-check/dependency-check-report.html', 'dependency-check/dependency-check-report.json'],
    sbom: ['sbom/core.cdx.json', 'sbom/angular.cdx.json', 'sbom/react.cdx.json', 'sbom/workspace.cdx.json'],
    zap: ['zap/zap-baseline.html', 'zap/zap-baseline.json'],
    codeql: [],
    'release-gate': []
  };
  return map[id] || [];
}
