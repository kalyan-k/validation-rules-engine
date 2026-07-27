import { expect, test } from '../shared/fixtures/test';

test.describe('Existing reports application @reports @regression', () => {
  test('Reports menu exposes tests coverage and automation destinations', async ({ page, baseUrls }) => {
    await page.goto(baseUrls.portal);
    await page.locator('validation-platform-shell summary').filter({ hasText: 'Reports' }).click();
    await expect(page.getByRole('link', { name: 'Tests & Coverage' })).toHaveAttribute('href', /\/reports\/index\.html$/);
    // Link presence is asserted; Playwright Results page content is intentionally not exercised here.
    await expect(page.getByRole('link', { name: 'Automation Testing' })).toHaveAttribute('href', /\/reports\/playwright\.html$/);
  });

  test('Reports menu remains available inside the tests and coverage workspace', async ({ page, baseUrls }) => {
    await page.goto(`${baseUrls.portal}/reports/index.html`);
    await page.locator('validation-platform-shell summary').filter({ hasText: 'Reports' }).click();
    await expect(page.getByRole('link', { name: 'Tests & Coverage' })).toHaveAttribute('href', /\/reports\/index\.html$/);
    await expect(page.getByRole('link', { name: 'Automation Testing' })).toHaveAttribute('href', /\/reports\/playwright\.html$/);
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
