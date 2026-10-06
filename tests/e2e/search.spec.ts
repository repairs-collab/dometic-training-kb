import { expect, test } from '@playwright/test';

const acceptanceSearches = [
  ['RUC error 33', 'RUC error 33: compressor start failure'],
  ['awning leaking at stitching', 'Awning fabric leaking through stitching'],
  ['FJZ not turning on', 'FJZ ADB display will not turn on'],
  ['three flashes portable fridge', 'Portable fridge three flashes: compressor start failure'],
  ['RCD door not closing', 'RCD dual-hinge door not closing or latching'],
  ['RUA settings locked', 'RUA settings cannot be changed: child lock'],
  ['FreshJet generator size', 'Generator size for Dometic air conditioners'],
  ['RUC fuse location', 'RUC AC and DC fuse locations'],
  ['MC101 gas connections', 'MC101 and MC102 rear gas connection points'],
] as const;

for (const [query, expectedTitle] of acceptanceSearches) {
  test(`${query} returns the intended reviewed answer first`, async ({ page }) => {
    await page.goto('./');
    const search = page.getByRole('searchbox');
    await search.fill(query);
    await search.press('Enter');

    await expect(page.locator('.result-card h3').first()).toHaveText(expectedTitle);
    await expect(page.locator('.result-card').first()).toContainText('Reviewed answer');
  });
}

test('filters can be applied and reset', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox').fill('door');
  await page.getByRole('searchbox').press('Enter');
  const category = page.getByLabel('Product category');
  await category.selectOption('awning');
  await expect(page.locator('.result-card').first()).toContainText('awning');
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(category).toHaveValue('');
  await expect(page.locator('.result-card').first()).toContainText('upright refrigerator');
});

test('no-result state offers a useful recovery path', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox').fill('quantum toaster nebula');
  await page.getByRole('searchbox').press('Enter');

  await expect(page.getByText('No matching manual information found')).toBeVisible();
  await expect(page.getByText(/Try a model number, error code, or symptom/i)).toBeVisible();
});

test('uncurated exact codes return the matching manual page', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox').fill('RUC E34');
  await page.getByRole('searchbox').press('Enter');

  const first = page.locator('.result-card').first();
  await expect(first.locator('h3')).toHaveText(
    'Dual-Hinge Refrigerator Service Training - August 2026 - page 5',
  );
  await expect(first).toContainText('compressor overload');
  await expect(first).toContainText('Model scope: check the cited manual page');
  await expect(first).not.toContainText('Applies to: RUC, RCD, RUA, RMD');
});

test('duplicate pages keep every source manual searchable', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox').fill('FJZ P2');
  await page.getByRole('searchbox').press('Enter');

  const first = page.locator('.result-card').first();
  await expect(first).toContainText('Unit AC over-current protection P2');
  await expect(first.locator('.sources a')).toHaveCount(2);
  await expect(first.locator('.sources')).toContainText('FreshJet FJZ Series training');
});

test('unknown exact codes do not return a different diagnosis', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox').fill('RUA error 99');
  await page.getByRole('searchbox').press('Enter');

  await expect(page.getByText('No matching manual information found')).toBeVisible();
});
