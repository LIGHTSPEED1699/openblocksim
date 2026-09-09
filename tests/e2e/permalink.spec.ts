import { test, expect } from '@playwright/test';
import { encodeModel } from '../../src/utils/permalink';
import { EXAMPLES } from '../../src/examples';

test('opens a model from a URL-hash permalink', async ({ page, browser }) => {
  const example = EXAMPLES[0]; // 'first-order-step': 3 blocks
  const hash = encodeModel(example.model);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });
  // A shared link is opened in a fresh tab: load the #m= URL as a brand-new page.
  const fresh = await browser.newPage();
  await fresh.goto(`/#m=${hash}`);
  await expect(fresh.locator('.react-flow__node')).toHaveCount(3, { timeout: 5000 });
  await fresh.close();
});

test('shows the sim error banner for a corrupt permalink', async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('/#m=%%%not-a-link%%%');
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Invalid model link/i)).toBeVisible({ timeout: 5000 });
  await page.close();
});
