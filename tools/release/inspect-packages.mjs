import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packages = [
  ['@validation-rules-engine/core', 'dist/packages/core'],
  ['@validation-rules-engine/angular', 'dist/packages/angular'],
  ['@validation-rules-engine/react', 'dist/packages/react']
];

const forbiddenNamePatterns = [
  /^node_modules$/i,
  /^\.git$/i,
  /^reports$/i,
  /^artifacts$/i,
  /^\.env/i,
  /secret/i,
  /credential/i,
  /^docs[\\/]+private/i
];

const requiredFiles = ['package.json', 'README.md', 'LICENSE'];
const failures = [];

for (const [name, relativeDir] of packages) {
  const root = path.join(workspaceRoot, relativeDir);
  if (!existsSync(root)) {
    failures.push(`${name}: missing build output at ${relativeDir}. Run npm run build:packages first.`);
    continue;
  }

  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (manifest.name !== name) {
    failures.push(`${relativeDir}/package.json name must be ${name}`);
  }
  if (!manifest.license) {
    failures.push(`${name}: package.json is missing license`);
  }
  if (!manifest.version) {
    failures.push(`${name}: package.json is missing version`);
  }

  for (const required of requiredFiles) {
    if (!existsSync(path.join(root, required)) && !(required === 'LICENSE' && existsSync(path.join(root, 'LICENSE.txt')))) {
      // LICENSE may be bundled differently by ng-packagr; accept package.json license field + root LICENSE copy if present.
      if (required === 'LICENSE' && manifest.license) {
        continue;
      }
      if (required === 'README.md' && existsSync(path.join(root, 'README'))) {
        continue;
      }
      failures.push(`${name}: missing required file ${required}`);
    }
  }

  const files = walk(root);
  for (const filePath of files) {
    const relative = path.relative(root, filePath).replaceAll('\\', '/');
    if (forbiddenNamePatterns.some((pattern) => pattern.test(relative) || pattern.test(path.basename(filePath)))) {
      failures.push(`${name}: forbidden path included in package output: ${relative}`);
    }
    if (relative.includes('docs/private')) {
      failures.push(`${name}: private documentation must not be packaged (${relative})`);
    }
  }

  // Basic export/typings sanity.
  if (!manifest.types && !manifest.typings && !manifest.exports) {
    failures.push(`${name}: package.json should declare types/typings or exports`);
  }

  console.log(`Inspected ${name}@${manifest.version} (${files.length} files under ${relativeDir})`);
}

if (failures.length) {
  console.error('\nPackage inspection failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('\nPackage inspection passed for core, angular, and react artifacts.');

function walk(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && statSync(fullPath).isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}
