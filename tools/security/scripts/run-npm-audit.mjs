import { Exit, loadPolicy, npmCommand, runCommand, summarizeResult, writeJsonReport, writeReport } from '../lib/security-common.mjs';

const profile = process.argv.includes('--release') || process.argv.includes('--ci')
  ? (process.argv.includes('--release') ? 'release' : 'ci')
  : 'quick';

const policy = loadPolicy();
const level = profile === 'quick' ? policy.npmAudit.quickLevel : policy.npmAudit.releaseLevel;
const npm = npmCommand();
const result = runCommand(npm, [
  'audit',
  `--audit-level=${level}`,
  '--json'
]);

let parsed = null;
try {
  parsed = JSON.parse(result.stdout || '{}');
} catch {
  parsed = null;
}

const jsonPath = writeJsonReport('npm-audit', 'npm-audit.json', parsed ?? { raw: result.stdout, stderr: result.stderr });
const text = runCommand(npm, ['audit', `--audit-level=${level}`]);
const textPath = writeReport('npm-audit', 'npm-audit.txt', `${text.stdout}\n${text.stderr}`);

let status = Exit.PASS;
let summary = `No vulnerabilities at audit-level=${level}`;
if (result.error) {
  status = Exit.ERROR;
  summary = `npm audit could not execute: ${result.error.message}`;
} else if (result.status !== 0) {
  const meta = parsed?.metadata?.vulnerabilities ?? {};
  summary = `npm audit failed at audit-level=${level} (critical=${meta.critical ?? '?'}, high=${meta.high ?? '?'}, moderate=${meta.moderate ?? '?'}, low=${meta.low ?? '?'})`;
  status = Exit.FAIL;
}

const output = summarizeResult({
  scanner: 'npm-audit',
  status,
  summary,
  details: { level, profile, rationale: policy.npmAudit.rationale },
  reportPaths: [jsonPath, textPath]
});
writeJsonReport('npm-audit', 'summary.json', output);
console.log(JSON.stringify(output));
process.exit(status);
