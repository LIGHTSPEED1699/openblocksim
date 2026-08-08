import { test, expect } from '@playwright/test';

test('app loads with toolbar, block library, and sim config', async ({ page }) => {
  await page.goto('/');

  // Toolbar buttons
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();

  // Block library category headers (h3 elements, exact match)
  await expect(page.getByRole('heading', { name: 'Sources', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sinks', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Math', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Linear', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nonlinear', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Control', exact: true })).toBeVisible();

  // Block chips
  await expect(page.locator('[draggable="true"]').filter({ hasText: 'Constant' })).toBeVisible();
  await expect(page.locator('[draggable="true"]').filter({ hasText: 'PID' })).toBeVisible();

  // Sim config inputs present with defaults
  const dtInput = page.locator('input[type="number"][step="0.001"]');
  const durInput = page.locator('input[type="number"][step="1"]');
  await expect(dtInput).toHaveValue('0.01');
  await expect(durInput).toHaveValue('10');

  // Parameter panel shows empty state
  await expect(page.getByText(/No block selected/i)).toBeVisible();
});

test('drag a Constant block onto the canvas', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });

  // Drag Constant onto canvas
  const constantChip = page.locator('[draggable="true"]').filter({ hasText: 'Constant' });
  const canvas = page.locator('.react-flow');
  await constantChip.hover();
  await page.mouse.down();
  await canvas.hover();
  await page.mouse.up();

  // A node should appear on the canvas
  await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 5000 });
});

test('clicking Run with no blocks shows empty plot message', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByText(/Run a simulation to see plots|No Scope/i)).toBeVisible({ timeout: 10000 });
});