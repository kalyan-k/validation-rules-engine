import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const cliPath = path.join(workspaceRoot, 'node_modules', '@playwright', 'test', 'cli.js');
const outputPath = path.join(workspaceRoot, 'artifacts', 'playwright', 'catalog', 'results.json');

if (!fs.existsSync(cliPath)) {
  console.error('Playwright CLI was not found. Run npm install first.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [cliPath, 'test', '--list', '--reporter=json'], {
  cwd: workspaceRoot,
  env: process.env,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});

if ((result.status ?? 1) !== 0) {
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

try {
  const payload = JSON.parse(result.stdout);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${path.relative(workspaceRoot, outputPath)}`);
} catch (error) {
  console.error('Playwright test catalog output was not valid JSON.');
  if (result.stderr) process.stderr.write(result.stderr);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
