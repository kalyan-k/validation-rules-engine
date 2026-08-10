import path from 'node:path';
import { Exit, loadPolicy, runCommand, summarizeResult, which, workspaceRoot, writeJsonReport, writeReport, reportsDir } from '../lib/security-common.mjs';

const policy = loadPolicy();
const outDir = reportsDir('dependency-check');
const dependencyCheck = which('dependency-check') || which('dependency-check.bat');
const docker = which('docker');

let status = Exit.PASS;
let summary = `No Dependency-Check findings at CVSS >= ${policy.dependencyCheck.failOnCVSS}`;
let reportPaths = [
  path.join(outDir, 'dependency-check-report.html'),
  path.join(outDir, 'dependency-check-report.json')
];

if (!dependencyCheck && !docker) {
  const output = summarizeResult({
    scanner: 'dependency-check',
    status: Exit.ERROR,
    summary: 'OWASP Dependency-Check CLI is not installed and Docker is not available. Install the CLI, enable Docker, or use CI. npm audit remains the primary SCA gate.',
    details: { limitations: policy.dependencyCheck.limitations },
    reportPaths: []
  });
  writeJsonReport('dependency-check', 'summary.json', output);
  writeReport('dependency-check', 'README.txt', [
    'OWASP Dependency-Check was skipped because neither the CLI nor Docker was available.',
    '',
    'Limitations:',
    ...policy.dependencyCheck.limitations.map((item) => `- ${item}`),
    '',
    'Install options:',
    '- CLI: https://github.com/jeremylong/DependencyCheck',
    '- Docker: docker pull owasp/dependency-check:latest',
    '- Optional NVD_API_KEY to reduce NVD rate limiting',
    ''
  ].join('\n'));
  console.log(JSON.stringify(output));
  process.exit(Exit.ERROR);
}

let result;
if (dependencyCheck) {
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
  if (process.env[policy.dependencyCheck.nvdApiKeyEnv]) {
    args.push('--nvdApiKey', process.env[policy.dependencyCheck.nvdApiKeyEnv]);
  }
  result = runCommand(dependencyCheck, args, { timeout: 1000 * 60 * 45 });
} else {
  const args = [
    'run',
    '--rm',
    '-v', `${workspaceRoot}:/src:ro`,
    '-v', `${outDir}:/report:rw`,
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
  if (process.env[policy.dependencyCheck.nvdApiKeyEnv]) {
    args.push('--nvdApiKey', process.env[policy.dependencyCheck.nvdApiKeyEnv]);
  }
  result = runCommand(docker, args, { timeout: 1000 * 60 * 45 });
}

if (result.error) {
  status = Exit.ERROR;
  summary = `dependency-check could not execute: ${result.error.message}`;
} else if (result.status !== 0) {
  status = result.status === 1 ? Exit.FAIL : Exit.ERROR;
  summary = status === Exit.FAIL
    ? `Dependency-Check reported findings at CVSS >= ${policy.dependencyCheck.failOnCVSS}`
    : `dependency-check exited with status ${result.status}`;
  writeReport('dependency-check', 'dependency-check.stderr.txt', `${result.stdout}\n${result.stderr}`);
}

const output = summarizeResult({
  scanner: 'dependency-check',
  status,
  summary,
  details: {
    limitations: policy.dependencyCheck.limitations,
    runner: dependencyCheck ? 'cli' : 'docker'
  },
  reportPaths
});
writeJsonReport('dependency-check', 'summary.json', output);
console.log(JSON.stringify(output));
process.exit(status);
