import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('home and result views have no serious accessibility violations', async ({ page }) => {
  await page.goto('./');
  let scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);

  await page.getByRole('searchbox').fill('RCD door not closing');
  await page.getByRole('searchbox').press('Enter');
  scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
});

test('search works from the keyboard', async ({ page }) => {
  await page.goto('./');
  const search = page.getByRole('searchbox');
  await search.fill('RUA settings locked');
  await search.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Search manuals' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.result-card h3').first()).toContainText('RUA settings');
});

test('phone layout does not overflow horizontally', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('phone'), 'Phone project only');
  await page.goto('./');
  await page.getByRole('searchbox').fill('FreshJet generator size');
  await page.getByRole('searchbox').press('Enter');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator('.result-card').first()).toBeVisible();
});
