import { expect, test } from '../shared/fixtures/test';

test.describe('Documentation application @docs @regression', () => {
  test('loads documentation, navigates packages, and supports deep links @smoke', async ({ page, baseUrls }) => {
    await page.goto(`${baseUrls.docs}/docs/overview`);
    await expect(page.getByRole('heading', { name: /What is Validation Rules/i })).toBeVisible();
    const corePackageNav = page.locator('.nav-section').filter({ has: page.getByRole('heading', { name: 'Core Package' }) });
    await expect(corePackageNav.getByRole('link', { name: 'Overview' })).toBeVisible();
    await corePackageNav.getByRole('link', { name: 'Overview' }).click();
    await expect(page).toHaveURL(/\/docs\/core-package/);

    await page.goto(`${baseUrls.docs}/docs/angular-state-ngrx`);
    await expect(page.getByRole('heading', { name: /NgRx/i })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: /NgRx/i })).toBeVisible();

    await page.goto(`${baseUrls.docs}/docs/react-state-redux-toolkit`);
    await expect(page.getByRole('heading', { name: /Redux Toolkit/i })).toBeVisible();
  });

  test('search finds state management and package consumption guides', async ({ page, baseUrls }) => {
    await page.goto(`${baseUrls.docs}/docs/overview`);
    const search = page.getByLabel(/Search documentation/i);
    await search.fill('Redux Toolkit');
    await expect(page.getByRole('listbox')).toContainText(/Redux Toolkit/i);
    await page.getByRole('option', { name: /Redux Toolkit/i }).first().click();
    await expect(page).toHaveURL(/react-state-redux-toolkit|angular-state-ngrx/);

    await page.goto(`${baseUrls.docs}/docs/overview`);
    await page.getByLabel(/Search documentation/i).fill('installation');
    await expect(page.getByRole('listbox')).toContainText(/Installation/i);

    await page.goto(`${baseUrls.docs}/docs/overview`);
    await page.getByLabel(/Search documentation/i).fill('Playwright');
    await expect(page.getByRole('listbox')).toContainText(/Playwright/i);
  });

  test('code blocks and copy-code behavior work when available', async ({ page, baseUrls }) => {
    await page.addInitScript(() => {
      const clipboardWindow = window as Window & { __validationRulesCopiedText?: string };
      const clipboardStub = {
        writeText: async (value: string) => {
          clipboardWindow.__validationRulesCopiedText = value;
        }
      };
      try {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: clipboardStub
        });
      } catch {
        (navigator as Navigator & { clipboard?: typeof clipboardStub }).clipboard = clipboardStub;
      }
      try {
        Object.defineProperty(window, 'isSecureContext', {
          configurable: true,
          value: true
        });
      } catch {
        // Some browsers expose this as read-only. 127.0.0.1 is already a trustworthy origin.
      }
    });
    await page.goto(`${baseUrls.docs}/docs/getting-started`);
    await expect.poll(() => page.evaluate(() => {
      return Boolean(navigator.clipboard?.writeText);
    })).toBe(true);
    await expect(page.locator('pre code').first()).toBeVisible();
    const copyButton = page.locator('.docs-copy-button').first();
    if (await copyButton.count()) {
      await expect(copyButton).toBeEnabled();
      await copyButton.click({ force: true });
      await expect(copyButton).toContainText(/copied/i);
      await expect.poll(() => page.evaluate(() => {
        return (window as Window & { __validationRulesCopiedText?: string }).__validationRulesCopiedText || '';
      })).toContain('@validation-rules');
    }
  });

  test('previous and next navigation works where available', async ({ page, baseUrls }) => {
    await page.goto(`${baseUrls.docs}/docs/getting-started`);
    const next = page.getByRole('navigation', { name: /Documentation pages/i }).getByRole('link').last();
    await expect(next).toBeVisible();
    await next.click();
    await expect(page).toHaveURL(/\/docs\//);
  });
});
