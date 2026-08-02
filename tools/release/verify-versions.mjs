import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const includeDist = process.argv.includes('--dist');
const verifyTag = process.argv.includes('--tag');
const packageManifests = [
  ['@validation-rules-engine/core', 'packages/core/package.json'],
  ['@validation-rules-engine/angular', 'packages/angular/package.json'],
  ['@validation-rules-engine/react', 'packages/react/package.json']
];
const rootManifest = readManifest('package.json');
const expectedVersion = rootManifest.version;

assertVersion(expectedVersion, 'workspace');

for (const [expectedName, manifestPath] of packageManifests) {
  const manifest = readManifest(manifestPath);
  if (manifest.name !== expectedName) {
    fail(`${manifestPath} must be named ${expectedName}; found ${manifest.name ?? 'no name'}.`);
  }
  if (manifest.version !== expectedVersion) {
    fail(`${expectedName} must use synchronized version ${expectedVersion}; found ${manifest.version ?? 'no version'}.`);
  }
}

const compatibleCoreRange = `^${expectedVersion.split('.')[0]}.0.0`;
for (const adapterPath of ['packages/angular/package.json', 'packages/react/package.json']) {
  const manifest = readManifest(adapterPath);
  if (manifest.peerDependencies?.['@validation-rules-engine/core'] !== compatibleCoreRange) {
    fail(`${manifest.name} must declare @validation-rules-engine/core as ${compatibleCoreRange}.`);
  }
}

if (includeDist) {
  for (const [expectedName, sourcePath] of packageManifests) {
    const directory = path.basename(path.dirname(sourcePath));
    const manifestPath = `dist/packages/${directory}/package.json`;
    const manifest = readManifest(manifestPath);
    if (manifest.name !== expectedName || manifest.version !== expectedVersion) {
      fail(`${manifestPath} does not match ${expectedName}@${expectedVersion}.`);
    }
  }
}

if (verifyTag) {
  const tag = process.env.GITHUB_REF_NAME ?? process.env.npm_package_version;
  if (tag !== `v${expectedVersion}`) {
    fail(`Release tag must be v${expectedVersion}; found ${tag ?? 'no tag'}.`);
  }
}

console.log(`Verified synchronized package release ${expectedVersion}${includeDist ? ' in source and dist' : ''}.`);

function readManifest(relativePath) {
  const manifestPath = path.join(workspaceRoot, relativePath);
  if (!existsSync(manifestPath)) {
    fail(`Required package manifest is missing: ${relativePath}`);
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

function assertVersion(version, label) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version ?? '')) {
    fail(`${label} version must be a valid release or prerelease Semantic Version; found ${version ?? 'none'}.`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
