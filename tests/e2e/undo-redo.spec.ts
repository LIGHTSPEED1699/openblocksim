import { test, expect } from '@playwright/test';

async function dropConstant(page: import('@playwright/test').Page) {
  const chip = page.locator('[draggable="true"]').filter({ hasText: 'Constant' });
  const canvas = page.locator('.react-flow');
  await chip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 220, y: 220 } });
  await page.mouse.up();
  await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 5000 });
}

test('Ctrl+Z undoes an added block, Ctrl+Y and toolbar Redo redo it', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });
  await dropConstant(page);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);

  await page.keyboard.press('Control+z'); // no-op now (nothing to undo)
  await expect(page.locator('.react-flow__node')).toHaveCount(0);

  await page.keyboard.press('Control+y'); // redo via keyboard
  await expect(page.locator('.react-flow__node')).toHaveCount(1);

  await page.keyboard.press('Control+z'); // undo via keyboard
  await expect(page.locator('.react-flow__node')).toHaveCount(0);

  await page.getByRole('button', { name: 'Redo' }).click(); // redo via toolbar
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
});

test('Ctrl+Z restores a dragged node to its original position', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });
  await dropConstant(page);

  const node = page.locator('.react-flow__node').first();
  const before = (await node.boundingBox())!;
  const startX = before.x + before.width / 2;
  const startY = before.y + before.height / 2;

  await node.hover();
  await page.mouse.down();
  await page.mouse.move(startX + 160, startY + 80, { steps: 6 });
  await page.mouse.up();
  const afterDrag = (await page.locator('.react-flow__node').first().boundingBox())!;
  expect(Math.abs(afterDrag.x - before.x)).toBeGreaterThan(50); // the drag actually moved it

  await page.keyboard.press('Control+z');
  const afterUndo = (await page.locator('.react-flow__node').first().boundingBox())!;
  expect(Math.abs(afterUndo.x - before.x)).toBeLessThan(3);
  expect(Math.abs(afterUndo.y - before.y)).toBeLessThan(3);
});

test('Delete key then Ctrl+Z restores the block; history is empty after reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });
  await dropConstant(page);

  await page.locator('.react-flow__node').first().click();
  await page.keyboard.press('Delete');
  await expect(page.locator('.react-flow__node')).toHaveCount(0);

  await page.keyboard.press('Control+z');
  await expect(page.locator('.react-flow__node')).toHaveCount(1);

  // R-F3: history is session-transient — a reload starts with undo disabled.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await expect(page.locator('.react-flow__node')).toHaveCount(1); // model itself persisted
});
