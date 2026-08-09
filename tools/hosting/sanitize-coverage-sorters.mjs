import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const root = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(workspaceRoot, 'hosted', 'evidence', 'reports');

const pattern = /colNode\.innerHTML\s*=\s*\r?\n?\s*colNode\.innerHTML\s*\+\s*'<span class="sorter"><\/span>';/g;
const replacement = "colNode.appendChild(document.createElement('span')).className = 'sorter';";

function walk(directory) {
  let patched = 0;
  if (!existsSync(directory)) {
    return patched;
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      patched += walk(fullPath);
      continue;
    }
    if (entry.name !== 'sorter.js') {
      continue;
    }
    const original = readFileSync(fullPath, 'utf8');
    const updated = original.replace(pattern, replacement);
    if (updated !== original) {
      writeFileSync(fullPath, updated, 'utf8');
      patched += 1;
      console.log(`patched ${path.relative(workspaceRoot, fullPath)}`);
    }
  }
  return patched;
}

const patched = walk(root);
console.log(`Sanitized ${patched} coverage sorter.js file(s) under ${path.relative(workspaceRoot, root)}`);
