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

const TRUSTED_BASENAMES = new Set([
  'npm',
  'npm.cmd',
  'gitleaks',
  'gitleaks.exe',
  'semgrep',
  'semgrep.exe',
  'docker',
  'docker.exe',
  'dependency-check',
  'dependency-check.bat',
  'dependency-check.sh',
  'python',
  'python.exe',
  'python3',
  'python3.exe',
  'py',
  'py.exe',
  'where',
  'where.exe',
  'which',
  'which.exe',
  'node',
  'node.exe'
]);

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
  if (typeof command !== 'string' || !command.trim() || /[\\/\s]/u.test(command)) {
    return null;
  }
  if (process.platform === 'win32') {
    const result = spawnSync('where.exe', [command], { encoding: 'utf8', shell: false });
    return result.status === 0 ? String(result.stdout).split(/\r?\n/u).find(Boolean) : null;
  }
  const result = spawnSync('which', [command], { encoding: 'utf8', shell: false });
  return result.status === 0 ? String(result.stdout).split(/\r?\n/u).find(Boolean) : null;
}

export function runCommand(command, args, options = {}) {
  if (typeof command !== 'string' || !command) {
    return commandError('Command must be a non-empty string');
  }
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string' && typeof arg !== 'number' && typeof arg !== 'boolean')) {
    return commandError('Command args must be a primitive argv array');
  }

  const base = path.basename(command).toLowerCase();
  const normalizedCommand = path.normalize(command);
  const trusted = TRUSTED_BASENAMES.has(base)
    || normalizedCommand === path.normalize(process.execPath)
    || normalizedCommand.startsWith(`${path.normalize(workspaceRoot)}${path.sep}`);
  if (!trusted) {
    return commandError(`Refusing to execute untrusted command: ${base}`);
  }

  // Windows .cmd/.bat shims (npm.cmd, etc.) require a shell; Node otherwise returns EINVAL.
  const needsShell = process.platform === 'win32' && /\.(cmd|bat)$/iu.test(command);
  const stringArgs = args.map(String);
  const spawnOptions = {
    cwd: workspaceRoot,
    encoding: 'utf8',
    shell: needsShell,
    env: process.env,
    ...options
  };

  let result;
  switch (base) {
    case 'npm':
      result = spawnSync('npm', stringArgs, spawnOptions);
      break;
    case 'npm.cmd':
      result = spawnSync('npm.cmd', stringArgs, spawnOptions);
      break;
    case 'where':
    case 'where.exe':
      result = spawnSync('where.exe', stringArgs, { ...spawnOptions, shell: false });
      break;
    case 'which':
    case 'which.exe':
      result = spawnSync('which', stringArgs, { ...spawnOptions, shell: false });
      break;
    case 'docker':
    case 'docker.exe':
      result = spawnSync('docker', stringArgs, { ...spawnOptions, shell: false });
      break;
    case 'gitleaks':
    case 'gitleaks.exe':
      result = spawnSync('gitleaks', stringArgs, { ...spawnOptions, shell: false });
      break;
    case 'semgrep':
    case 'semgrep.exe':
      result = spawnSync('semgrep', stringArgs, { ...spawnOptions, shell: false });
      break;
    case 'python':
    case 'python.exe':
      result = spawnSync('python', stringArgs, { ...spawnOptions, shell: false });
      break;
    case 'python3':
    case 'python3.exe':
      result = spawnSync('python3', stringArgs, { ...spawnOptions, shell: false });
      break;
    case 'py':
    case 'py.exe':
      result = spawnSync('py', stringArgs, { ...spawnOptions, shell: false });
      break;
    case 'dependency-check':
      result = spawnSync('dependency-check', stringArgs, spawnOptions);
      break;
    case 'dependency-check.bat':
      result = spawnSync('dependency-check.bat', stringArgs, spawnOptions);
      break;
    case 'dependency-check.sh':
      result = spawnSync('dependency-check.sh', stringArgs, spawnOptions);
      break;
    case 'node':
    case 'node.exe':
      result = spawnSync(process.execPath, stringArgs, { ...spawnOptions, shell: false });
      break;
    default:
      // Workspace-local script path already validated against workspaceRoot above.
      result = spawnSync(process.execPath, [normalizedCommand, ...stringArgs], { ...spawnOptions, shell: false });
      break;
  }

  return {
    status: result.status === null ? Exit.ERROR : result.status,
    signal: result.signal,
    error: result.error,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? ''
  };
}

function commandError(message) {
  return {
    status: Exit.ERROR,
    signal: null,
    error: new Error(message),
    stdout: '',
    stderr: ''
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
