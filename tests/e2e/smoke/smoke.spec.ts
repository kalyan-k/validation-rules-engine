import { expect, test } from '../shared/fixtures/test';
import { PortalPage } from '../shared/page-objects/portal-page';
import { AngularStateShowcasePage } from '../angular/shared/angular-showcase';
import { ReactStateShowcasePage } from '../react/shared/react-showcase';

test.describe('Repository smoke suite @smoke', () => {
  test.describe.configure({ timeout: 90_000 });

  test('loads the portal, documentation, reports, Angular Showcase, and React Showcase @portal @docs @reports @angular @react', async ({ page, baseUrls }) => {
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
  });

  test('validates one Angular and one React simple form @angular @react', async ({ page, baseUrls }) => {
    const angular = new AngularStateShowcasePage(page, baseUrls);
    await angular.goto('template-driven', 'simple');
    await angular.exerciseSimpleForm();

    const react = new ReactStateShowcasePage(page, baseUrls);
    await react.goto('local-state', 'simple');
    await react.exerciseSimpleForm();
  });
});
