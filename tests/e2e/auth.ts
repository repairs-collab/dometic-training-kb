import { expect, type Page } from '@playwright/test';

export const TEST_AUTH_USERNAME = 'training-test';
export const TEST_AUTH_PASSWORD = 'test-only-password';

export async function openAuthenticatedPage(page: Page, path: string): Promise<void> {
  await page.goto(path);
  const login = page.getByRole('button', { name: 'Log in' });
  if (await login.isVisible()) {
    await page.getByLabel('Username').fill(TEST_AUTH_USERNAME);
    await page.getByLabel('Password').fill(TEST_AUTH_PASSWORD);
    await login.click();
  }
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
}
