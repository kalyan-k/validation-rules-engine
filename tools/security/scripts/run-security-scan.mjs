#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  Exit,
  loadPolicy,
  printResult,
  reportsDir,
  summarizeResult,
  workspaceRoot,
  writeJsonReport
} from '../lib/security-common.mjs';

const args = new Set(process.argv.slice(2));
const profile = args.has('--release')
  ? 'release'
  : args.has('--ci')
    ? 'ci'
    : args.has('--full')
      ? 'full'
      : args.has('--quick')
        ? 'quick'
        : 'quick';

const includeZap = args.has('--zap') || process.env.VRE_SECURITY_INCLUDE_ZAP === '1';
const allowMissingOptional = args.has('--allow-missing') || profile === 'quick';

const policy = loadPolicy();
const scanners = [...policy.profiles[profile]];
if (includeZap && !scanners.includes('zap')) {
  scanners.push('zap');
}

const scriptMap = {
  'npm-audit': 'run-npm-audit.mjs',
  gitleaks: 'run-gitleaks.mjs',
  semgrep: 'run-semgrep.mjs',
  'dependency-check': 'run-dependency-check.mjs',
  sbom: 'run-sbom.mjs',
  zap: 'run-zap.mjs'
};

const optionalWhenMissing = new Set(
  profile === 'quick'
    ? ['gitleaks', 'semgrep', 'dependency-check', 'sbom', 'zap']
    : profile === 'full'
      ? ['dependency-check', 'zap']
      : ['zap']
);

console.log(`\nValidation Rules Engine security scan (${profile})\n`);
reportsDir();

const results = [];
for (const scanner of scanners) {
  const script = path.join(workspaceRoot, 'tools/security/scripts', scriptMap[scanner]);
  const childArgs = [script];
  if (profile === 'release') childArgs.push('--release');
  if (profile === 'ci') childArgs.push('--ci');
  const child = spawnSync(process.execPath, childArgs, {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: process.env
  });

  let parsed;
  try {
    parsed = JSON.parse((child.stdout || '').trim().split(/\r?\n/u).filter(Boolean).at(-1) || '{}');
  } catch {
    parsed = summarizeResult({
      scanner,
      status: Exit.ERROR,
      summary: child.error?.message || `Scanner produced no machine-readable summary (exit ${child.status})`,
      reportPaths: []
    });
  }

  if (child.error) {
    parsed = summarizeResult({
      scanner,
      status: Exit.ERROR,
      summary: child.error.message,
      reportPaths: []
    });
  }

  // Soften missing optional tooling for developer quick scans.
  if (
    parsed.status === Exit.ERROR
    && allowMissingOptional
    && optionalWhenMissing.has(scanner)
    && /not installed|not on PATH|Docker is required|CLI is not installed/i.test(parsed.summary || '')
  ) {
    parsed = {
      ...parsed,
      status: Exit.PASS,
      label: 'PASS',
      summary: `${parsed.summary} (optional for ${profile}; treated as skipped)`
    };
  }

  results.push(parsed);
  printResult(parsed);
}

const failed = results.filter((item) => item.status === Exit.FAIL);
const errored = results.filter((item) => item.status === Exit.ERROR);
const exitCode = failed.length ? Exit.FAIL : errored.length ? Exit.ERROR : Exit.PASS;

const summary = {
  profile,
  at: new Date().toISOString(),
  exitCode,
  label: exitCode === Exit.PASS ? 'PASS' : exitCode === Exit.FAIL ? 'FAIL' : 'ERROR',
  results
};

writeJsonReport('.', 'security-summary.json', summary);
writeJsonReport('.', 'latest.json', summary);

console.log(`\nSecurity gate: ${summary.label}`);
if (failed.length) {
  console.log(`Failed scanners: ${failed.map((item) => item.scanner).join(', ')}`);
}
if (errored.length) {
  console.log(`Scanner errors: ${errored.map((item) => item.scanner).join(', ')}`);
}
console.log(`Summary report: ${path.relative(workspaceRoot, path.join(workspaceRoot, policy.reportsRoot, 'security-summary.json'))}\n`);

process.exit(exitCode);
