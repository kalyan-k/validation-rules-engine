import { expect, type Page } from '@playwright/test';
import type { ApplicationBaseUrls } from '../config/applications';
import { waitForApplicationReady } from '../fixtures/test';

export class PortalPage {
  constructor(
    private readonly page: Page,
    private readonly baseUrls: ApplicationBaseUrls
  ) {}

  async goto(): Promise<void> {
    await this.page.goto(this.baseUrls.portal);
    await waitForApplicationReady(this.page);
    await expect(this.page.getByRole('heading', { name: /Validation behavior/i })).toBeVisible();
  }

  async expectApplicationCards(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Choose an experience' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Documentation' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Angular Showcase' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'React Showcase' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Vanilla JS Showcase' })).toBeVisible();
  }
}
