import { test, expect } from '@playwright/test';

test.describe('Straight orthogonal edges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });
  });

  test('connecting two blocks renders orthogonal polyline, not bezier', async ({ page }) => {
    const constantChip = page.locator('[draggable="true"]').filter({ hasText: 'Constant' });
    const canvas = page.locator('.react-flow');
    await constantChip.hover();
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.up();

    const scopeChip = page.locator('[draggable="true"]').filter({ has: page.locator('img[alt="Scope"]') });
    await scopeChip.hover();
    await page.mouse.down();
    await canvas.hover({ position: { x: 500, y: 200 } });
    await page.mouse.up();

    const sourceHandle = page.locator('.react-flow__node-Source .react-flow__handle-right').first();
    const targetHandle = page.locator('.react-flow__node-Sink .react-flow__handle-left').first();
    await sourceHandle.hover();
    await page.mouse.down();
    await targetHandle.hover();
    await page.mouse.up();

    await expect(page.locator('.react-flow__edge')).toHaveCount(1, { timeout: 5000 });

    const edgePath = page.locator('.react-flow__edge path.react-flow__edge-path').first();
    await expect(edgePath).toBeVisible();
    const d = await edgePath.getAttribute('d');
    expect(d).toMatch(/^M [\d.]+ [\d.]+( L [\d.]+ [\d.]+)+$/);
    expect(d).not.toMatch(/[CSQTA]/);
  });

  test('clicking edge selects it (selected class applied)', async ({ page }) => {
    const constantChip = page.locator('[draggable="true"]').filter({ hasText: 'Constant' });
    const canvas = page.locator('.react-flow');
    await constantChip.hover();
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.up();

    const scopeChip = page.locator('[draggable="true"]').filter({ has: page.locator('img[alt="Scope"]') });
    await scopeChip.hover();
    await page.mouse.down();
    await canvas.hover({ position: { x: 500, y: 200 } });
    await page.mouse.up();

    const sourceHandle = page.locator('.react-flow__node-Source .react-flow__handle-right').first();
    const targetHandle = page.locator('.react-flow__node-Sink .react-flow__handle-left').first();
    await sourceHandle.hover();
    await page.mouse.down();
    await targetHandle.hover();
    await page.mouse.up();

    await expect(page.locator('.react-flow__edge')).toHaveCount(1);

    await page.locator('.react-flow__edge').first().click();

    await expect(page.locator('.react-flow__edge.selected')).toHaveCount(1);
  });

  test('Delete key removes selected edge', async ({ page }) => {
    const canvas = page.locator('.react-flow');
    const constantChip = page.locator('[draggable="true"]').filter({ hasText: 'Constant' });
    await constantChip.hover();
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.up();

    const scopeChip = page.locator('[draggable="true"]').filter({ has: page.locator('img[alt="Scope"]') });
    await scopeChip.hover();
    await page.mouse.down();
    await canvas.hover({ position: { x: 500, y: 200 } });
    await page.mouse.up();

    const sourceHandle = page.locator('.react-flow__node-Source .react-flow__handle-right').first();
    const targetHandle = page.locator('.react-flow__node-Sink .react-flow__handle-left').first();
    await sourceHandle.hover();
    await page.mouse.down();
    await targetHandle.hover();
    await page.mouse.up();

    await expect(page.locator('.react-flow__edge')).toHaveCount(1);

    await page.locator('.react-flow__edge').first().click();
    await page.keyboard.press('Delete');

    await expect(page.locator('.react-flow__edge')).toHaveCount(0);
  });
});

test('feedback edge (source right of target) auto-routes with downward U', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });

  const canvas = page.locator('.react-flow');

  // Place Sum first (left side) — Math node
  const sumChip = page.locator('[draggable="true"]').filter({ hasText: 'Sum' });
  await sumChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 200, y: 200 } });
  await page.mouse.up();

  // Place Step to the right (source)
  const stepChip = page.locator('[draggable="true"]').filter({ has: page.locator('img[alt="Step"]') });
  await stepChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 500, y: 200 } });
  await page.mouse.up();

  // Connect Step output → Sum first input: this is right-to-left (backward)
  const sourceHandle = page.locator('.react-flow__node-Source .react-flow__handle-right').first();
  const targetHandle = page.locator('.react-flow__node-Math .react-flow__handle-left').first();
  await sourceHandle.hover();
  await page.mouse.down();
  await targetHandle.hover();
  await page.mouse.up();

  await expect(page.locator('.react-flow__edge')).toHaveCount(1, { timeout: 5000 });

  // Assert the edge path has a downward jog (y > block bottom ~240 with clearance)
  const edgePath = page.locator('.react-flow__edge path.react-flow__edge-path').first();
  const d = await edgePath.getAttribute('d');
  expect(d).toBeTruthy();
  // The path should have a y component below 200 + node height (~260+ with clearance)
  expect(d).toMatch(/L [\d.]+ (2[6-9]\d|[3-9]\d\d)/);
});

test('arrow marker is present on edges', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });

  const canvas = page.locator('.react-flow');
  const constantChip = page.locator('[draggable="true"]').filter({ hasText: 'Constant' });
  await constantChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 200, y: 200 } });
  await page.mouse.up();

  const scopeChip = page.locator('[draggable="true"]').filter({ has: page.locator('img[alt="Scope"]') });
  await scopeChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 500, y: 200 } });
  await page.mouse.up();

  const sourceHandle = page.locator('.react-flow__node-Source .react-flow__handle-right').first();
  const targetHandle = page.locator('.react-flow__node-Sink .react-flow__handle-left').first();
  await sourceHandle.hover();
  await page.mouse.down();
  await targetHandle.hover();
  await page.mouse.up();

  await expect(page.locator('.react-flow__edge')).toHaveCount(1, { timeout: 5000 });

  const edgePath = page.locator('.react-flow__edge path.react-flow__edge-path').first();
  const markerEnd = await edgePath.getAttribute('marker-end');
  expect(markerEnd).toBeTruthy();
  expect(markerEnd).toContain('arrow');
});
