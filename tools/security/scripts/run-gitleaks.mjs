import path from 'node:path';
import { Exit, loadPolicy, reportsDir, runCommand, summarizeResult, which, workspaceRoot, writeJsonReport, writeReport } from '../lib/security-common.mjs';

const policy = loadPolicy();
reportsDir('gitleaks');
const reportJson = path.join(workspaceRoot, policy.reportsRoot, 'gitleaks', 'gitleaks.json');
const reportSarif = path.join(workspaceRoot, policy.reportsRoot, 'gitleaks', 'gitleaks.sarif');
const gitleaks = which('gitleaks');

if (!gitleaks) {
  const output = summarizeResult({
    scanner: 'gitleaks',
    status: Exit.ERROR,
    summary: 'gitleaks is not installed or not on PATH. Install from https://github.com/gitleaks/gitleaks/releases or use CI.',
    reportPaths: []
  });
  writeJsonReport('gitleaks', 'summary.json', output);
  console.log(JSON.stringify(output));
  process.exit(Exit.ERROR);
}

const noGit = process.env.VRE_GITLEAKS_NO_GIT === '1';
const common = [
  'detect',
  '--source', workspaceRoot,
  '--config', path.join(workspaceRoot, policy.gitleaks.config),
  '--redact',
  ...(noGit ? ['--no-git'] : []),
  '--exit-code', '1'
];

const result = runCommand(gitleaks, [
  ...common.slice(0, -2),
  '--report-format', 'json',
  '--report-path', reportJson,
  '--exit-code', '1'
]);

runCommand(gitleaks, [
  ...common.slice(0, -2),
  '--report-format', 'sarif',
  '--report-path', reportSarif,
  '--exit-code', '0'
]);

let status = Exit.PASS;
let summary = 'No secrets detected';
if (result.error) {
  status = Exit.ERROR;
  summary = `gitleaks could not execute: ${result.error.message}`;
} else if (result.status === 1) {
  status = Exit.FAIL;
  summary = 'Potential secrets detected (details redacted in report)';
} else if (result.status !== 0) {
  status = Exit.ERROR;
  summary = `gitleaks exited with status ${result.status}`;
  writeReport('gitleaks', 'gitleaks.stderr.txt', result.stderr || result.stdout);
}

const output = summarizeResult({
  scanner: 'gitleaks',
  status,
  summary,
  details: { mode: noGit ? 'filesystem' : 'git' },
  reportPaths: [reportJson, reportSarif]
});
writeJsonReport('gitleaks', 'summary.json', output);
console.log(JSON.stringify(output));
process.exit(status);
