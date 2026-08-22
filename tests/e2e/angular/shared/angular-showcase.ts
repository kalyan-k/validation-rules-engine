import { expect, type Page } from '@playwright/test';
import { expectSuccessfulStatus, expectValidationSummaryCount } from '../../shared/assertions/validation';
import type { ApplicationBaseUrls } from '../../shared/config/applications';
import { waitForApplicationReady } from '../../shared/fixtures/test';
import { clickIfVisible, configurePerformanceForm, fillAngularSimpleForm } from '../../shared/helpers/forms';

export class AngularStateShowcasePage {
  constructor(
    private readonly page: Page,
    private readonly baseUrls: ApplicationBaseUrls
  ) {}

  async goto(strategyId: string, pageSlug = ''): Promise<void> {
    const suffix = pageSlug ? `/${pageSlug}` : '';
    await this.page.goto(`${this.baseUrls.angular}/state/${strategyId}${suffix}`);
    await waitForApplicationReady(this.page);
  }

  async expectOverview(strategyLabel: string): Promise<void> {
    await expect(this.page.getByRole('heading', { name: strategyLabel, exact: true })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'What it is' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Typical enterprise use cases' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: 'Simple Form', exact: true }).first()).toBeVisible();
    await expect(this.page.getByRole('link', { name: 'Complex Form', exact: true }).first()).toBeVisible();
    await expect(this.page.getByRole('link', { name: 'Performance Form', exact: true }).first()).toBeVisible();
    await expect(this.page.getByRole('link', { name: /documentation/i }).first()).toBeVisible();
  }

  /**
   * Overview → Simple Form navigation.
   * Firefox can hang inside locator.click while Angular Router starts navigation
   * ("performing click action" until actionTimeout). Prefer a scoped tab link,
   * do not wait for navigation inside the click, and fall back to href navigation.
   */
  async openSimpleFormFromOverview(strategyId: string): Promise<void> {
    const simpleUrl = new RegExp(`/state/${strategyId}/simple$`);
    const link = this.page
      .getByRole('navigation', { name: 'State showcase pages' })
      .getByRole('link', { name: 'Simple Form', exact: true });

    await expect(link).toBeVisible();
    await link.scrollIntoViewIfNeeded();

    const href = await link.getAttribute('href');
    try {
      await link.click({ noWaitAfter: true, timeout: 5_000 });
    } catch {
      if (href) {
        await this.page.goto(new URL(href, this.baseUrls.angular).toString());
      } else {
        await this.page.goto(`${this.baseUrls.angular}/state/${strategyId}/simple`);
      }
    }

    await this.page.waitForURL(simpleUrl, { timeout: 15_000 });
    await waitForApplicationReady(this.page);
    await expect(this.page.getByRole('heading', { name: 'Simple Form' })).toBeVisible();
  }

  async exerciseSimpleForm(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Simple Form' })).toBeVisible();
    await expect(this.page.getByLabel('First Name')).toBeVisible();
    await expect(this.page.getByLabel('Last Name')).toBeVisible();
    await expect(this.page.getByRole('textbox', { name: /Email/i })).toBeVisible();
    await expect(this.page.getByRole('textbox', { name: /Phone/i })).toBeVisible();

    await this.clickStable('Submit');
    await expectValidationSummaryCount(this.page, /Simple form has \d+ validation error/i);

    await this.page.getByRole('textbox', { name: /Email/i }).fill('not-an-email');
    await this.clickStable('Submit');
    await expect(this.page.getByText(/valid email|validation error/i).first()).toBeVisible();

    await fillAngularSimpleForm(this.page);
    await this.clickStable('Submit');
    await expectSuccessfulStatus(this.page, 'Simple form submitted successfully.');

    await this.clickStable('Reset');
    await expect(this.page.getByLabel('First Name')).toHaveValue('');

    await this.clickStable('Populate sample data');
    await expectSuccessfulStatus(this.page, 'Loaded sample profile data.');
    await expect(this.page.getByLabel('First Name')).not.toHaveValue('');
  }

  async exerciseComplexForm(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Complex Form' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Identity and preferences' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Conditional controls and policy mode' })).toBeVisible();

    await this.clickStable('Populate invalid data');
    await expectSuccessfulStatus(this.page, 'Loaded intentionally invalid enterprise data.');
    await this.clickStable('Programmatic validation');
    await expectValidationSummaryCount(this.page, /Complex form has \d+ validation error/i);

    await this.exercisePolicyComposition();
    await this.exerciseConditionalSecondaryEmail();

    await this.clickStable('Populate sample data');
    await expectSuccessfulStatus(this.page, 'Loaded valid enterprise sample data.');
    await this.clickStable('Save');
    await expectSuccessfulStatus(this.page, 'Complex form saved successfully.');

    await clickIfVisible(this.page.getByRole('button', { name: /Add address/i }));
    await expect(this.page.getByText(/Added address section|Address 3/i).first()).toBeVisible();
    await clickIfVisible(this.page.getByRole('button', { name: /Add contact/i }));
    await expect(this.page.getByText(/Added contact section|Contact 3/i).first()).toBeVisible();

    await this.clickStable('Reset');
    await expect(this.page.getByLabel('First Name')).toHaveValue('');
    await expect(this.page.getByRole('button', { name: 'Standard policy' })).toBeVisible();
  }

  async exercisePolicyComposition(): Promise<void> {
    // Prefer #caseId over role locators: WebKit can keep stale accessible-name matches
    // briefly while Angular tears down the regulated @if block.
    const caseId = this.page.locator('#caseId');
    const regulated = this.page.getByRole('button', { name: 'Regulated policy' });
    const standard = this.page.getByRole('button', { name: 'Standard policy' });

    // Populate-invalid already starts in regulated mode; assert that UI contract.
    await expect(caseId).toBeVisible();
    await expect(regulated).toHaveClass(/btn-primary/);

    await this.clickStable('Programmatic validation');
    await expect(this.page.getByText(/Case ID is required for regulated policy mode|Complex form has \d+ validation error/i).first()).toBeVisible();
    // Let the async evaluatePolicies subscription finish before mutating mode again.
    await expect(this.page.getByText(/Complex form programmatic validation started/i)).toHaveCount(0);

    await caseId.fill('CASE-1001');
    await expect(caseId).toHaveValue('CASE-1001');
    // Blur so ngModelChange → syncComplexState settles before the mode switch.
    await caseId.blur();

    // Field sync commits can race the mode switch on Firefox/WebKit.
    // Retry until Standard is primary and the Case ID control is gone.
    await expect(async () => {
      if ((await caseId.count()) > 0 || !(await standard.evaluate((el) => el.classList.contains('btn-primary')))) {
        await this.activatePolicyButton(standard);
      }
      await expect(standard).toHaveClass(/btn-primary/);
      await expect(caseId).toHaveCount(0);
    }).toPass({ timeout: 20_000, intervals: [250, 500, 1_000, 2_000] });

    await this.activatePolicyButton(regulated);
    await expect(caseId).toBeVisible();
    await expect(regulated).toHaveClass(/btn-primary/);
  }

  async exerciseConditionalSecondaryEmail(): Promise<void> {
    const toggle = this.page.getByRole('checkbox', { name: 'Enable conditional secondary email' });
    await toggle.check({ force: true });
    const secondaryEmail = this.page.getByRole('textbox', { name: /Secondary Email/i });
    await expect(secondaryEmail).toBeVisible();
    await secondaryEmail.fill('not-valid');
    await this.clickStable('Programmatic validation');
    await expect(this.page.getByText(/valid secondary email|Complex form has \d+ validation error/i).first()).toBeVisible();
    await toggle.uncheck({ force: true });
    await expect(secondaryEmail).toHaveCount(0);
  }

  async exercisePerformanceForm(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Performance Form', exact: true }).first()).toBeVisible();
    await configurePerformanceForm(this.page);
    await this.generatePerformanceForm();
    await this.generatePerformanceForm();

    // Prefer text/CSS locators here: Firefox can hang building the ARIA tree
    // after large generated forms when getByRole walks the whole page.
    await this.clickPerformanceAction('Validate all');
    await expect(this.page.getByText(/Validate all completed|error\(s\)|no errors/i).first()).toBeVisible({ timeout: 30_000 });
    await this.clickPerformanceAction('Clear all');
    await expect(this.page.getByRole('heading', { name: /Form configuration/i })).toBeVisible();
  }

  private async generatePerformanceForm(): Promise<void> {
    await this.clickPerformanceAction('Generate form');
    await expect(this.performanceActionButton('Generate form')).toBeEnabled({ timeout: 30_000 });
    await expect(this.page.getByText(/Rendered \d+ controls across \d+ sections/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(this.page.locator('app-performance-form-section').first()).toBeVisible();
    const generatedControls = this.page.locator('app-performance-form-section input, app-performance-form-section select, app-performance-form-section textarea');
    await expect.poll(async () => generatedControls.count(), { timeout: 30_000 }).toBeGreaterThan(0);
  }

  private performanceActionButton(label: string) {
    // String hasText matches normalized substrings; avoid ^$ regex — Angular
    // templates often wrap button labels in whitespace/newlines.
    return this.page.locator('button').filter({ hasText: label }).first();
  }

  /**
   * Performance forms render many controls; avoid getByRole so Firefox does not
   * time out while building the accessibility tree under load.
   */
  private async clickPerformanceAction(label: string): Promise<void> {
    const button = this.performanceActionButton(label);
    await expect(button).toBeVisible({ timeout: 30_000 });
    await expect(button).toBeEnabled({ timeout: 30_000 });
    await button.scrollIntoViewIfNeeded();
    try {
      await button.click({ timeout: 5_000 });
    } catch {
      await button.evaluate((element) => {
        if (element instanceof HTMLButtonElement) {
          element.click();
        }
      });
    }
  }

  private async clickStable(name: string | RegExp, exact = false): Promise<void> {
    const button = this.page.getByRole('button', typeof name === 'string' ? { name, exact } : { name }).first();
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled({ timeout: 30_000 });
    await button.scrollIntoViewIfNeeded();
    await button.click();
  }

  /**
   * Policy mode buttons sit under a sticky platform header on smaller viewports.
   * Prefer a normal Playwright click; fall back to a DOM click so Angular still
   * receives the (click) binding when hit-testing is flaky (especially WebKit).
   */
  private async activatePolicyButton(button: ReturnType<Page['getByRole']>): Promise<void> {
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.scrollIntoViewIfNeeded();
    try {
      await button.click({ timeout: 3_000 });
    } catch {
      await button.evaluate((element) => {
        if (element instanceof HTMLButtonElement) {
          element.click();
        }
      });
    }
  }
}
