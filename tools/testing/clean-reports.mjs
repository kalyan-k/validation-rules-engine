import fs from 'node:fs';
import path from 'node:path';
import {
  assertProject,
  isDirectModule,
  projectReportRoot,
  reportsRoot,
  workspaceRoot
} from './report-paths.mjs';

function assertWorkspace() {
  const packageFile = path.join(workspaceRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));

  if (packageJson.name !== 'validation-rules-engine-workspace') {
    throw new Error(`Refusing to clean reports outside the Validation Rules Engine workspace: ${workspaceRoot}`);
  }
}

function assertSafeTarget(target) {
  const relative = path.relative(reportsRoot, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to remove a path outside the reports directory: ${target}`);
  }
}

export function cleanReports(projectName) {
  assertWorkspace();

  if (projectName) {
    assertProject(projectName);
    const target = projectReportRoot(projectName);
    assertSafeTarget(target);
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(reportsRoot, { recursive: true });
    return target;
  }

  if (path.dirname(reportsRoot) !== workspaceRoot || path.basename(reportsRoot) !== 'reports') {
    throw new Error(`Refusing to remove an unexpected reports directory: ${reportsRoot}`);
  }

  fs.rmSync(reportsRoot, { recursive: true, force: true });
  fs.mkdirSync(reportsRoot, { recursive: true });
  return reportsRoot;
}

if (isDirectModule(import.meta.url)) {
  try {
    const projectName = process.argv[2];
    const cleaned = cleanReports(projectName);
    console.log(`Cleaned generated reports: ${path.relative(workspaceRoot, cleaned) || 'reports'}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
