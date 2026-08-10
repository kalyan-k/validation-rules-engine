import path from 'node:path';
import { Exit, loadPolicy, npmCommand, reportsDir, runCommand, summarizeResult, workspaceRoot, writeJsonReport, writeReport } from '../lib/security-common.mjs';

const policy = loadPolicy();
const outDir = reportsDir('sbom');
const npmCmd = npmCommand();

const packageWorkspaces = [
  ['core', '@validation-rules-engine/core'],
  ['angular', '@validation-rules-engine/angular'],
  ['react', '@validation-rules-engine/react']
];

const reportPaths = [];
const failures = [];

for (const [slug, workspaceName] of packageWorkspaces) {
  const outputFile = path.join(outDir, `${slug}.cdx.json`);
  const result = runCommand(npmCmd, [
    'exec',
    '--yes',
    '@cyclonedx/cyclonedx-npm@3.1.0',
    '--',
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
const workspaceResult = runCommand(npmCmd, [
  'exec',
  '--yes',
  '@cyclonedx/cyclonedx-npm@3.1.0',
  '--',
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
    note: 'SBOMs are generated from the workspace lockfile (package-lock-only) for publishable workspaces and the monorepo root.'
  },
  reportPaths
});
writeJsonReport('sbom', 'summary.json', output);
console.log(JSON.stringify(output));
process.exit(output.status);
