import { existsSync } from 'node:fs';
import path from 'node:path';
import { Exit, loadPolicy, reportsDir, runCommand, summarizeResult, workspaceRoot, writeJsonReport, writeReport } from '../lib/security-common.mjs';

const policy = loadPolicy();
const outDir = reportsDir('sbom');

const packageWorkspaces = [
  ['core', '@validation-rules-engine/core'],
  ['angular', '@validation-rules-engine/angular'],
  ['react', '@validation-rules-engine/react']
];

const localCliCandidates = [
  path.join(workspaceRoot, 'node_modules', '@cyclonedx', 'cyclonedx-npm', 'bin', 'cyclonedx-npm-cli.js'),
  path.join(workspaceRoot, 'node_modules', '.bin', 'cyclonedx-npm')
];
const localCli = localCliCandidates.find((candidate) => existsSync(candidate));

if (!localCli) {
  const output = summarizeResult({
    scanner: 'sbom',
    status: Exit.ERROR,
    summary: 'CycloneDX CLI is not installed in this workspace. Run npm ci / npm install so @cyclonedx/cyclonedx-npm is available.',
    details: { standard: policy.sbom.standard },
    reportPaths: []
  });
  writeJsonReport('sbom', 'summary.json', output);
  console.log(JSON.stringify(output));
  process.exit(Exit.ERROR);
}

const reportPaths = [];
const failures = [];

for (const [slug, workspaceName] of packageWorkspaces) {
  const outputFile = path.join(outDir, `${slug}.cdx.json`);
  const result = runCycloneDx([
    '--output-file', outputFile,
    '--output-reproducible',
    '--package-lock-only',
    '--ignore-npm-errors',
    '--mc-type', 'library',
    '--workspace', workspaceName,
    path.join(workspaceRoot, 'package.json')
  ]);
  if (result.status !== 0) {
    failures.push(slug);
    writeReport('sbom', `${slug}.stderr.txt`, `${result.stdout}\n${result.stderr}`);
  } else {
    reportPaths.push(outputFile);
  }
}

const workspaceSbom = path.join(outDir, 'workspace.cdx.json');
const workspaceResult = runCycloneDx([
  '--output-file', workspaceSbom,
  '--output-reproducible',
  '--package-lock-only',
  '--ignore-npm-errors',
  '--mc-type', 'application',
  path.join(workspaceRoot, 'package.json')
]);
if (workspaceResult.status === 0) {
  reportPaths.push(workspaceSbom);
} else {
  failures.push('workspace');
  writeReport('sbom', 'workspace.stderr.txt', `${workspaceResult.stdout}\n${workspaceResult.stderr}`);
}

const status = failures.length ? Exit.FAIL : Exit.PASS;
const summary = failures.length
  ? `SBOM generation failed for: ${failures.join(', ')}`
  : `Generated CycloneDX SBOM for ${reportPaths.length} artifact(s)`;

const output = summarizeResult({
  scanner: 'sbom',
  status: workspaceResult.error ? Exit.ERROR : status,
  summary,
  details: {
    standard: policy.sbom.standard,
    cli: path.relative(workspaceRoot, localCli),
    note: 'SBOMs are generated from the workspace lockfile (package-lock-only) via the locally installed @cyclonedx/cyclonedx-npm package.'
  },
  reportPaths
});
writeJsonReport('sbom', 'summary.json', output);
console.log(JSON.stringify(output));
process.exit(output.status);

function runCycloneDx(args) {
  // Prefer the JS entrypoint through Node so Windows .cmd shims are unnecessary.
  if (localCli.endsWith('.js')) {
    return runCommand(process.execPath, [localCli, ...args]);
  }
  return runCommand(localCli, args);
}
