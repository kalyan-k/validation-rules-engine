import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const separator = process.argv.indexOf('--');
const forwardedArgs = separator >= 0 ? process.argv.slice(separator + 1) : process.argv.slice(2);
const hasExplicitProject = forwardedArgs.some((arg) => arg === '--project' || arg.startsWith('--project='));
const isList = forwardedArgs.includes('--list');
const isHelpOrList = isList || forwardedArgs.some((arg) => arg === '--help' || arg === '-h');
const hasExplicitReporter = forwardedArgs.some((arg) => arg === '--reporter' || arg.startsWith('--reporter='));
const effectiveForwardedArgs = isList && !hasExplicitReporter ? [...forwardedArgs, '--reporter=list'] : forwardedArgs;
const effectiveArgs = hasExplicitProject || isHelpOrList ? effectiveForwardedArgs : ['--project=chromium', ...effectiveForwardedArgs];
const workspaceRoot = process.cwd();
const cliPath = path.join(workspaceRoot, 'node_modules', '@playwright', 'test', 'cli.js');

if (!fs.existsSync(cliPath)) {
  console.error('Playwright CLI was not found. Run npm install first.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [cliPath, 'test', ...effectiveArgs], {
  cwd: workspaceRoot,
  env: process.env,
  stdio: 'inherit',
  windowsHide: true
});

const shouldGeneratePortalData = !isHelpOrList;
const catalogScript = path.join(workspaceRoot, 'playwright', 'scripts', 'generate-test-catalog.mjs');
if (shouldGeneratePortalData && fs.existsSync(catalogScript)) {
  const catalogResult = spawnSync(process.execPath, [catalogScript], {
    cwd: workspaceRoot,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true
  });
  if ((result.status ?? 0) === 0 && (catalogResult.status ?? 0) !== 0) {
    process.exit(catalogResult.status ?? 1);
  }
}

const portalDataScript = path.join(workspaceRoot, 'playwright', 'scripts', 'generate-portal-data.mjs');
if (shouldGeneratePortalData && fs.existsSync(portalDataScript)) {
  const portalDataResult = spawnSync(process.execPath, [portalDataScript, '--allow-missing'], {
    cwd: workspaceRoot,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true
  });
  if ((result.status ?? 0) === 0 && (portalDataResult.status ?? 0) !== 0) {
    process.exit(portalDataResult.status ?? 1);
  }
}

process.exit(result.status ?? 1);
