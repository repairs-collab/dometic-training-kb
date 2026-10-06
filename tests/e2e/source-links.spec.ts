import { expect, test } from '@playwright/test';

test('source links resolve to the referenced PDF and page', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox').fill('RUC error 33');
  await page.getByRole('searchbox').press('Enter');
  const source = page.locator('.result-card').first().locator('.sources a').first();
  await expect(source).toHaveAttribute('href', /\.pdf#page=11$/);
  const href = await source.getAttribute('href');
  const sourceUrl = new URL(href!, page.url());
  sourceUrl.hash = '';
  const response = await page.request.get(sourceUrl.toString());

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
});

test('hazardous procedures show the warning before expandable steps', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox').fill('RUC fuse location');
  await page.getByRole('searchbox').press('Enter');
  const card = page.locator('.result-card').filter({ hasText: 'RUC AC and DC fuse locations' }).first();
  const warning = card.locator('.warning');
  const details = card.locator('details');

  await expect(warning).toContainText('lethal mains potential');
  expect(
    await warning.evaluate((element) =>
      Boolean(element.compareDocumentPosition(element.parentElement!.querySelector('details')!) & Node.DOCUMENT_POSITION_FOLLOWING),
    ),
  ).toBe(true);
  await expect(details).toBeVisible();
});
