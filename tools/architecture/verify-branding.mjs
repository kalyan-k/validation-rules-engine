import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const brandingVerifierPath = fileURLToPath(import.meta.url);
const textExtensions = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs', '.sass', '.scss', '.svg',
  '.ts', '.tsx', '.txt', '.webmanifest', '.yaml', '.yml'
]);
const failures = [];

function relative(filePath) {
  return path.relative(workspaceRoot, filePath).replaceAll('\\', '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function trackedTextFiles() {
  return execFileSync('git', ['ls-files', '-z'], { cwd: workspaceRoot, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
    .map((file) => path.join(workspaceRoot, file))
    .filter((file) => textExtensions.has(path.extname(file)) && fs.existsSync(file));
}

const forbiddenReferences = [
  [/@validation-rules(?:\/|\\\/)/g, 'legacy npm scope'],
  [/validation-rules-workspace/g, 'legacy workspace name'],
  [/github\.com(?::|\/)kalyan-k\/validation-rules(?!-engine)/g, 'legacy repository URL'],
  [/\bVALIDATION_RULES_/g, 'legacy environment-variable prefix'],
  [/\bvalidationRulesPlatformConfig\b/g, 'legacy runtime-config global'],
  [/validation-rules-(?:mark|icon-)/g, 'legacy brand-asset filename'],
  [/validation-rules:report-summary/g, 'legacy report preference key'],
  [/Validation Rules Engine Engine/g, 'duplicated product name'],
  [/# What is Validation Rules\?/g, 'legacy product heading']
];

for (const file of trackedTextFiles()) {
  if (file === brandingVerifierPath) continue;
  const source = fs.readFileSync(file, 'utf8');
  for (const [pattern, label] of forbiddenReferences) {
    pattern.lastIndex = 0;
    if (pattern.test(source)) failures.push(`${relative(file)} contains a ${label}.`);
  }
}

const expectedPackages = new Map([
  ['package.json', 'validation-rules-engine-workspace'],
  ['packages/core/package.json', '@validation-rules-engine/core'],
  ['packages/angular/package.json', '@validation-rules-engine/angular'],
  ['packages/react/package.json', '@validation-rules-engine/react'],
  ['apps/portal/package.json', '@validation-rules-engine/portal'],
  ['apps/docs/package.json', '@validation-rules-engine/docs'],
  ['apps/angular-showcase/package.json', '@validation-rules-engine/angular-showcase'],
  ['apps/react-showcase/package.json', '@validation-rules-engine/react-showcase']
]);

for (const [packagePath, expectedName] of expectedPackages) {
  const actualName = readJson(path.join(workspaceRoot, packagePath)).name;
  if (actualName !== expectedName) failures.push(`${packagePath} must use package name ${expectedName}.`);
}

const shellRoot = path.join(workspaceRoot, 'tools', 'platform-shell');
for (const asset of [
  'vre-mark.svg', 'vre-icon-16.png', 'vre-icon-32.png', 'vre-icon-64.png',
  'vre-icon-180.png', 'vre-icon-192.png', 'vre-icon-512.png'
]) {
  if (!fs.existsSync(path.join(shellRoot, asset))) failures.push(`Missing VRE brand asset: tools/platform-shell/${asset}`);
}

for (const asset of ['validation-rules-mark.svg', 'validation-rules-icon-192.png', 'validation-rules-icon-512.png']) {
  if (fs.existsSync(path.join(shellRoot, asset))) failures.push(`Legacy brand asset still exists: tools/platform-shell/${asset}`);
}

const readme = fs.readFileSync(path.join(workspaceRoot, 'README.md'), 'utf8');
const overview = fs.readFileSync(path.join(workspaceRoot, 'docs', 'site', 'overview.md'), 'utf8');
if (!readme.includes('Validation Rules Engine (VRE)')) failures.push('README.md must introduce Validation Rules Engine (VRE).');
if (!overview.includes('Validation Rules Engine (VRE)')) failures.push('The documentation overview must introduce Validation Rules Engine (VRE).');

if (failures.length > 0) {
  console.error(`Branding verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Verified Validation Rules Engine (VRE) branding, npm scope, repository metadata, runtime configuration, and shared assets.');
}
