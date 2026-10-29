import { expect, test } from '@playwright/test';

import { openAuthenticatedPage } from './auth';

for (const path of ['./', './manuals.html']) {
  test(`${path} is locked before authentication`, async ({ page }) => {
    await page.goto(path);

    await expect(page.getByRole('heading', { level: 1, name: 'Team access' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log out' })).toHaveCount(0);
  });
}

test('incorrect credentials remain locked', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Username').fill('wrong');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByRole('alert')).toHaveText('The username or password is incorrect.');
  await expect(page.getByRole('heading', { level: 1, name: 'Team access' })).toBeVisible();
});

test('login persists across navigation and logout locks the site again', async ({ page }) => {
  await openAuthenticatedPage(page, './');
  await expect(page.getByRole('heading', { level: 1, name: 'Dometic Training Knowledge Base' })).toBeVisible();

  await page.getByRole('link', { name: 'Manuals' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Training resources' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Team access' })).toBeVisible();
});

test('login screen does not overflow on phones', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('phone'), 'Phone project only');
  await page.goto('./');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
