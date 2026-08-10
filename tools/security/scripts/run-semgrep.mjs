import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { Exit, loadPolicy, reportsDir, runCommand, summarizeResult, which, workspaceRoot, writeJsonReport, writeReport } from '../lib/security-common.mjs';

const policy = loadPolicy();
const semgrepBin = which('semgrep') || which('semgrep.exe');
let command = null;
let prefix = [];

if (semgrepBin) {
  command = semgrepBin;
} else {
  for (const python of [which('python'), which('py')].filter(Boolean)) {
    const probe = runCommand(python, ['-m', 'semgrep', '--version']);
    const combined = `${probe.stdout}\n${probe.stderr}`;
    if (probe.status === 0 && !/No module named semgrep/i.test(combined)) {
      command = python;
      prefix = ['-m', 'semgrep'];
      break;
    }
  }
}

if (!command) {
  const output = summarizeResult({
    scanner: 'semgrep',
    status: Exit.ERROR,
    summary: 'semgrep is not installed. Install via `pip install semgrep` or use the CI workflow.',
    reportPaths: []
  });
  writeJsonReport('semgrep', 'summary.json', output);
  console.log(JSON.stringify(output));
  process.exit(Exit.ERROR);
}

reportsDir('semgrep');
const jsonPath = path.join(workspaceRoot, policy.reportsRoot, 'semgrep', 'semgrep.json');
const sarifPath = path.join(workspaceRoot, policy.reportsRoot, 'semgrep', 'semgrep.sarif');
const textPath = path.join(workspaceRoot, policy.reportsRoot, 'semgrep', 'semgrep.txt');

const baseArgs = [
  'scan',
  ...policy.semgrep.configs.flatMap((config) => ['--config', config]),
  '--config', path.join(workspaceRoot, 'tools/security/config/semgrep.yml'),
  ...policy.semgrep.exclude.flatMap((value) => ['--exclude', value]),
  '--error',
  '--metrics=off',
  '--quiet'
];

const jsonResult = runCommand(command, [
  ...prefix,
  ...baseArgs,
  '--json',
  '--output', jsonPath,
  ...policy.semgrep.paths
]);

runCommand(command, [
  ...prefix,
  ...baseArgs,
  '--sarif',
  '--output', sarifPath,
  ...policy.semgrep.paths
]);

const textResult = runCommand(command, [
  ...prefix,
  ...baseArgs.filter((arg) => arg !== '--quiet'),
  ...policy.semgrep.paths
]);
writeReport('semgrep', 'semgrep.txt', `${textResult.stdout}\n${textResult.stderr}`);

let status = Exit.PASS;
let summary = 'No Semgrep blocking findings';
const combined = `${jsonResult.stdout}\n${jsonResult.stderr}\n${textResult.stdout}\n${textResult.stderr}`;
if (jsonResult.error) {
  status = Exit.ERROR;
  summary = `semgrep could not execute: ${jsonResult.error.message}`;
} else if (/No module named semgrep/i.test(combined)) {
  status = Exit.ERROR;
  summary = 'semgrep is not installed. Install via `pip install semgrep` or use the CI workflow.';
} else if (jsonResult.status === 1) {
  const findingCount = countFindings(jsonPath);
  if (findingCount > 0) {
    status = Exit.FAIL;
    summary = `Semgrep reported ${findingCount} blocking finding(s)`;
  } else {
    status = Exit.ERROR;
    summary = 'semgrep exited with status 1 but produced no parseable findings';
    writeReport('semgrep', 'semgrep.stderr.txt', combined);
  }
} else if (jsonResult.status !== 0) {
  status = Exit.ERROR;
  summary = `semgrep exited with status ${jsonResult.status}`;
  writeReport('semgrep', 'semgrep.stderr.txt', combined);
}

const output = summarizeResult({
  scanner: 'semgrep',
  status,
  summary,
  reportPaths: [jsonPath, sarifPath, textPath]
});
writeJsonReport('semgrep', 'summary.json', output);
console.log(JSON.stringify(output));
process.exit(status);

function countFindings(filePath) {
  if (!existsSync(filePath)) return 0;
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed.results) ? parsed.results.length : 0;
  } catch {
    return 0;
  }
}
