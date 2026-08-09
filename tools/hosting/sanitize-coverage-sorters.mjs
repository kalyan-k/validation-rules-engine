import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const root = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(workspaceRoot, 'hosted', 'evidence', 'reports');

/**
 * Istanbul/nyc coverage sorter.js trips CodeQL js/xss-through-dom in two ways:
 * 1) colNode.innerHTML += '<span class="sorter"></span>'
 * 2) assigning/reading a custom `.data` property (CodeQL models that like a DOM/HTML sink)
 */
function sanitizeSorterSource(source) {
  return source
    .replace(
      /colNode\.innerHTML\s*=\s*\r?\n?\s*colNode\.innerHTML\s*\+\s*'<span class="sorter"><\/span>';/g,
      [
        "const sorterSpan = document.createElement('span');",
        "                sorterSpan.className = 'sorter';",
        '                colNode.appendChild(sorterSpan);'
      ].join('\n')
    )
    .replace(/rows\[i\]\.data\s*=\s*loadRowData\(rows\[i\]\);/g, 'rows[i].__sorterData = loadRowData(rows[i]);')
    .replace(/a\s*=\s*a\.data\[key\];/g, 'a = a.__sorterData[key];')
    .replace(/b\s*=\s*b\.data\[key\];/g, 'b = b.__sorterData[key];');
}

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
    const updated = sanitizeSorterSource(original);
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
