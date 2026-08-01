import { expect, test } from '../fixtures/test';
import { AngularStateShowcasePage } from '../../angular/shared/angular-showcase';
import { ReactStateShowcasePage } from '../../react/shared/react-showcase';

test.describe('Targeted visual regression @visual', () => {
  test('portal home remains visually stable @portal', async ({ page, baseUrls }) => {
    await page.goto(baseUrls.portal);
    await expect(page.getByRole('heading', { name: /Validation behavior/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Documentation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Angular Showcase' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'React Showcase' })).toBeVisible();
    await page.addStyleTag({
      content: '.status-panel,.automation-section{display:none!important;}'
    });
    await expect(page).toHaveScreenshot('portal-home.png', { fullPage: true });
  });

  test('documentation layout remains visually stable @docs', async ({ page, baseUrls }) => {
    await page.goto(`${baseUrls.docs}/docs/overview`);
    await expect(page).toHaveScreenshot('documentation-layout.png', { fullPage: true });
  });

  test('Angular simple form initial and error states remain visually stable @angular', async ({ page, baseUrls }) => {
    const angular = new AngularStateShowcasePage(page, baseUrls);
    await angular.goto('template-driven', 'simple');
    await expect(page.getByRole('heading', { name: 'Simple Form' })).toBeVisible();
    await expect(page).toHaveScreenshot('angular-simple-initial-state.png', { fullPage: true });
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page).toHaveScreenshot('angular-simple-error-state.png', { fullPage: true });
  });

  test('React simple form initial and error states remain visually stable @react', async ({ page, baseUrls }) => {
    const react = new ReactStateShowcasePage(page, baseUrls);
    await react.goto('local-state', 'simple');
    await expect(page.getByRole('heading', { name: 'Simple contact form' })).toBeVisible();
    await expect(page).toHaveScreenshot('react-simple-initial-state.png', { fullPage: true });
    await page.getByRole('button', { name: 'Submit contact' }).click();
    await expect(page).toHaveScreenshot('react-simple-error-state.png', { fullPage: true });
  });

  test('reports dashboard or empty state remains visually stable @reports', async ({ page, baseUrls }) => {
    await page.goto(`${baseUrls.portal}/reports/index.html`);
    await page.addStyleTag({
      content: '.platform-version,.vr-report-metadata div:last-child{visibility:hidden!important;}'
    });
    await expect(page).toHaveScreenshot('reports-page.png', { fullPage: true });
  });
});
