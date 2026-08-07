import { expect, test } from '../shared/fixtures/test';
import { PortalPage } from '../shared/page-objects/portal-page';
import { AngularStateShowcasePage } from '../angular/shared/angular-showcase';
import { ReactStateShowcasePage } from '../react/shared/react-showcase';
import { VanillaShowcasePage } from '../vanilla/shared/vanilla-showcase';

test.describe('Repository smoke suite @smoke', () => {
  test.describe.configure({ timeout: 120_000 });

  test('loads the portal, documentation, reports, and all showcases @portal @docs @reports @angular @react @vanilla', async ({ page, baseUrls }) => {
    await new PortalPage(page, baseUrls).goto();
    await new PortalPage(page, baseUrls).expectApplicationCards();

    await page.goto(`${baseUrls.docs}/docs/overview`);
    await expect(page.getByRole('heading', { name: /What is Validation Rules Engine \(VRE\)/i })).toBeVisible();

    await page.goto(`${baseUrls.portal}/reports/index.html`);
    await expect(page.getByRole('heading', { name: /Test and coverage workspace|No generated reports/i })).toBeVisible();

    await page.goto(baseUrls.angular);
    await expect(page.getByRole('heading', { name: /Validation Rules Engine Showcase Application/i })).toBeVisible();

    await page.goto(baseUrls.react);
    await expect(page.getByRole('heading', { name: /Policy validation that fits React/i })).toBeVisible();

    await page.goto(baseUrls.vanilla);
    await expect(page.getByRole('heading', { name: /Policy validation without a UI framework/i })).toBeVisible();
  });

  test('validates Angular, React, and Vanilla simple forms @angular @react @vanilla', async ({ page, baseUrls }) => {
    const angular = new AngularStateShowcasePage(page, baseUrls);
    await angular.goto('template-driven', 'simple');
    await angular.exerciseSimpleForm();

    const react = new ReactStateShowcasePage(page, baseUrls);
    await react.goto('local-state', 'simple');
    await react.exerciseSimpleForm();

    const vanilla = new VanillaShowcasePage(page, baseUrls);
    await vanilla.goto('simple');
    await vanilla.exerciseSimpleForm();
  });
});
