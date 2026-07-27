import { expect, test } from '../shared/fixtures/test';
import { PortalPage } from '../shared/page-objects/portal-page';

test.describe('Demo portal @portal @regression', () => {
  test('loads application cards and launch links @smoke', async ({ page, baseUrls }) => {
    const portal = new PortalPage(page, baseUrls);
    await portal.goto();
    await portal.expectApplicationCards();
    await expect(page.getByRole('link', { name: /Read documentation/i }).first()).toHaveAttribute('href', /docs/);
    await expect(page.getByText(/Angular NgRx/i)).toHaveCount(0);
  });

  test('opens integration lists without testing Playwright results', async ({ page, baseUrls }) => {
    await page.goto(baseUrls.portal);
    const angularIntegrations = page.locator('details.integration-links').filter({ hasText: /Explore Angular integrations/i });
    await angularIntegrations.locator('summary').evaluate((summary) => {
      if (summary instanceof HTMLElement) {
        summary.click();
      }
    });
    await expect(angularIntegrations).toHaveAttribute('open', '');
    await expect(angularIntegrations.getByRole('link', { name: 'NgRx', exact: true })).toBeVisible();

    const reactIntegrations = page.locator('details.integration-links').filter({ hasText: /Explore React integrations/i });
    await reactIntegrations.locator('summary').evaluate((summary) => {
      if (summary instanceof HTMLElement) {
        summary.click();
      }
    });
    await expect(reactIntegrations).toHaveAttribute('open', '');
    await expect(reactIntegrations.getByRole('link', { name: 'Redux Toolkit', exact: true })).toBeVisible();
  });
});
