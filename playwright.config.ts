import { defineConfig, devices } from '@playwright/test';
import { applicationBaseUrls } from './playwright/config/applications';

const baseUrls = applicationBaseUrls();
const isCI = !!process.env['CI'];
const reuseExistingServer = process.env['PLAYWRIGHT_REUSE_SERVER'] === '1' || (!isCI && process.env['PLAYWRIGHT_REUSE_SERVER'] !== '0');
const headless = process.env['PLAYWRIGHT_HEADLESS'] === '0' ? false : true;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01
    }
  },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  outputDir: 'artifacts/playwright/test-results',
  snapshotPathTemplate: 'tests/e2e/shared/visual/__snapshots__/{testFilePath}/{arg}{ext}',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'artifacts/playwright/html-report', open: 'never' }],
    ['json', { outputFile: 'artifacts/playwright/json/results.json' }],
    ['junit', { outputFile: 'artifacts/playwright/junit/test-results.xml' }]
  ],
  use: {
    baseURL: baseUrls.portal,
    headless,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    actionTimeout: 12_000,
    navigationTimeout: 45_000
  },
  webServer: {
    command: 'node playwright/scripts/start-platform.mjs',
    url: `${baseUrls.portal}/health/ready`,
    timeout: 600_000,
    reuseExistingServer
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/shared/accessibility/**', '**/shared/visual/**', '**/shared/responsive/**']
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: ['**/shared/accessibility/**', '**/shared/visual/**', '**/shared/responsive/**']
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: ['**/shared/accessibility/**', '**/shared/visual/**', '**/shared/responsive/**']
    },
    {
      name: 'accessibility-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*shared\/accessibility\/.*\.spec\.ts/
    },
    {
      name: 'visual-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*shared\/visual\/.*\.spec\.ts/,
      outputDir: 'artifacts/playwright/visual-diffs'
    },
    {
      name: 'responsive-tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 834, height: 1194 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2
      },
      testMatch: /.*shared\/responsive\/.*\.spec\.ts/
    },
    {
      name: 'responsive-mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /.*shared\/responsive\/.*\.spec\.ts/
    }
  ]
});
