import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const target = path.resolve(workspaceRoot, 'artifacts', 'playwright');
const artifactsRoot = path.resolve(workspaceRoot, 'artifacts');

if (!target.startsWith(`${artifactsRoot}${path.sep}`)) {
  throw new Error(`Refusing to clean unsafe Playwright artifact path: ${target}`);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.join(target, 'portal-data'), { recursive: true });
console.log(`Cleaned ${path.relative(workspaceRoot, target)}`);
