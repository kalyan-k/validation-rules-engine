import { test } from '../../shared/fixtures/test';
import { ReactStateShowcasePage } from './react-showcase';

export interface ReactStrategyUnderTest {
  id: string;
  label: string;
  tag: string;
}

export function describeReactStateStrategy(strategy: ReactStrategyUnderTest): void {
  test.describe(`${strategy.label} ${strategy.tag} @react @regression`, () => {
    test.describe.configure({ timeout: 90_000 });

    test(`loads overview and documentation links ${strategy.tag}`, async ({ page, baseUrls }) => {
      const showcase = new ReactStateShowcasePage(page, baseUrls);
      await showcase.goto(strategy.id);
      await showcase.expectOverview(strategy.label);
      await page.getByRole('link', { name: /Open simple form/i }).click();
      await page.waitForURL(new RegExp(`/state/${strategy.id}/simple$`));
    });

    test(`validates simple form behavior ${strategy.tag}`, async ({ page, baseUrls }) => {
      const showcase = new ReactStateShowcasePage(page, baseUrls);
      await showcase.goto(strategy.id, 'simple');
      await showcase.exerciseSimpleForm();
    });

    test(`validates complex policy and dynamic behavior ${strategy.tag}`, async ({ page, baseUrls }) => {
      const showcase = new ReactStateShowcasePage(page, baseUrls);
      await showcase.goto(strategy.id, 'complex');
      await showcase.exerciseComplexForm();
    });

    test(`validates performance generator behavior ${strategy.tag} @performance-form`, async ({ page, baseUrls }) => {
      const showcase = new ReactStateShowcasePage(page, baseUrls);
      await showcase.goto(strategy.id, 'performance');
      await showcase.exercisePerformanceForm();
    });
  });
}
