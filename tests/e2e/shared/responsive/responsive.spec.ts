import { expect, test } from '../fixtures/test';

test.describe('Representative responsive behavior @responsive', () => {
  test('portal, documentation, showcases, and reports render at narrow viewports @portal @docs @angular @react @reports', async ({ page, baseUrls }) => {
    await page.goto(baseUrls.portal);
    await expect(page.getByRole('heading', { name: /Validation behavior/i })).toBeVisible();

    await page.goto(`${baseUrls.docs}/docs/overview`);
    await expect(page.getByLabel(/Search documentation/i)).toBeVisible();

    await page.goto(`${baseUrls.angular}/state/template-driven/simple`);
    await expect(page.getByRole('heading', { name: 'Simple Form' })).toBeVisible();

    await page.goto(`${baseUrls.react}/state/local-state/simple`);
    await expect(page.getByRole('heading', { name: 'Simple contact form' })).toBeVisible();

    await page.goto(`${baseUrls.portal}/reports/index.html`);
    await expect(page.getByRole('heading', { name: /Test and coverage workspace|No generated reports/i })).toBeVisible();
  });
});
