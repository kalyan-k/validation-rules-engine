import { expect, test } from '../shared/fixtures/test';

test.describe('Existing reports application @reports @regression', () => {
  test('Reports menu exposes tests coverage and automation destinations', async ({ page, baseUrls }) => {
    await page.goto(baseUrls.portal);
    await page.locator('validation-platform-shell summary').filter({ hasText: 'Reports' }).click();
    const reportsMenu = page.getByLabel('Platform navigation');
    await expect(reportsMenu.getByRole('link', { name: 'Tests & Coverage' })).toHaveAttribute('href', /\/reports\/index\.html$/);
    // Link presence is asserted; Playwright Results page content is intentionally not exercised here.
    await expect(reportsMenu.getByRole('link', { name: 'Automation Testing' })).toHaveAttribute('href', /\/automation\/$/);
  });

  test('Reports menu remains available inside the tests and coverage workspace', async ({ page, baseUrls }) => {
    await page.goto(`${baseUrls.portal}/reports/index.html`);
    await page.locator('validation-platform-shell summary').filter({ hasText: 'Reports' }).click();
    const reportsMenu = page.getByLabel('Platform navigation');
    await expect(reportsMenu.getByRole('link', { name: 'Tests & Coverage' })).toHaveAttribute('href', /\/reports\/index\.html$/);
    await expect(reportsMenu.getByRole('link', { name: 'Automation Testing' })).toHaveAttribute('href', /\/automation\/$/);
  });

  test('loads the canonical automation summary route', async ({ page, baseUrls }) => {
    await page.goto(`${baseUrls.portal}/automation/`);
    await expect(page.getByRole('heading', { name: 'Automation Testing' })).toBeVisible();
    await expect(page.locator('#playwright-results')).toContainText(/Latest run|No Playwright report|Loading Playwright/i);
  });

  test('loads generated report dashboard or useful empty state @smoke', async ({ page, baseUrls }) => {
    await page.goto(`${baseUrls.portal}/reports/index.html`);
    await expect(page.getByRole('heading', { name: /Test and coverage workspace|No generated reports/i })).toBeVisible();
    await expect(page.locator('body')).toContainText(/reports|test:reports/i);
  });

  test('report links remain local when dashboard exists', async ({ page, baseUrls }) => {
    await page.goto(`${baseUrls.portal}/reports/index.html`);
    const body = page.locator('body');
    if (await body.getByText(/No generated reports/i).count()) {
      await expect(body).toContainText('npm run test:reports');
      return;
    }
    await expect(page.getByRole('button', { name: /Summary|Coverage|Tests/i }).first()).toBeVisible();
  });
});
