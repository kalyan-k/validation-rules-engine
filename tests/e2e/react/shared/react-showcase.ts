import { expect, type Page } from '@playwright/test';
import { expectFieldInvalid, expectNoDuplicateControlIds, expectSuccessfulStatus } from '../../shared/assertions/validation';
import { FormActions } from '../../shared/components/form-actions';
import type { ApplicationBaseUrls } from '../../shared/config/applications';
import { waitForApplicationReady } from '../../shared/fixtures/test';
import { configurePerformanceForm, fillReactSimpleForm } from '../../shared/helpers/forms';

export class ReactStateShowcasePage {
  private readonly actions: FormActions;

  constructor(
    private readonly page: Page,
    private readonly baseUrls: ApplicationBaseUrls
  ) {
    this.actions = new FormActions(page);
  }

  async goto(strategyId: string, pageSlug = ''): Promise<void> {
    const suffix = pageSlug ? `/${pageSlug}` : '';
    await this.page.goto(`${this.baseUrls.react}/state/${strategyId}${suffix}`);
    await waitForApplicationReady(this.page);
  }

  async expectOverview(strategyLabel: string): Promise<void> {
    await expect(this.page.getByRole('heading', { name: `${strategyLabel} + Validation Rules`, exact: true })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'A thin state bridge' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Compare identical validation workflows' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: /Open simple form/i })).toBeVisible();
    await expect(this.page.getByRole('link', { name: /Open complex form/i })).toBeVisible();
    await expect(this.page.getByRole('link', { name: /Open performance form/i })).toBeVisible();
    await expect(this.page.getByRole('link', { name: /Read Documentation/i })).toBeVisible();
  }

  async exerciseSimpleForm(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Simple contact form' })).toBeVisible();
    await expect(this.page.getByLabel('First name')).toBeVisible();
    await expect(this.page.getByLabel('Last name')).toBeVisible();
    await expect(this.page.getByLabel('Email')).toBeVisible();
    await expect(this.page.getByLabel('Phone')).toBeVisible();

    await this.actions.clickAllowingNativeFallback('Submit contact');
    await expectSuccessfulStatus(this.page, 'Submission blocked. Correct the highlighted fields.');

    const email = this.page.getByLabel('Email');
    await email.fill('not-an-email', { force: true });
    await expect(email).toHaveValue('not-an-email');
    await this.actions.clickAllowingNativeFallback('Submit contact');
    await expectFieldInvalid(this.page, 'Email');

    await fillReactSimpleForm(this.page);
    await this.actions.clickAllowingNativeFallback('Submit contact');
    await expectSuccessfulStatus(this.page, 'Valid submission accepted.');

    await this.actions.clickAllowingNativeFallback('Reset');
    await expect(this.page.getByLabel('First name')).toHaveValue('');
  }

  async exerciseComplexForm(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Complex enterprise profile' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Personal information' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Addresses' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Contact methods' })).toBeVisible();

    await this.actions.clickAllowingNativeFallback('Validate all programmatically');
    await expect(this.page.getByText(/Save blocked|required|Needs attention/i).first()).toBeVisible();

    await this.exerciseGroupValidation();
    await this.exerciseConditionalSecondaryEmail();

    await this.actions.clickAllowingNativeFallback('Populate sample data');
    await expectSuccessfulStatus(this.page, 'Sample enterprise profile loaded.');
    await this.actions.clickAllowingNativeFallback('Save profile');
    await expectSuccessfulStatus(this.page, 'Profile saved successfully.');

    await this.actions.clickAllowingNativeFallback('Add address');
    await expect(this.page.getByText('Address 3').first()).toBeVisible();
    await this.actions.clickAllowingNativeFallback('Add contact method');
    await expect(this.page.getByText('Contact 3').first()).toBeVisible();

    await this.actions.clickAllowingNativeFallback('Reset profile');
    await expectSuccessfulStatus(this.page, 'Profile reset.');
  }

  async exerciseGroupValidation(): Promise<void> {
    const personalSection = this.page.locator('section.form-section').filter({ hasText: 'Personal information' });
    await personalSection.getByRole('button', { name: 'Validate section' }).click();
    await expect(personalSection.locator('.group-status')).toContainText(/Needs attention/i, { timeout: 10_000 });

    const addressSection = this.page.locator('section.form-section').filter({ hasText: 'Addresses' });
    await addressSection.getByRole('button', { name: 'Validate section' }).click();
    await expect(addressSection.locator('.group-status')).toContainText(/Needs attention/i, { timeout: 10_000 });
  }

  async exerciseConditionalSecondaryEmail(): Promise<void> {
    const toggle = this.page.getByRole('checkbox', { name: 'Add a secondary email' });
    await toggle.check({ force: true });
    const secondaryEmail = this.page.getByRole('textbox', { name: /Secondary email/i });
    await expect(secondaryEmail).toBeVisible();
    await secondaryEmail.fill('bad-email', { force: true });
    await this.actions.clickAllowingNativeFallback('Validate all programmatically');
    await expect(this.page.getByText(/secondary email|Save blocked|Needs attention|required|valid/i).first()).toBeVisible();
    await toggle.uncheck({ force: true });
    await expect(secondaryEmail).toHaveCount(0);
  }

  async exercisePerformanceForm(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Large state-managed form' })).toBeVisible();
    await configurePerformanceForm(this.page);
    await this.actions.clickAllowingNativeFallback('Generate form');
    await expect(this.page.getByText(/Generated 6 controls across 2 sections/i).first()).toBeVisible();
    await expectNoDuplicateControlIds(this.page);

    await this.actions.clickAllowingNativeFallback('Validate all');
    await expect(this.page.getByText(/error(s)? found/i).first()).toBeVisible();

    const firstSection = this.page.locator('section.form-section').filter({ hasText: /Section 1/i }).first();
    if (await firstSection.count()) {
      await firstSection.getByRole('button', { name: 'Validate group' }).click();
      await expect(firstSection.getByText(/Needs attention|Valid|error/i).first()).toBeVisible();
    }

    await this.actions.clickAllowingNativeFallback('Populate valid data');
    await expectSuccessfulStatus(this.page, 'Valid sample data populated.');
    await this.actions.clickAllowingNativeFallback('Reset');
    await expectSuccessfulStatus(this.page, 'Performance form reset.');
  }
}
