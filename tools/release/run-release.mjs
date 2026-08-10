#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mode = process.argv[2] || 'check';
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
// Prefer shell for Windows npm.cmd shims.
const npmShell = process.platform === 'win32';

const stepsByMode = {
  security: [
    ['Security gate', [process.execPath, 'tools/security/scripts/run-security-scan.mjs', '--release']]
  ],
  check: [
    ['Working tree hygiene reminder', null],
    ['Security gate', [process.execPath, 'tools/security/scripts/run-security-scan.mjs', '--release']],
    ['Version sync', [npmCmd, 'run', 'version:check']],
    ['Lint', [npmCmd, 'run', 'lint:all']],
    ['Tests + coverage reports', [npmCmd, 'run', 'test:ci']],
    ['Build packages', [npmCmd, 'run', 'build:packages']],
    ['Inspect package contents', [process.execPath, 'tools/release/inspect-packages.mjs']]
  ],
  'dry-run': [
    ['Security gate', [process.execPath, 'tools/security/scripts/run-security-scan.mjs', '--release']],
    ['Version sync', [npmCmd, 'run', 'version:check']],
    ['Lint', [npmCmd, 'run', 'lint:all']],
    ['Tests + coverage reports', [npmCmd, 'run', 'test:ci']],
    ['Build packages', [npmCmd, 'run', 'build:packages']],
    ['SBOM', [process.execPath, 'tools/security/scripts/run-sbom.mjs']],
    ['Inspect package contents', [process.execPath, 'tools/release/inspect-packages.mjs']],
    ['Pack dry-run', [npmCmd, 'run', 'pack:packages:dry-run']],
    ['Simulate publish', null]
  ],
  pack: [
    ['Security gate', [process.execPath, 'tools/security/scripts/run-security-scan.mjs', '--release']],
    ['Build packages', [npmCmd, 'run', 'build:packages']],
    ['Inspect package contents', [process.execPath, 'tools/release/inspect-packages.mjs']],
    ['Create tarballs', null]
  ],
  publish: [
    ['Security gate', [process.execPath, 'tools/security/scripts/run-security-scan.mjs', '--release']],
    ['Version sync', [npmCmd, 'run', 'version:check']],
    ['Lint', [npmCmd, 'run', 'lint:all']],
    ['Tests + coverage reports', [npmCmd, 'run', 'test:ci']],
    ['Build packages', [npmCmd, 'run', 'build:packages']],
    ['SBOM', [process.execPath, 'tools/security/scripts/run-sbom.mjs']],
    ['Inspect package contents', [process.execPath, 'tools/release/inspect-packages.mjs']],
    ['Publish packages with provenance', null]
  ]
};

if (!stepsByMode[mode]) {
  console.error(`Unknown release mode: ${mode}`);
  process.exit(2);
}

console.log(`\nRelease mode: ${mode}\n`);

for (const [label, command] of stepsByMode[mode]) {
  console.log(`→ ${label}`);
  if (label.startsWith('Working tree')) {
    console.log('  Ensure your git working tree matches the intended release commit before publishing.');
    continue;
  }
  if (label === 'Simulate publish') {
    console.log('  Dry-run complete. No packages were published to npm.');
    continue;
  }
  if (label === 'Create tarballs') {
    const outDir = path.join(workspaceRoot, 'artifacts', 'release-packs');
    mkdirSync(outDir, { recursive: true });
    for (const pkg of ['core', 'angular', 'react']) {
      const result = run(npmCmd, ['pack', `./dist/packages/${pkg}`, '--pack-destination', outDir]);
      if (result.status !== 0) stop(label, result);
    }
    console.log(`  Tarballs written to ${path.relative(workspaceRoot, outDir)}`);
    continue;
  }
  if (label === 'Publish packages with provenance') {
    if (process.env.VRE_CONFIRM_PUBLISH !== 'YES') {
      console.error('Refusing to publish. Set VRE_CONFIRM_PUBLISH=YES to publish explicitly after a successful dry-run.');
      process.exit(1);
    }
    for (const pkg of ['core', 'angular', 'react']) {
      const result = run(npmCmd, ['publish', `./dist/packages/${pkg}`, '--access', 'public', '--provenance']);
      if (result.status !== 0) stop(label, result);
    }
    continue;
  }

  const result = run(command[0], command.slice(1));
  if (result.status !== 0) stop(label, result);
}

persistGateMarker(mode);
console.log(`\nRelease mode '${mode}' completed successfully.\n`);

function run(command, args) {
  const needsShell = npmShell && /\.(cmd|bat)$/iu.test(command);
  return spawnSync(command, args, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
    shell: needsShell
  });
}

function stop(label, result) {
  console.error(`\nSTOP: '${label}' failed (exit ${result.status ?? 2}).`);
  process.exit(result.status ?? 2);
}

function persistGateMarker(completedMode) {
  if (!['security', 'check', 'dry-run', 'pack', 'publish'].includes(completedMode)) {
    return;
  }
  const markerDir = path.join(workspaceRoot, 'reports', 'security');
  mkdirSync(markerDir, { recursive: true });
  const summaryPath = path.join(markerDir, 'security-summary.json');
  const payload = {
    mode: completedMode,
    at: new Date().toISOString(),
    securitySummaryPresent: existsSync(summaryPath),
    version: JSON.parse(readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8')).version
  };
  writeFileSync(path.join(markerDir, 'release-gate.json'), `${JSON.stringify(payload, null, 2)}\n`);
}
