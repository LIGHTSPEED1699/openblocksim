import { test, expect } from '@playwright/test';

/**
 * Bug reproduction: connecting from Sum (Math node, left side) to TransferFunction
 * (Linear node, right side) fails. Forward direction (TF → Sum) works.
 *
 * This test places Sum on the left, TransferFunction on the right, then drags
 * from Sum's output handle to TransferFunction's input handle.
 * Expected: edge appears.
 * Actual (bug): no edge appears, overlay gets stuck.
 */

test(' Sum output → TransferFunction input creates edge (forward connection)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });

  const canvas = page.locator('.react-flow');

  // Place Sum on the left
  const sumChip = page.locator('[draggable="true"]').filter({ hasText: 'Sum' });
  await sumChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 200, y: 200 } });
  await page.mouse.up();

  // Place TransferFunction on the right
  const tfChip = page.locator('[draggable="true"]').filter({ hasText: 'TransferFunction' });
  await tfChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 500, y: 200 } });
  await page.mouse.up();

  // Wait for nodes to render
  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 5000 });

  // Drag from Sum output (right handle) to TransferFunction input (left handle)
  const sourceHandle = page.locator('.react-flow__node-Math .react-flow__handle-right').first();
  const targetHandle = page.locator('.react-flow__node-Linear .react-flow__handle-left').first();

  await sourceHandle.hover();
  await page.mouse.down();
  await targetHandle.hover();
  await page.mouse.up();

  // Assert: edge should appear
  await expect(page.locator('.react-flow__edge')).toHaveCount(1, { timeout: 5000 });
});

test('TransferFunction output → Sum input creates edge (backward connection, should auto-route)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });

  const canvas = page.locator('.react-flow');

  // Place Sum on the left
  const sumChip = page.locator('[draggable="true"]').filter({ hasText: 'Sum' });
  await sumChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 200, y: 200 } });
  await page.mouse.up();

  // Place TransferFunction on the right
  const tfChip = page.locator('[draggable="true"]').filter({ hasText: 'TransferFunction' });
  await tfChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 500, y: 200 } });
  await page.mouse.up();

  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 5000 });

  // Drag from TransferFunction output (right handle) to Sum input (left handle)
  // This is backward (source right of target) — should auto-route with U-shape
  const sourceHandle = page.locator('.react-flow__node-Linear .react-flow__handle-right').first();
  const targetHandle = page.locator('.react-flow__node-Math .react-flow__handle-left').first();

  await sourceHandle.hover();
  await page.mouse.down();
  await targetHandle.hover();
  await page.mouse.up();

  // Assert: edge should appear
  await expect(page.locator('.react-flow__edge')).toHaveCount(1, { timeout: 5000 });
});

test('overlay does not get stuck after failed connection attempt', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });

  const canvas = page.locator('.react-flow');

  // Place Sum and TransferFunction
  const sumChip = page.locator('[draggable="true"]').filter({ hasText: 'Sum' });
  await sumChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 200, y: 200 } });
  await page.mouse.up();

  const tfChip = page.locator('[draggable="true"]').filter({ hasText: 'TransferFunction' });
  await tfChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 500, y: 200 } });
  await page.mouse.up();

  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 5000 });

  // Start dragging from Sum output, release on empty canvas (not on a handle)
  const sourceHandle = page.locator('.react-flow__node-Math .react-flow__handle-right').first();
  await sourceHandle.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 350, y: 400 } }); // empty space
  await page.mouse.up();

  // After failed connection, canvas should still be interactive — no stuck overlay
  // Try to drag a new block: if overlay is stuck, this won't work
  const constantChip = page.locator('[draggable="true"]').filter({ hasText: 'Constant' });
  await constantChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 100, y: 400 } });
  await page.mouse.up();

  // If overlay is stuck, the new node won't appear
  await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 5000 });
});