import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const mode = process.argv[2];
if (mode !== 'single' && mode !== 'multi') {
  console.error('Usage: node playwright/scripts/run-hosting-navigation.mjs <single|multi>');
  process.exit(1);
}

const workspaceRoot = process.cwd();
const cliPath = path.join(workspaceRoot, 'node_modules', '@playwright', 'test', 'cli.js');
if (!existsSync(cliPath)) {
  console.error('Playwright CLI was not found. Run npm install first.');
  process.exit(1);
}

const args = mode === 'single'
  ? ['test', '--config=playwright.single-host.config.ts']
  : [
      'test',
      'tests/e2e/shared/navigation/platform-navigation.spec.ts',
      '--config=playwright.config.ts',
      '--project=chromium',
      '--workers=1',
      '--reporter=list',
      '--output=artifacts/playwright/hosting-multi-results'
    ];

const result = spawnSync(process.execPath, [cliPath, ...args], {
  cwd: workspaceRoot,
  env: {
    ...process.env,
    PLAYWRIGHT_REUSE_SERVER: '0'
  },
  stdio: 'inherit',
  windowsHide: true
});

process.exit(result.status ?? 1);
