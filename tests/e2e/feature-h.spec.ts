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

async function storedWaypoints(page: import('@playwright/test').Page): Promise<{ x: number; y: number }[]> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('openblocksim-store');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const edges = parsed?.state?.edges ?? [];
    return edges[0]?.data?.waypoints ?? [];
  });
}

// Seed the persisted store (same localStorage key Zustand persist uses) with a
// straight edge between two widely separated nodes, then reload so the app
// rehydrates it. This is more deterministic than drag-dropping two blocks:
// React Flow re-fits the viewport as nodes are added, collapsing fixed-offset
// drops near one another and leaving an edge too short to drag.
async function seedStraightEdge(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const model = {
      state: {
        nodes: [
          { id: 'src', type: 'Source', position: { x: 0, y: 100 }, data: { type: 'Constant', inputs: 0, outputs: 1, color: 'bg-green-500' } },
          { id: 'tgt', type: 'Sink', position: { x: 500, y: 100 }, data: { type: 'Scope', inputs: 1, outputs: 0, color: 'bg-purple-500' } },
        ],
        edges: [{ id: 'e1', source: 'src', target: 'tgt', sourceHandle: 'out-0', targetHandle: 'in-0', type: 'straight', data: { waypoints: [] } }],
        params: { src: { value: 1 }, tgt: {} },
        simConfig: { dt: 0.01, duration: 10 },
        theme: 'dark',
        groups: [],
      },
      version: 0,
    };
    localStorage.setItem('openblocksim-store', JSON.stringify(model));
  });
  await page.reload();
  await expect(page.locator('.react-flow__edge')).toHaveCount(1, { timeout: 5000 });
}

test.describe('Feature H: draggable wire waypoints persist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });
  });

  test('dragging a straight edge bends it, stores a waypoint, and survives reload', async ({ page }) => {
    await seedStraightEdge(page);
    expect(await storedWaypoints(page)).toEqual([]);

    // Select the edge, then drag its midpoint straight down ~40px. Anchor on
    // the path bounding box (React Flow may fitView-pan/zoom the canvas). The
    // reconnect "edgeupdater" circles render at the edge ENDS, so the midpoint
    // press reaches the edge's own hit path.
    await page.locator('.react-flow__edge').first().click();
    const dBefore = await page.locator('.react-flow__edge path.react-flow__edge-path').first().getAttribute('d');
    const flowY = Number((dBefore ?? '').match(/[\d.]+/g)![1]);
    const pbbox = await page.locator('.react-flow__edge path.react-flow__edge-path').first().boundingBox();
    const midX = pbbox!.x + pbbox!.width / 2;
    const midY = pbbox!.y + pbbox!.height / 2;

    await page.mouse.move(midX, midY);
    await page.mouse.down();
    await page.mouse.move(midX, midY + 40, { steps: 8 });
    await page.mouse.up();

    const wp = await storedWaypoints(page);
    expect(wp.length).toBe(1);
    expect(wp[0].y).toBeGreaterThan(flowY + 2);

    // Persistence: reload the page (same context → same localStorage).
    await page.reload();
    await expect(page.locator('.react-flow__edge')).toHaveCount(1, { timeout: 5000 });
    expect(await storedWaypoints(page)).toEqual(wp);

    // The waypoint dot is rendered again after reload (edge selected). The dot
    // is our blue circle (#60a5fa); RF also renders reconnect updater circles
    // on a selected edge, so scope the assertion to the blue fill.
    await page.locator('.react-flow__edge').first().click();
    await expect(page.locator('.react-flow__edge circle[fill="#60a5fa"]')).toHaveCount(1, { timeout: 5000 });
  });

  test('double-clicking the waypoint dot removes it', async ({ page }) => {
    await seedStraightEdge(page);

    await page.locator('.react-flow__edge').first().click();
    const pbbox = await page.locator('.react-flow__edge path.react-flow__edge-path').first().boundingBox();
    const midX = pbbox!.x + pbbox!.width / 2;
    const midY = pbbox!.y + pbbox!.height / 2;
    await page.mouse.move(midX, midY);
    await page.mouse.down();
    await page.mouse.move(midX, midY + 40, { steps: 8 });
    await page.mouse.up();
    expect((await storedWaypoints(page)).length).toBe(1);

    await page.locator('.react-flow__edge circle[fill="#60a5fa"]').first().dblclick();
    expect(await storedWaypoints(page)).toEqual([]);
  });
});
