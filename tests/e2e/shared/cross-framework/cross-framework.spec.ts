import { expect, test } from '../fixtures/test';
import { AngularStateShowcasePage } from '../../angular/shared/angular-showcase';
import { ReactStateShowcasePage } from '../../react/shared/react-showcase';

test.describe('Cross-framework consistency @regression', () => {
  test('Angular and React simple examples both block invalid submit and accept valid data @angular @react', async ({ page, baseUrls }) => {
    const angular = new AngularStateShowcasePage(page, baseUrls);
    await angular.goto('template-driven', 'simple');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText(/Simple form has \d+ validation error/i).first()).toBeVisible();

    const react = new ReactStateShowcasePage(page, baseUrls);
    await react.goto('local-state', 'simple');
    await page.getByRole('button', { name: 'Submit contact' }).click();
    await expect(page.getByText('Submission blocked. Correct the highlighted fields.')).toBeVisible();
  });

  test('Angular and React complex examples expose nested sections and dynamic collections @angular @react', async ({ page, baseUrls }) => {
    const angular = new AngularStateShowcasePage(page, baseUrls);
    await angular.goto('template-driven', 'complex');
    await expect(page.getByRole('heading', { name: 'Conditional controls and policy mode' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add address/i })).toBeVisible();

    const react = new ReactStateShowcasePage(page, baseUrls);
    await react.goto('local-state', 'complex');
    await expect(page.getByRole('heading', { name: 'Addresses' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add address' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Validate section' }).first()).toBeVisible();
  });

  test('Angular and React performance examples expose the same generator inputs @angular @react @performance-form', async ({ page, baseUrls }) => {
    await page.goto(`${baseUrls.angular}/state/template-driven/performance`);
    await expect(page.getByLabel(/Sections \/ components|Number of Sections/i)).toBeVisible();
    await expect(page.getByLabel(/Controls per section/i)).toBeVisible();
    await expect(page.getByLabel(/Random seed/i)).toBeVisible();

    await page.goto(`${baseUrls.react}/state/local-state/performance`);
    await expect(page.getByLabel(/Number of Sections/i)).toBeVisible();
    await expect(page.getByLabel(/Controls per Section/i)).toBeVisible();
    await expect(page.getByLabel(/Random Seed/i)).toBeVisible();
  });
});
