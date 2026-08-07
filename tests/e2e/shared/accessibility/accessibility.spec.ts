import { expect, test } from '../fixtures/test';
import { expectKeyboardFocusable } from '../assertions/validation';
import { AngularStateShowcasePage } from '../../angular/shared/angular-showcase';
import { ReactStateShowcasePage } from '../../react/shared/react-showcase';
import { VanillaShowcasePage } from '../../vanilla/shared/vanilla-showcase';

test.describe('Representative accessibility checks @accessibility', () => {
  test('portal home has no critical WCAG violations @portal', async ({ page, baseUrls, checkA11y }) => {
    await page.goto(baseUrls.portal);
    await checkA11y();
  });

  test('documentation home has no critical WCAG violations @docs', async ({ page, baseUrls, checkA11y }) => {
    await page.goto(`${baseUrls.docs}/docs/overview`);
    await checkA11y();
  });

  test('Angular simple and complex forms have no critical WCAG violations @angular', async ({ page, baseUrls, checkA11y }) => {
    const angular = new AngularStateShowcasePage(page, baseUrls);
    await angular.goto('template-driven', 'simple');
    await checkA11y();
    await angular.goto('template-driven', 'complex');
    await checkA11y();
  });

  test('React simple and complex forms have no critical WCAG violations @react', async ({ page, baseUrls, checkA11y }) => {
    const react = new ReactStateShowcasePage(page, baseUrls);
    await react.goto('local-state', 'simple');
    await checkA11y();
    await react.goto('local-state', 'complex');
    await checkA11y();
  });

  test('Vanilla simple and complex forms have no critical WCAG violations @vanilla', async ({ page, baseUrls, checkA11y }) => {
    const vanilla = new VanillaShowcasePage(page, baseUrls);
    await vanilla.goto('simple');
    await checkA11y();
    await vanilla.goto('complex');
    await checkA11y();
  });

  test('reports page has no critical WCAG violations @reports', async ({ page, baseUrls, checkA11y }) => {
    await page.goto(`${baseUrls.portal}/reports/index.html`);
    await checkA11y();
  });

  test('main navigation and form controls are keyboard focusable @portal @angular', async ({ page, baseUrls }) => {
    await page.goto(baseUrls.portal);
    const homeLink = page.getByRole('link', { name: /Home/i }).first();
    await homeLink.focus();
    await expect(homeLink).toBeFocused();

    const angular = new AngularStateShowcasePage(page, baseUrls);
    await angular.goto('template-driven', 'simple');
    await expectKeyboardFocusable(page, 'First Name');
    await expectKeyboardFocusable(page, 'Submit');
    await expectKeyboardFocusable(page, 'Reset');
  });
});
