import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const reportBranding = require('./report-branding.cjs');
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const targets = process.argv.slice(2).map((value) => path.resolve(value));
const roots = targets.length > 0
  ? targets
  : [
    path.join(workspaceRoot, 'reports'),
    path.join(workspaceRoot, 'hosted', 'evidence', 'reports')
  ];

const inlinedShellPattern = /<script src="\/platform-config\.js"><\/script>\s*<style>:host\s*\{[\s\S]*?<\/style>\s*<script>globalThis\.validationPlatformShellStyles=[\s\S]*?<\/script>/;
const replacement = reportBranding.reportHeadAssets();
const brandMarkPattern = /brand-mark-url="data:image\/svg\+xml;base64,[^"]*"/g;

function walkHtml(directory, files = []) {
  if (!existsSync(directory)) {
    return files;
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkHtml(fullPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

let updated = 0;
for (const root of roots) {
  for (const filePath of walkHtml(root)) {
    const original = readFileSync(filePath, 'utf8');
    if (!original.includes('validationPlatformShellStyles') && !original.includes('data:image/svg+xml;base64')) {
      continue;
    }
    let next = original;
    if (inlinedShellPattern.test(next)) {
      next = next.replace(inlinedShellPattern, replacement);
    }
    next = next.replace(brandMarkPattern, 'brand-mark-url="/vre-mark.svg"');
    if (next !== original) {
      writeFileSync(filePath, next, 'utf8');
      updated += 1;
      console.log(`refreshed ${path.relative(workspaceRoot, filePath)}`);
    }
  }
}

console.log(`Refreshed shell assets in ${updated} report HTML file(s).`);
