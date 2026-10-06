import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('lists every current manual with working view and download actions', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Manuals' }).click();

  await expect(page).toHaveURL(/\/manuals\.html$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Training manuals' })).toBeVisible();
  await expect(page.locator('.manual-card')).toHaveCount(18);

  const manual = page
    .locator('.manual-card')
    .filter({ hasText: 'Portable Refrigerator Training - September 2026' });
  await expect(manual).toContainText('Portable refrigerator');
  await expect(manual).toContainText('21 pages');

  const viewLink = manual.getByRole('link', { name: 'View PDF' });
  const downloadLink = manual.getByRole('link', { name: 'Download PDF' });
  await expect(viewLink).toHaveAttribute(
    'href',
    './manuals/Portable%20Refrigerator%20Training%20-%2030-09-2026.pdf',
  );
  await expect(downloadLink).toHaveAttribute('download', 'Portable Refrigerator Training - 30-09-2026.pdf');

  const response = await page.request.get(new URL((await viewLink.getAttribute('href'))!, page.url()).toString());
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
});

test('manuals page has no serious accessibility violations', async ({ page }) => {
  await page.goto('./manuals.html');
  await expect(page.locator('.manual-card')).toHaveCount(18);

  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
});

test('manuals page does not overflow on phones', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('phone'), 'Phone project only');
  await page.goto('./manuals.html');
  await expect(page.locator('.manual-card')).toHaveCount(18);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
