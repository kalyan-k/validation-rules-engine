#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mode = process.argv[2] || 'check';

const stepsByMode = {
  security: [
    ['Security gate', { kind: 'node', script: 'tools/security/scripts/run-security-scan.mjs', args: ['--release'] }]
  ],
  check: [
    ['Working tree hygiene reminder', { kind: 'note', message: 'Ensure your git working tree matches the intended release commit before publishing.' }],
    ['Security gate', { kind: 'node', script: 'tools/security/scripts/run-security-scan.mjs', args: ['--release'] }],
    ['Version sync', { kind: 'npm', args: ['run', 'version:check'] }],
    ['Lint', { kind: 'npm', args: ['run', 'lint:all'] }],
    ['Tests + coverage reports', { kind: 'npm', args: ['run', 'test:ci'] }],
    ['Build packages', { kind: 'npm', args: ['run', 'build:packages'] }],
    ['Inspect package contents', { kind: 'node', script: 'tools/release/inspect-packages.mjs', args: [] }]
  ],
  'dry-run': [
    ['Security gate', { kind: 'node', script: 'tools/security/scripts/run-security-scan.mjs', args: ['--release'] }],
    ['Version sync', { kind: 'npm', args: ['run', 'version:check'] }],
    ['Lint', { kind: 'npm', args: ['run', 'lint:all'] }],
    ['Tests + coverage reports', { kind: 'npm', args: ['run', 'test:ci'] }],
    ['Build packages', { kind: 'npm', args: ['run', 'build:packages'] }],
    ['SBOM', { kind: 'node', script: 'tools/security/scripts/run-sbom.mjs', args: [] }],
    ['Inspect package contents', { kind: 'node', script: 'tools/release/inspect-packages.mjs', args: [] }],
    ['Pack dry-run', { kind: 'npm', args: ['run', 'pack:packages:dry-run'] }],
    ['Simulate publish', { kind: 'note', message: 'Dry-run complete. No packages were published to npm.' }]
  ],
  pack: [
    ['Security gate', { kind: 'node', script: 'tools/security/scripts/run-security-scan.mjs', args: ['--release'] }],
    ['Build packages', { kind: 'npm', args: ['run', 'build:packages'] }],
    ['Inspect package contents', { kind: 'node', script: 'tools/release/inspect-packages.mjs', args: [] }],
    ['Create tarballs', { kind: 'pack' }]
  ],
  publish: [
    ['Security gate', { kind: 'node', script: 'tools/security/scripts/run-security-scan.mjs', args: ['--release'] }],
    ['Version sync', { kind: 'npm', args: ['run', 'version:check'] }],
    ['Lint', { kind: 'npm', args: ['run', 'lint:all'] }],
    ['Tests + coverage reports', { kind: 'npm', args: ['run', 'test:ci'] }],
    ['Build packages', { kind: 'npm', args: ['run', 'build:packages'] }],
    ['SBOM', { kind: 'node', script: 'tools/security/scripts/run-sbom.mjs', args: [] }],
    ['Inspect package contents', { kind: 'node', script: 'tools/release/inspect-packages.mjs', args: [] }],
    ['Publish packages with provenance', { kind: 'publish' }]
  ]
};

if (!stepsByMode[mode]) {
  console.error(`Unknown release mode: ${mode}`);
  process.exit(2);
}

console.log(`\nRelease mode: ${mode}\n`);

for (const [label, step] of stepsByMode[mode]) {
  console.log(`→ ${label}`);
  if (step.kind === 'note') {
    console.log(`  ${step.message}`);
    continue;
  }
  if (step.kind === 'pack') {
    const outDir = path.join(workspaceRoot, 'artifacts', 'release-packs');
    mkdirSync(outDir, { recursive: true });
    for (const pkg of ['core', 'angular', 'react']) {
      const result = runNpm(['pack', `./dist/packages/${pkg}`, '--pack-destination', outDir]);
      if (result.status !== 0) stop(label, result);
    }
    console.log(`  Tarballs written to ${path.relative(workspaceRoot, outDir)}`);
    continue;
  }
  if (step.kind === 'publish') {
    if (process.env.VRE_CONFIRM_PUBLISH !== 'YES') {
      console.error('Refusing to publish. Set VRE_CONFIRM_PUBLISH=YES to publish explicitly after a successful dry-run.');
      process.exit(1);
    }
    for (const pkg of ['core', 'angular', 'react']) {
      const result = runNpm(['publish', `./dist/packages/${pkg}`, '--access', 'public', '--provenance']);
      if (result.status !== 0) stop(label, result);
    }
    continue;
  }
  if (step.kind === 'npm') {
    const result = runNpm(step.args);
    if (result.status !== 0) stop(label, result);
    continue;
  }
  if (step.kind === 'node') {
    const result = runNodeScript(step.script, step.args);
    if (result.status !== 0) stop(label, result);
    continue;
  }
  stop(label, { status: 2 });
}

persistGateMarker(mode);
console.log(`\nRelease mode '${mode}' completed successfully.\n`);

function runNpm(args) {
  // Literal executables keep Semgrep from treating this as injectable command construction.
  if (process.platform === 'win32') {
    return spawnSync('npm.cmd', args, {
      cwd: workspaceRoot,
      stdio: 'inherit',
      env: process.env,
      shell: true
    });
  }
  return spawnSync('npm', args, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
    shell: false
  });
}

function runNodeScript(relativeScript, args = []) {
  const scriptPath = path.join(workspaceRoot, relativeScript);
  if (!scriptPath.startsWith(workspaceRoot) || !existsSync(scriptPath)) {
    return { status: 2 };
  }
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
    shell: false
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
