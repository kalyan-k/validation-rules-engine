import { expect, type Locator, type Page } from '@playwright/test';
import { performanceConfig, simpleValidData } from '../test-data/forms';

export async function fillIfVisible(locator: Locator, value: string): Promise<void> {
  if (await locator.count()) {
    await locator.first().fill(value, { force: true });
  }
}

export async function selectIfVisible(locator: Locator, option: string): Promise<void> {
  if (await locator.count()) {
    await locator.first().selectOption({ label: option }).catch(async () => locator.first().selectOption(option));
  }
}

export async function checkIfVisible(locator: Locator): Promise<void> {
  if (await locator.count()) {
    const input = locator.first();
    if (await input.isChecked()) return;
    await input.check({ force: true }).catch(async () => {
      await input.evaluate((element) => {
        if (element instanceof HTMLInputElement && !element.checked) {
          element.checked = true;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
    await expect(input).toBeChecked();
  }
}

export async function clickIfVisible(locator: Locator): Promise<boolean> {
  if (await locator.count()) {
    await locator.first().click();
    return true;
  }
  return false;
}

export async function fillAngularSimpleForm(page: Page): Promise<void> {
  await page.getByLabel('First Name').fill(simpleValidData.firstName, { force: true });
  await page.getByLabel('Last Name').fill(simpleValidData.lastName, { force: true });
  await page.getByRole('textbox', { name: /Email/i }).fill(simpleValidData.email, { force: true });
  await page.getByRole('textbox', { name: /Phone/i }).fill(simpleValidData.phone, { force: true });
  await selectIfVisible(page.getByLabel('Country'), simpleValidData.country);
  await fillIfVisible(page.getByLabel('Date'), simpleValidData.date);
  await checkIfVisible(page.getByLabel(/Checkbox/i));
  await checkIfVisible(page.getByRole('radio', { name: simpleValidData.contactPreference, exact: true }));
  await selectIfVisible(page.getByLabel(/Dropdown - Role|Role/i), simpleValidData.role);
}

export async function fillReactSimpleForm(page: Page): Promise<void> {
  await page.getByLabel('First name').fill(simpleValidData.firstName, { force: true });
  await page.getByLabel('Last name').fill(simpleValidData.lastName, { force: true });
  await page.getByRole('textbox', { name: /Email/i }).fill(simpleValidData.email, { force: true });
  await page.getByRole('textbox', { name: /Phone/i }).fill(simpleValidData.phone, { force: true });
}

export async function configurePerformanceForm(page: Page): Promise<void> {
  await page.getByLabel(/Number of Sections|Sections \/ components/i).fill(performanceConfig.sections, { force: true });
  await page.getByLabel(/Controls per Section|Controls per section/i).fill(performanceConfig.controlsPerSection, { force: true });
  await page.getByLabel(/Random Seed|Random seed/i).fill(performanceConfig.seed, { force: true });
}

export async function expectAnyText(page: Page, patterns: RegExp[]): Promise<void> {
  await expect(page.locator('body')).toContainText(new RegExp(patterns.map((pattern) => pattern.source).join('|'), 'i'));
}
