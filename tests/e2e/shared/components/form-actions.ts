import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Lightweight component object for shared form action bars.
 * Prefer role/name locators; keep this thin rather than a deep abstraction layer.
 */
export class FormActions {
  constructor(private readonly page: Page) {}

  button(name: string | RegExp): Locator {
    return this.page.getByRole('button', { name });
  }

  async click(name: string | RegExp): Promise<void> {
    const button = this.button(name);
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();
  }

  async clickAllowingNativeFallback(name: string | RegExp): Promise<void> {
    const button = this.button(name);
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
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
