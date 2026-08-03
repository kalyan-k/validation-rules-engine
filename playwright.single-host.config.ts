import { defineConfig, devices } from '@playwright/test';

const origin = process.env['PLAYWRIGHT_SINGLE_HOST_BASE_URL'] ?? 'http://127.0.0.1:4400';
process.env['PLAYWRIGHT_PORTAL_BASE_URL'] = origin;
process.env['PLAYWRIGHT_DOCS_BASE_URL'] = origin;
process.env['PLAYWRIGHT_ANGULAR_BASE_URL'] = `${origin}/showcases/angular`;
process.env['PLAYWRIGHT_REACT_BASE_URL'] = `${origin}/showcases/react`;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/shared/navigation/platform-navigation.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  outputDir: 'artifacts/playwright/hosting-single-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'artifacts/playwright/hosting-single-report', open: 'never' }],
    ['junit', { outputFile: 'artifacts/playwright/hosting-single-junit.xml' }]
  ],
  use: {
    baseURL: origin,
    ...devices['Desktop Chrome'],
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node playwright/scripts/start-single-host.mjs',
    url: `${origin}/health/ready`,
    timeout: 600_000,
    reuseExistingServer: false
  },
  projects: [{ name: 'single-host-chromium' }]
});
