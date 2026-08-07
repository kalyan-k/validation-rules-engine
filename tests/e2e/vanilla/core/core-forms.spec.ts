import { test } from '../../shared/fixtures/test';
import { VanillaShowcasePage } from '../shared/vanilla-showcase';

test.describe('Vanilla core showcase @vanilla @regression', () => {
  test.describe.configure({ timeout: 90_000 });

  test('home page introduces the core-only dependency path @vanilla @smoke', async ({ page, baseUrls }) => {
    const showcase = new VanillaShowcasePage(page, baseUrls);
    await showcase.goto();
    await showcase.expectHome();
  });

  test('simple form blocks invalid submit and accepts valid data @vanilla @smoke', async ({ page, baseUrls }) => {
    const showcase = new VanillaShowcasePage(page, baseUrls);
    await showcase.goto('simple');
    await showcase.exerciseSimpleForm();
  });

  test('complex form covers groups, conditionals, and dynamic collections @vanilla', async ({ page, baseUrls }) => {
    const showcase = new VanillaShowcasePage(page, baseUrls);
    await showcase.goto('complex');
    await showcase.exerciseComplexForm();
  });

  test('performance form generates controls and measures validation @vanilla @performance-form', async ({ page, baseUrls }) => {
    const showcase = new VanillaShowcasePage(page, baseUrls);
    await showcase.goto('performance');
    await showcase.exercisePerformanceForm();
  });
});
