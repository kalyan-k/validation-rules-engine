import { expect, type Page } from '@playwright/test';

export async function expectValidationSummaryCount(page: Page, pattern: RegExp): Promise<void> {
  await expect(page.getByText(pattern).first()).toBeVisible();
}

export async function expectSuccessfulStatus(page: Page, message: string | RegExp): Promise<void> {
  await expect(page.getByText(message).first()).toBeVisible();
}

export async function expectFieldInvalid(page: Page, label: string | RegExp): Promise<void> {
  const field = page.getByLabel(label);
  await expect(field).toBeVisible();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
}

export async function expectNoDuplicateControlIds(page: Page): Promise<void> {
  const duplicateIds = await page.evaluate(() => {
    const seen = new Map<string, number>();
    for (const element of Array.from(document.querySelectorAll('[id]'))) {
      const id = element.id.trim();
      if (!id) continue;
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    return [...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  });
  expect(duplicateIds, `Duplicate control ids: ${duplicateIds.join(', ')}`).toEqual([]);
}

export async function expectKeyboardFocusable(page: Page, name: string | RegExp): Promise<void> {
  const control = page.getByRole('button', { name }).or(page.getByLabel(name)).first();
  await control.focus();
  await expect(control).toBeFocused();
}
