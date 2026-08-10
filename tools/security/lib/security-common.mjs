import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const policyPath = path.join(workspaceRoot, 'tools/security/config/security-policy.json');

export const Exit = Object.freeze({
  PASS: 0,
  FAIL: 1,
  ERROR: 2
});

export function loadPolicy() {
  return JSON.parse(readFileSync(policyPath, 'utf8'));
}

export function reportsDir(...parts) {
  const policy = loadPolicy();
  const dir = path.join(workspaceRoot, policy.reportsRoot, ...parts);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeReport(scanner, basename, content) {
  const filePath = path.join(reportsDir(scanner), basename);
  writeFileSync(filePath, content, 'utf8');
  return filePath;
}

export function writeJsonReport(scanner, basename, value) {
  return writeReport(scanner, basename, `${JSON.stringify(value, null, 2)}\n`);
}

export function which(command) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(probe, [command], { encoding: 'utf8' });
  return result.status === 0 ? String(result.stdout).split(/\r?\n/u).find(Boolean) : null;
}

export function runCommand(command, args, options = {}) {
  // Windows .cmd/.bat shims (npm.cmd, etc.) require a shell; Node otherwise returns EINVAL.
  const needsShell = process.platform === 'win32' && /\.(cmd|bat)$/iu.test(command);
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    encoding: 'utf8',
    shell: needsShell,
    env: process.env,
    ...options
  });
  return {
    status: result.status === null ? Exit.ERROR : result.status,
    signal: result.signal,
    error: result.error,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? ''
  };
}

export function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

export function summarizeResult({ scanner, status, summary, details = {}, reportPaths = [] }) {
  const label = status === Exit.PASS ? 'PASS' : status === Exit.FAIL ? 'FAIL' : 'ERROR';
  return {
    scanner,
    status,
    label,
    summary,
    details,
    reportPaths,
    at: new Date().toISOString()
  };
}

export function printResult(result) {
  const icon = result.label === 'PASS' ? '✓' : result.label === 'FAIL' ? '✗' : '!';
  console.log(`[${icon}] ${result.scanner}: ${result.label} — ${result.summary}`);
  for (const report of result.reportPaths) {
    console.log(`    report: ${path.relative(workspaceRoot, report)}`);
  }
}

export function pathExists(relativePath) {
  return existsSync(path.join(workspaceRoot, relativePath));
}
