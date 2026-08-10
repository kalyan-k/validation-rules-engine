import path from 'node:path';
import { Exit, loadPolicy, reportsDir, runCommand, summarizeResult, which, workspaceRoot, writeJsonReport, writeReport } from '../lib/security-common.mjs';

const policy = loadPolicy();
const target = process.env[policy.zap.targetEnv] || process.env.ZAP_TARGET_URL || policy.zap.defaultTarget;
const docker = which('docker');
const outDir = reportsDir('zap');

if (!docker) {
  const output = summarizeResult({
    scanner: 'zap',
    status: Exit.ERROR,
    summary: 'Docker is required for local/CI OWASP ZAP baseline scans and was not found on PATH.',
    details: { target, notes: policy.zap.notes },
    reportPaths: []
  });
  writeJsonReport('zap', 'summary.json', output);
  console.log(JSON.stringify(output));
  process.exit(Exit.ERROR);
}

// Map localhost targets into an address the ZAP container can reach.
let scanTarget = target;
try {
  const url = new URL(target);
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
    url.hostname = 'host.docker.internal';
    scanTarget = url.toString().replace(/\/$/u, '');
  }
} catch {
  // keep original target
}

const args = [
  'run',
  '--rm',
  '--add-host=host.docker.internal:host-gateway',
  '-v', `${outDir}:/zap/wrk:rw`,
  '-t',
  'ghcr.io/zaproxy/zaproxy:stable',
  'zap-baseline.py',
  '-t', scanTarget,
  '-r', 'zap-baseline.html',
  '-J', 'zap-baseline.json',
  '-I'
];

const result = runCommand(docker, args, { timeout: 1000 * 60 * 20 });
let status = Exit.PASS;
let summary = `ZAP baseline completed against ${scanTarget}`;
if (result.error) {
  status = Exit.ERROR;
  summary = `ZAP could not execute: ${result.error.message}`;
} else if (result.status === 0) {
  status = Exit.PASS;
} else if (result.status === 2 && !policy.zap.failOnWarn) {
  status = Exit.PASS;
  summary = `ZAP baseline reported WARN findings against ${scanTarget} (configured not to fail on WARN)`;
} else if (result.status !== 0) {
  status = policy.zap.failOnFail ? Exit.FAIL : Exit.PASS;
  summary = `ZAP baseline reported FAIL findings against ${scanTarget}`;
  writeReport('zap', 'zap.stderr.txt', `${result.stdout}\n${result.stderr}`);
}

const output = summarizeResult({
  scanner: 'zap',
  status,
  summary,
  details: { target, scanTarget, mode: policy.zap.mode, notes: policy.zap.notes },
  reportPaths: [
    path.join(outDir, 'zap-baseline.html'),
    path.join(outDir, 'zap-baseline.json')
  ]
});
writeJsonReport('zap', 'summary.json', output);
console.log(JSON.stringify(output));
process.exit(status);
