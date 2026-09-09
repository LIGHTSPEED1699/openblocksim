import { test, expect } from '@playwright/test';

async function dropBlock(page: import('@playwright/test').Page, label: string, x: number, y: number) {
  const chip = page.locator('[draggable="true"]').filter({ hasText: label });
  await chip.hover();
  await page.mouse.down();
  await page.locator('.react-flow').hover({ position: { x, y } });
  await page.mouse.up();
}

async function connect(page: import('@playwright/test').Page, srcHandle: string, tgtHandle: string) {
  await page.locator(srcHandle).first().hover();
  await page.mouse.down();
  await page.locator(tgtHandle).first().hover();
  await page.mouse.up();
}

test.describe('Feature H: port labels + flip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });
  });

  test('semantic port labels render on a Gain node', async ({ page }) => {
    await dropBlock(page, 'Gain', 200, 200);
    const node = page.locator('.react-flow__node').first();
    await expect(node.getByTestId('port-in-0')).toContainText('u');
    await expect(node.getByTestId('port-out-0')).toContainText('y');
  });

  test('F key flips the selected node and swaps handle sides', async ({ page }) => {
    await dropBlock(page, 'Constant', 200, 200);
    const node = page.locator('.react-flow__node-Source').first();
    await node.click();
    await page.keyboard.press('f');
    // Constant is a source: unflipped its out-0 handle is on the right.
    await expect(page.locator('.react-flow__node-Source .react-flow__handle-left[data-handleid="out-0"]')).toBeVisible();
    await expect(page.locator('.react-flow__node-Source .react-flow__handle-right[data-handleid="out-0"]')).toHaveCount(0);
  });

  test('right-click menu flips a node', async ({ page }) => {
    await dropBlock(page, 'Constant', 200, 200);
    const node = page.locator('.react-flow__node-Source').first();
    await node.click({ button: 'right' });
    await expect(page.getByRole('menuitem', { name: /Flip/ })).toBeVisible();
    await page.getByRole('menuitem', { name: /Flip/ }).click();
    await expect(page.locator('.react-flow__node-Source .react-flow__handle-left[data-handleid="out-0"]')).toBeVisible();
  });

  test('flipping a node keeps its edges connected', async ({ page }) => {
    await dropBlock(page, 'Constant', 150, 200);
    await dropBlock(page, 'Scope', 500, 200);
    await connect(page, '.react-flow__node-Source .react-flow__handle-right', '.react-flow__node-Sink .react-flow__handle-left');
    await expect(page.locator('.react-flow__edge')).toHaveCount(1, { timeout: 5000 });

    const sink = page.locator('.react-flow__node-Sink').first();
    await sink.click();
    await page.keyboard.press('f');
    // Still one edge; the Scope's in-0 target handle is now on the right.
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    await expect(page.locator('.react-flow__node-Sink .react-flow__handle-right[data-handleid="in-0"]')).toBeVisible();
  });

  test('flip toggles back with a second F', async ({ page }) => {
    await dropBlock(page, 'Constant', 200, 200);
    const node = page.locator('.react-flow__node-Source').first();
    await node.click();
    await page.keyboard.press('f');
    await page.keyboard.press('f');
    await expect(page.locator('.react-flow__node-Source .react-flow__handle-right[data-handleid="out-0"]')).toBeVisible();
  });
});
