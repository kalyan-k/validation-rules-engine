import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Exit, loadPolicy, runCommand, summarizeResult, which, workspaceRoot, writeJsonReport, writeReport, reportsDir } from '../lib/security-common.mjs';

const nvdApiKeyFile = path.join(workspaceRoot, 'tools/security/config/nvd-api-key.local');

const policy = loadPolicy();
const outDir = reportsDir('dependency-check');
const dependencyCheck = which('dependency-check') || which('dependency-check.bat');
const docker = which('docker');

function finish({ status, summary, runner, reportPaths = [] }) {
  const output = summarizeResult({
    scanner: 'dependency-check',
    status,
    summary,
    details: {
      limitations: policy.dependencyCheck.limitations,
      runner
    },
    reportPaths
  });
  writeJsonReport('dependency-check', 'summary.json', output);
  console.log(JSON.stringify(output));
  process.exit(status);
}

if (!dependencyCheck && !docker) {
  writeReport('dependency-check', 'README.txt', [
    'OWASP Dependency-Check was skipped because neither the CLI nor Docker was available.',
    '',
    'Install options:',
    '- CLI: https://github.com/jeremylong/DependencyCheck',
    '- Docker Desktop (Windows): start Docker Desktop, then: docker pull owasp/dependency-check:latest',
    '- Optional NVD_API_KEY to reduce NVD rate limiting',
    ''
  ].join('\n'));
  finish({
    status: Exit.ERROR,
    summary: 'OWASP Dependency-Check CLI is not installed and Docker is not available. Install the CLI, start Docker Desktop, or use CI. npm audit remains the primary SCA gate.',
    runner: 'none'
  });
}

if (!dependencyCheck) {
  const dockerProbe = runCommand('docker', ['info'], { timeout: 1000 * 30 });
  const probeText = `${dockerProbe.stdout}\n${dockerProbe.stderr}`;
  if (dockerProbe.status !== 0 || /failed to connect to the docker API|dockerDesktopLinuxEngine|Is the docker daemon running/i.test(probeText)) {
    writeReport('dependency-check', 'dependency-check.stderr.txt', probeText);
    finish({
      status: Exit.ERROR,
      summary: 'Docker CLI is installed but the Docker Desktop engine is not running. Start Docker Desktop, wait until it is ready, then re-run. npm audit remains the primary SCA gate.',
      runner: 'docker'
    });
  }
}

let result;
let runner;
if (dependencyCheck) {
  runner = 'cli';
  const args = [
    '--project', 'validation-rules-engine',
    '--scan', path.join(workspaceRoot, 'package-lock.json'),
    '--scan', path.join(workspaceRoot, 'packages'),
    '--format', 'HTML',
    '--format', 'JSON',
    '--out', outDir,
    '--suppression', path.join(workspaceRoot, 'tools/security/config/dependency-check-suppressions.xml'),
    '--failOnCVSS', String(policy.dependencyCheck.failOnCVSS),
    '--enableExperimental'
  ];
  const nvdApiKey = readNvdApiKey();
  if (nvdApiKey) {
    args.push('--nvdApiKey', nvdApiKey);
  }
  result = runCommand(dependencyCheck, args, { timeout: 1000 * 60 * 45 });
} else {
  runner = 'docker';
  const dataDir = reportsDir('dependency-check', 'data');
  const args = [
    'run',
    '--rm',
    '-v', `${workspaceRoot}:/src:ro`,
    '-v', `${outDir}:/report:rw`,
    '-v', `${dataDir}:/usr/share/dependency-check/data:rw`,
    'owasp/dependency-check:latest',
    '--project', 'validation-rules-engine',
    '--scan', '/src/package-lock.json',
    '--scan', '/src/packages',
    '--format', 'HTML',
    '--format', 'JSON',
    '--out', '/report',
    '--suppression', '/src/tools/security/config/dependency-check-suppressions.xml',
    '--failOnCVSS', String(policy.dependencyCheck.failOnCVSS),
    '--enableExperimental'
  ];
  const nvdApiKey = readNvdApiKey();
  if (nvdApiKey) {
    args.push('--nvdApiKey', nvdApiKey);
  }
  result = runCommand('docker', args, { timeout: 1000 * 60 * 45 });
}

const combined = `${result.stdout}\n${result.stderr}`;
const htmlReport = path.join(outDir, 'dependency-check-report.html');
const jsonReport = path.join(outDir, 'dependency-check-report.json');
const reportsExist = existsSync(htmlReport) || existsSync(jsonReport);

if (result.error) {
  writeReport('dependency-check', 'dependency-check.stderr.txt', combined);
  finish({
    status: Exit.ERROR,
    summary: `dependency-check could not execute: ${result.error.message}`,
    runner
  });
}

if (/failed to connect to the docker API|dockerDesktopLinuxEngine|Is the docker daemon running/i.test(combined)) {
  writeReport('dependency-check', 'dependency-check.stderr.txt', combined);
  finish({
    status: Exit.ERROR,
    summary: 'Docker Desktop engine is not running, so Dependency-Check could not start. Start Docker Desktop and retry.',
    runner
  });
}

if (/Invalid API Key|Error updating the NVD Data|No documents exist/i.test(combined) && !reportsExist) {
  writeReport('dependency-check', 'dependency-check.stderr.txt', combined);
  const keyHint = readNvdApiKey()
    ? 'An NVD API key was found, but NVD rejected/failed the update. Verify the key is valid and retry.'
    : 'No NVD API key was visible to this process. PowerShell `$env:NVD_API_KEY=...` does not apply to Command Prompt/`npm` started from another terminal. Prefer tools/security/config/nvd-api-key.local (gitignored) or set the variable in the same shell that runs npm.';
  finish({
    status: Exit.ERROR,
    summary: `Dependency-Check could not download NVD vulnerability data. ${keyHint} Get a key at https://nvd.nist.gov/developers/request-an-api-key. npm audit remains the primary SCA gate.`,
    runner
  });
}

if (result.status !== 0 && !reportsExist) {
  writeReport('dependency-check', 'dependency-check.stderr.txt', combined);
  finish({
    status: Exit.ERROR,
    summary: `dependency-check exited with status ${result.status} before producing reports. See dependency-check.stderr.txt.`,
    runner
  });
}

if (result.status !== 0) {
  writeReport('dependency-check', 'dependency-check.stderr.txt', combined);
  finish({
    status: Exit.FAIL,
    summary: `Dependency-Check reported findings at CVSS >= ${policy.dependencyCheck.failOnCVSS}`,
    runner,
    reportPaths: [htmlReport, jsonReport].filter((filePath) => existsSync(filePath))
  });
}

finish({
  status: Exit.PASS,
  summary: `No Dependency-Check findings at CVSS >= ${policy.dependencyCheck.failOnCVSS}`,
  runner,
  reportPaths: [htmlReport, jsonReport].filter((filePath) => existsSync(filePath))
});

function readNvdApiKey() {
  const fromEnv = typeof process.env[policy.dependencyCheck.nvdApiKeyEnv] === 'string'
    ? process.env[policy.dependencyCheck.nvdApiKeyEnv].trim()
    : '';
  if (fromEnv) return fromEnv;

  if (!existsSync(nvdApiKeyFile)) return '';
  try {
    const fromFile = readFileSync(nvdApiKeyFile, 'utf8')
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#'));
    return fromFile || '';
  } catch {
    return '';
  }
}
