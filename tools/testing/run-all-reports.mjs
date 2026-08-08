import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { cleanReports } from './clean-reports.mjs';
import { generateReportIndex } from './generate-report-platform.mjs';
import { verifyReports } from './verify-reports.mjs';
import {
  projects,
  npmRunInvocation,
  projectScriptName,
  requiredProjectReports,
  workspaceRoot
} from './report-paths.mjs';

const useCiLauncher = process.argv.includes('--ci') || process.env.CI === 'true';
let failed = false;

function childEnv() {
  const options = new Set(
    String(process.env.NODE_OPTIONS || '')
      .split(/\s+/u)
      .map((value) => value.trim())
      .filter(Boolean)
  );
  options.add('--max-old-space-size=8192');
  return {
    ...process.env,
    NODE_OPTIONS: [...options].join(' ')
  };
}

try {
  cleanReports();

  for (const projectName of projects) {
    const scriptName = `test:coverage:${projectScriptName(projectName)}${useCiLauncher ? ':ci' : ''}`;
    const invocation = npmRunInvocation(scriptName);
    console.log(`\nGenerating ${projectName} test and coverage reports...`);
    const result = spawnSync(invocation.command, invocation.args, {
      cwd: workspaceRoot,
      env: childEnv(),
      stdio: 'inherit',
      shell: false
    });

    if (result.error) {
      console.error(result.error.stack || result.error);
      failed = true;
    } else if (result.status !== 0) {
      failed = true;
      console.error(`${projectName} coverage command exited with status ${result.status}.`);
    }

    const missing = requiredProjectReports(projectName).filter((file) => !fs.existsSync(file));
    if (missing.length > 0) {
      failed = true;
      console.error(`Missing generated ${projectName} report files:`);
      missing.forEach((file) => console.error(`- ${path.relative(workspaceRoot, file)}`));
    }
  }

  const dashboard = generateReportIndex();
  console.log(`Generated report dashboard: ${path.relative(workspaceRoot, dashboard.output)}`);
  if (dashboard.missing.length > 0) {
    failed = true;
  }

  const verificationFailures = verifyReports();
  if (verificationFailures.length > 0) {
    failed = true;
    console.error(`Report verification failed with ${verificationFailures.length} issue(s):`);
    verificationFailures.forEach((failure) => console.error(`- ${failure}`));
  } else {
    console.log('Verified generated report structure and local navigation.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  failed = true;
}

process.exitCode = failed ? 1 : 0;
