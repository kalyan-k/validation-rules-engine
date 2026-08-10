#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const scripts = [
  'run-npm-audit.mjs',
  'run-dependency-check.mjs'
];

let worst = 0;
for (const script of scripts) {
  const result = spawnSync(process.execPath, [path.join(workspaceRoot, 'tools/security/scripts', script)], {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
    shell: false
  });
  const code = result.status ?? 2;
  if (code > worst) worst = code;
}

process.exit(worst);
