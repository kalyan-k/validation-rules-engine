import { AxeBuilder } from '@axe-core/playwright';
import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import { baseUrls, type ApplicationBaseUrls } from '../config/applications';

type RuntimeIssue = {
  source: 'console' | 'pageerror' | 'requestfailed';
  message: string;
};

type Fixtures = {
  baseUrls: ApplicationBaseUrls;
  checkA11y: (options?: { include?: string }) => Promise<void>;
};

const ignoredRuntimePatterns = [
  /ResizeObserver loop limit exceeded/i,
  /ResizeObserver loop completed with undelivered notifications/i,
  /favicon/i,
  /Failed to load resource: the server responded with a status of 404.*favicon/i
];

const ignoredRequestFailurePatterns = [
  /favicon/i,
  /\.map$/i
];

export const test = base.extend<Fixtures>({
  baseUrls: async ({}, use) => {
    await use(baseUrls);
  },

  page: async ({ page }, use, testInfo) => {
    const issues: RuntimeIssue[] = [];
    page.on('console', (message) => {
      if (message.type() !== 'error') {
        return;
      }
      const text = message.text();
      if (!ignoredRuntimePatterns.some((pattern) => pattern.test(text))) {
        issues.push({ source: 'console', message: text });
      }
    });
    page.on('pageerror', (error) => {
      const text = error.message;
      if (!ignoredRuntimePatterns.some((pattern) => pattern.test(text))) {
        issues.push({ source: 'pageerror', message: text });
      }
    });
    page.on('requestfailed', (request) => {
      const url = request.url();
      if (ignoredRequestFailurePatterns.some((pattern) => pattern.test(url))) {
        return;
      }
      const resourceType = request.resourceType();
      if (!['document', 'script', 'stylesheet'].includes(resourceType)) {
        return;
      }
      const failure = request.failure()?.errorText ?? 'unknown failure';
      if (/NS_BINDING_ABORTED|net::ERR_ABORTED|cancelled/i.test(failure)) {
        return;
      }
      issues.push({
        source: 'requestfailed',
        message: `${request.method()} ${resourceType} ${url} -> ${failure}`
      });
    });

    await use(page);

    if (issues.length > 0) {
      await attachRuntimeIssues(testInfo, issues);
      expect.soft(issues, 'Unexpected browser console, runtime, or critical request failures').toEqual([]);
    }
  },

  checkA11y: async ({ page }, use) => {
    await use(async (options = {}) => {
      const builder = new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
      if (options.include) {
        builder.include(options.include);
      }
      const results = await builder.analyze();
      expect(results.violations, formatA11yViolations(results.violations)).toEqual([]);
    });
  }
});

export { expect };

export async function waitForApplicationReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('body').waitFor({ state: 'visible' });
}

async function attachRuntimeIssues(testInfo: TestInfo, issues: RuntimeIssue[]): Promise<void> {
  await testInfo.attach('runtime-issues', {
    contentType: 'application/json',
    body: Buffer.from(JSON.stringify(issues, null, 2))
  });
}

function formatA11yViolations(violations: Array<{ id: string; impact: string | null; nodes: unknown[] }>): string {
  if (!violations.length) {
    return 'No accessibility violations found.';
  }
  return violations
    .map((violation) => `${violation.id} (${violation.impact ?? 'unknown impact'}) - ${violation.nodes.length} node(s)`)
    .join('\n');
}
