import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSiteBasePath, withSiteBase } from './site-base-path.mjs';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const siteBase = getSiteBasePath();
const baseHref = withSiteBase('/showcases/angular/', siteBase);
const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) {
  console.error('Run the Angular hosted build through an npm script so npm_execpath is available.');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [npmExecPath, 'run', 'ng', '--', 'build', 'angular-showcase', '--configuration', 'hosted', `--base-href=${baseHref}`],
  {
    cwd: workspaceRoot,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true
  }
);

process.exit(result.status ?? 1);
