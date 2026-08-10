# Edge Wire Redesign — Feedback Routing, Click-to-Plant, Signal Arrows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add feedback-edge auto-routing (downward U-shape), Simulink-style click-to-plant wire drawing, signal-flow arrows, and robust bend-drag to the shipped straight-edge system.

**Architecture:** Three new geometry functions compose with the existing waypoint pipeline. A tiny external observable store (`wireGesture.ts`) drives a custom `ConnectionPreview` (replaces React Flow's native connection line) and a `WireOverlay` (replaces React Flow's hold-drag UX with click-to-plant). StraightEdge gets screen-space hit testing, arrowheads, and hover handles. exportImport gets waypoint serialization.

**Tech Stack:** React 18, React Flow 12 (`@xyflow/react`), TypeScript, Vitest (unit), Playwright (E2E). No new npm dependencies — arrow uses React Flow's built-in `MarkerType`.

## Global Constraints

- All 157 existing tests must stay green throughout
- `npm run build` must pass after every task
- No changes to store schema, node components, block registry, or engine
- `computeFeedbackRoute` returns 4 interior waypoints (spec §6.2 patched 2026-08-09)
- WireOverlay completion must guard against double-edge-creation (spec §7 patched 2026-08-09)
- elementFromPoint hit-test must verify Handle detection during spike task (spec §6.4a patched)
- Existing StraightEdge tests (9 tests) may need mock updates for `useReactFlow().getZoom`

---

### Task 0 (Spike): Verify WireOverlay pointer-capture + elementFromPoint works in React Flow v12

**Files:**
- None (exploratory spike, write findings to plan)

**Interfaces:**
- Consumes: React Flow v12 DOM structure

- [ ] **Step 1: Create a minimal React Flow app that tests pointer capture override**

Write a throwaway spike page in `src/spike/WireSpike.tsx` that:
1. Mounts React Flow with one Source node and one Sink node
2. On `onConnectStart`, mounts a full-viewport overlay `<div>` with `pointerEvents: 'all'` and calls `setPointerCapture`
3. On overlay `onPointerUp`, calls `document.elementFromPoint(e.clientX, e.clientY)` and logs whether it hits a Handle element (check for `data-handleid` attribute)
4. Verifies the overlay receives pointer events after capture and that Handle detection works

```typescript
// Spike: src/spike/WireSpike.tsx
// Test objectives:
// A) Does setPointerCapture on overlay redirect events from React Flow?
// B) Does elementFromPoint find Handle elements under the overlay?
// C) Does React Flow's onConnectEnd still fire after our capture?
```

- [ ] **Step 2: Run spike and record findings**

Run: `npx vite --port 5173` and manually test. Record answers to A/B/C in a comment at the top of the spike file. If C is "yes", the double-edge guard is essential.

- [ ] **Step 3: Delete spike file**

```bash
rm -rf src/spike/
```

- [ ] **Step 4: Commit findings**

```bash
git commit -m "spike: verify WireOverlay pointer capture + elementFromPoint in React Flow v12"
```

---

### Task 1: Add new geometry functions (`geometry.ts`)

**Files:**
- Modify: `src/components/edges/geometry.ts`

**Interfaces:**
- Produces: `isBackwardEdge`, `nodePortPosition`, `computeFeedbackRoute` — consumed by Tasks 3, 5

- [ ] **Step 1: Add three pure functions to `src/components/edges/geometry.ts`**

```typescript
/**
 * A feedback edge flows right-to-left: source is positioned to the right of target.
 * Used as a heuristic — not all right-to-left edges are feedback, but in control
 * diagrams this is the dominant pattern.
 */
export function isBackwardEdge(
  sourceNode: { position: { x: number; y: number } },
  targetNode: { position: { x: number; y: number } },
): boolean {
  return sourceNode.position.x > targetNode.position.x;
}

/**
 * Returns the flow-coordinate position of a port on a node.
 *
 * x: right edge of node for source ports, left edge for target ports.
 * y: same topPct formula BaseNode uses for handle placement.
 * Falls back to width=100, height=40 when React Flow measured dims are unavailable.
 */
export function nodePortPosition(
  node: {
    position: { x: number; y: number };
    measured?: { width?: number; height?: number };
  },
  portIndex: number,
  totalPorts: number,
  isSource: boolean,
): XYPosition {
  const w = node.measured?.width ?? 100;
  const h = node.measured?.height ?? 40;
  const x = isSource ? node.position.x + w : node.position.x;
  const y = node.position.y + ((portIndex + 1) / (totalPorts + 1)) * h;
  return { x, y };
}

/**
 * Builds the downward U-shape interior waypoints for a feedback edge.
 *
 * Returns 4 waypoints (NOT including source/target — expandPoints handles those).
 * Full expanded vertex list is 6 vertices: [source, wp0, wp1, wp2, wp3, target].
 *
 *   source → wp0 (right) → wp1 (down) → wp2 (across) → wp3 (up) → target
 */
export function computeFeedbackRoute(
  sourcePort: XYPosition,
  targetPort: XYPosition,
  sourceBottom: number,
  targetBottom: number,
  clearance: number = 60,
): XYPosition[] {
  const bottomY = Math.max(sourceBottom, targetBottom) + clearance;
  return [
    { x: sourcePort.x + clearance, y: sourcePort.y },    // right out of source
    { x: sourcePort.x + clearance, y: bottomY },          // down below blocks
    { x: targetPort.x - clearance, y: bottomY },          // across
    { x: targetPort.x - clearance, y: targetPort.y },     // up into target
  ];
}
```

- [ ] **Step 2: Run existing geometry tests**

Run: `npx vitest run tests/components/geometry.test.ts`
Expected: 20 tests pass (no regressions).

- [ ] **Step 3: Commit**

```bash
git add src/components/edges/geometry.ts
git commit -m "feat: add isBackwardEdge, nodePortPosition, computeFeedbackRoute to geometry"
```

---

### Task 2: Write unit tests for new geometry functions

**Files:**
- Modify: `tests/components/geometry.test.ts` (append)

**Interfaces:**
- Consumes: `isBackwardEdge`, `nodePortPosition`, `computeFeedbackRoute` from Task 1

- [ ] **Step 1: Append tests to `tests/components/geometry.test.ts`**

```typescript
describe('isBackwardEdge', () => {
  it('true when source is right of target', () => {
    expect(isBackwardEdge(
      { position: { x: 300, y: 100 } },
      { position: { x: 100, y: 100 } },
    )).toBe(true);
  });

  it('false when source is left of target', () => {
    expect(isBackwardEdge(
      { position: { x: 100, y: 100 } },
      { position: { x: 300, y: 100 } },
    )).toBe(false);
  });

  it('false when x positions are equal', () => {
    expect(isBackwardEdge(
      { position: { x: 200, y: 100 } },
      { position: { x: 200, y: 300 } },
    )).toBe(false);
  });
});

describe('nodePortPosition', () => {
  const node = { position: { x: 100, y: 50 }, measured: { width: 120, height: 60 } };

  it('source port is on right edge', () => {
    const pos = nodePortPosition(node, 0, 1, true);
    expect(pos.x).toBe(220); // 100 + 120
  });

  it('target port is on left edge', () => {
    const pos = nodePortPosition(node, 0, 1, false);
    expect(pos.x).toBe(100);
  });

  it('y uses topPct formula: ((portIndex + 1) / (totalPorts + 1)) * height', () => {
    // port 0 of 2: (1/3)*60 = 20 → y = 50 + 20 = 70
    const pos = nodePortPosition(node, 0, 2, true);
    expect(pos.y).toBe(70);
    // port 1 of 2: (2/3)*60 = 40 → y = 50 + 40 = 90
    const pos2 = nodePortPosition(node, 1, 2, true);
    expect(pos2.y).toBe(90);
  });

  it('falls back to width=100, height=40 when measured is missing', () => {
    const bare = { position: { x: 0, y: 0 } };
    const pos = nodePortPosition(bare, 0, 1, true);
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(20); // (1/2)*40
  });
});

describe('computeFeedbackRoute', () => {
  it('returns 4 waypoints (source and target are implicit)', () => {
    const route = computeFeedbackRoute(
      { x: 300, y: 100 }, { x: 100, y: 100 },
      160, 140,
    );
    expect(route).toHaveLength(4);
  });

  it('waypoints form a downward U: right, down, across, up', () => {
    const route = computeFeedbackRoute(
      { x: 300, y: 100 }, { x: 100, y: 100 },
      160, 140, 60,
    );
    // wp0: right of source
    expect(route[0].x).toBe(360);
    expect(route[0].y).toBe(100);
    // wp1: down to bottomY = max(160,140) + 60 = 220
    expect(route[1].x).toBe(360);
    expect(route[1].y).toBe(220);
    // wp2: across to left of target
    expect(route[2].x).toBe(40);
    expect(route[2].y).toBe(220);
    // wp3: up to target y
    expect(route[3].x).toBe(40);
    expect(route[3].y).toBe(100);
  });

  it('with source+target via expandPoints produces 6-vertex path', () => {
    const route = computeFeedbackRoute(
      { x: 300, y: 100 }, { x: 100, y: 100 },
      160, 140,
    );
    const V = expandPoints(route, { x: 300, y: 100 }, { x: 100, y: 100 });
    expect(V).toHaveLength(6);
    // All consecutive pairs are axis-aligned
    for (let i = 0; i < V.length - 1; i++) {
      const hor = Math.abs(V[i].x - V[i+1].x) < 0.01;
      const ver = Math.abs(V[i].y - V[i+1].y) < 0.01;
      expect(hor || ver).toBe(true);
    }
  });

  it('bottomY is max(sourceBottom, targetBottom) + clearance', () => {
    const route = computeFeedbackRoute(
      { x: 300, y: 100 }, { x: 100, y: 100 },
      200, 150, 50,
    );
    // bottomY = max(200,150) + 50 = 250
    expect(route[1].y).toBe(250);
    expect(route[2].y).toBe(250);
  });
});
```

- [ ] **Step 2: Run geometry tests**

Run: `npx vitest run tests/components/geometry.test.ts`
Expected: 20 + 12 = 32 tests pass.

- [ ] **Step 3: Verify no regressions**

Run: `npx vitest run`
Expected: 157 + 12 = 169 tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/components/geometry.test.ts
git commit -m "test: add unit tests for isBackwardEdge, nodePortPosition, computeFeedbackRoute"
```

---

### Task 3: Create wireGesture.ts — external observable store

**Files:**
- Create: `src/components/edges/wireGesture.ts`

**Interfaces:**
- Produces: `wireGesture` store, `WireGestureState` type — consumed by Tasks 4, 5

- [ ] **Step 1: Create `src/components/edges/wireGesture.ts`**

```typescript
import type { XYPosition } from '@xyflow/react';

export interface WireGestureState {
  active: boolean;
  source: { nodeId: string; handleId: string } | null;
  planted: XYPosition[];
  cursor: XYPosition | null;
  pointerId: number | null;
}

type Listener = () => void;

let state: WireGestureState = {
  active: false,
  source: null,
  planted: [],
  cursor: null,
  pointerId: null,
};

const listeners = new Set<Listener>();

export const wireGesture = {
  get: (): WireGestureState => state,
  set: (patch: Partial<WireGestureState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe: (l: Listener) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  reset: () => {
    wireGesture.set({
      active: false,
      source: null,
      planted: [],
      cursor: null,
      pointerId: null,
    });
  },
};
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/components/edges/wireGesture.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/edges/wireGesture.ts
git commit -m "feat: add wireGesture external observable store for click-to-plant state"
```

---

### Task 4: Test wireGesture state transitions

**Files:**
- Create: `tests/components/wireGesture.test.ts`

- [ ] **Step 1: Create `tests/components/wireGesture.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { wireGesture } from '../../src/components/edges/wireGesture';

describe('wireGesture', () => {
  beforeEach(() => {
    wireGesture.reset();
  });

  it('starts inactive', () => {
    expect(wireGesture.get().active).toBe(false);
    expect(wireGesture.get().source).toBeNull();
    expect(wireGesture.get().planted).toEqual([]);
  });

  it('set updates state and fires listeners', () => {
    const listener = vi.fn();
    wireGesture.subscribe(listener);
    wireGesture.set({ active: true, source: { nodeId: 'n1', handleId: 'out-0' } });
    expect(wireGesture.get().active).toBe(true);
    expect(wireGesture.get().source).toEqual({ nodeId: 'n1', handleId: 'out-0' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('subscribe returns unsubscribe function', () => {
    const listener = vi.fn();
    const unsub = wireGesture.subscribe(listener);
    unsub();
    wireGesture.set({ active: true });
    expect(listener).not.toHaveBeenCalled();
  });

  it('plant appends to planted array', () => {
    wireGesture.set({ active: true, source: { nodeId: 'n1', handleId: 'out-0' } });
    const p1 = { x: 100, y: 200 };
    wireGesture.set({ planted: [...wireGesture.get().planted, p1] });
    const p2 = { x: 150, y: 250 };
    wireGesture.set({ planted: [...wireGesture.get().planted, p2] });
    expect(wireGesture.get().planted).toEqual([p1, p2]);
  });

  it('reset clears all fields', () => {
    wireGesture.set({
      active: true,
      source: { nodeId: 'n1', handleId: 'out-0' },
      planted: [{ x: 100, y: 200 }],
      cursor: { x: 150, y: 250 },
      pointerId: 1,
    });
    wireGesture.reset();
    expect(wireGesture.get()).toEqual({
      active: false,
      source: null,
      planted: [],
      cursor: null,
      pointerId: null,
    });
  });

  it('cursor updates independently of planted', () => {
    wireGesture.set({ active: true });
    wireGesture.set({ cursor: { x: 50, y: 50 } });
    expect(wireGesture.get().cursor).toEqual({ x: 50, y: 50 });
    expect(wireGesture.get().planted).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/components/wireGesture.test.ts`
Expected: 6 tests pass.

- [ ] **Step 3: Verify no regressions**

Run: `npx vitest run`
Expected: 169 + 6 = 175 tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/components/wireGesture.test.ts
git commit -m "test: add wireGesture state transition tests"
```

---

### Task 5: Create ConnectionPreview.tsx

**Files:**
- Create: `src/components/ConnectionPreview.tsx`

**Interfaces:**
- Consumes: `wireGesture` from Task 3, `nodePortPosition`, `expandPoints`, `buildOrthogonalPath` from geometry
- Produces: `ConnectionPreview` component — consumed by Task 7

- [ ] **Step 1: Create `src/components/ConnectionPreview.tsx`**

```typescript
import { useSyncExternalStore } from 'react';
import { useReactFlow, type ConnectionLineComponentProps } from '@xyflow/react';
import { wireGesture } from './edges/wireGesture';
import { nodePortPosition, expandPoints, buildOrthogonalPath } from './edges/geometry';
import React from 'react';

/**
 * Custom React Flow connectionLineComponent.
 *
 * Renders nothing when no wire is in progress. During a wire gesture:
 * - No planted vertices → straight line from source port to cursor + arrow.
 * - Planted vertices → orthogonal polyline through them + arrow.
 *
 * Driven entirely by wireGesture, not React Flow's transient connection props.
 */
export function ConnectionPreview(_props: ConnectionLineComponentProps) {
  const gesture = useSyncExternalStore(wireGesture.subscribe, wireGesture.get);
  const rf = useReactFlow();

  if (!gesture.active || !gesture.source) return null;

  const srcNode = rf.getNode(gesture.source.nodeId);
  if (!srcNode) return null;

  // Parse port index from handle id (e.g. "out-0" → 0)
  const srcPortIndex = parseInt(gesture.source.handleId.split('-').pop() ?? '0', 10) || 0;

  const sourcePort = nodePortPosition(
    srcNode,
    srcPortIndex,
    srcNode.data?.outputs ?? 1,
    true,
  );

  const cursor = gesture.cursor ?? sourcePort;
  const V = gesture.planted.length > 0
    ? expandPoints(gesture.planted, sourcePort, cursor)
    : [sourcePort, cursor];

  const path = buildOrthogonalPath(V);

  return (
    <g>
      <defs>
        <marker
          id="conn-preview-arrow"
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={8}
          markerHeight={8}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={2}
        markerEnd="url(#conn-preview-arrow)"
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/components/ConnectionPreview.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConnectionPreview.tsx
git commit -m "feat: add ConnectionPreview with gesture-driven orthogonal preview and arrow"
```

---

### Task 6: Test ConnectionPreview rendering states

**Files:**
- Create: `tests/components/ConnectionPreview.test.tsx`

- [ ] **Step 1: Create `tests/components/ConnectionPreview.test.tsx`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ConnectionPreview } from '../../src/components/ConnectionPreview';
import { wireGesture } from '../../src/components/edges/wireGesture';
import React from 'react';

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    useReactFlow: () => ({
      getNode: vi.fn((id: string) => {
        if (id === 'src-1') return {
          position: { x: 300, y: 100 },
          measured: { width: 120, height: 60 },
          data: { outputs: 1 },
        };
        if (id === 'tgt-1') return {
          position: { x: 100, y: 200 },
          measured: { width: 120, height: 60 },
          data: { inputs: 1 },
        };
        return undefined;
      }),
    }),
    ConnectionLineComponentProps: {},
  };
});

describe('ConnectionPreview', () => {
  beforeEach(() => {
    wireGesture.reset();
  });

  it('renders nothing when inactive', () => {
    const { container } = render(React.createElement(ConnectionPreview, {} as any));
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when source node is not found', () => {
    wireGesture.set({ active: true, source: { nodeId: 'missing', handleId: 'out-0' }, cursor: { x: 500, y: 100 } });
    const { container } = render(React.createElement(ConnectionPreview, {} as any));
    expect(container.innerHTML).toBe('');
  });

  it('renders a straight line + arrow with no planted vertices', () => {
    wireGesture.set({ active: true, source: { nodeId: 'src-1', handleId: 'out-0' }, cursor: { x: 500, y: 100 } });
    const { container } = render(React.createElement(ConnectionPreview, {} as any));
    const path = container.querySelector('path[marker-end]');
    expect(path).toBeTruthy();
    expect(path!.getAttribute('d')).toMatch(/^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/);
    expect(path!.getAttribute('marker-end')).toContain('conn-preview-arrow');
    expect(path!.getAttribute('d')).not.toMatch(/[CSQTA]/);
  });

  it('renders orthogonal polyline through planted vertices', () => {
    wireGesture.set({
      active: true,
      source: { nodeId: 'src-1', handleId: 'out-0' },
      planted: [{ x: 450, y: 100 }, { x: 450, y: 200 }],
      cursor: { x: 200, y: 200 },
    });
    const { container } = render(React.createElement(ConnectionPreview, {} as any));
    const path = container.querySelector('path');
    const d = path!.getAttribute('d')!;
    // Should pass through planted points (450,100) and (450,200)
    expect(d).toContain('450');
  });

  it('renders arrow marker defs', () => {
    wireGesture.set({ active: true, source: { nodeId: 'src-1', handleId: 'out-0' }, cursor: { x: 500, y: 100 } });
    const { container } = render(React.createElement(ConnectionPreview, {} as any));
    const marker = container.querySelector('#conn-preview-arrow');
    expect(marker).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/components/ConnectionPreview.test.tsx`
Expected: 5 tests pass.

- [ ] **Step 3: Verify no regressions**

Run: `npx vitest run`
Expected: 175 + 5 = 180 tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/components/ConnectionPreview.test.tsx
git commit -m "test: add ConnectionPreview rendering tests (inactive, straight, planted, arrow)"
```

---

### Task 7: Create WireOverlay.tsx and wire DiagramCanvas

**Files:**
- Create: `src/components/WireOverlay.tsx`
- Modify: `src/components/DiagramCanvas.tsx`

**Interfaces:**
- Consumes: `wireGesture` from Task 3, `ConnectionPreview` from Task 5
- Consumes: `useDiagramStore`, `useReactFlow`, `addEdge` from React Flow

- [ ] **Step 1: Create `src/components/WireOverlay.tsx`**

```typescript
import { useEffect, useCallback, useRef } from 'react';
import { useReactFlow, addEdge, type Connection } from '@xyflow/react';
import { wireGesture } from './edges/wireGesture';
import { isBackwardEdge, nodePortPosition, computeFeedbackRoute } from './edges/geometry';
import { useDiagramStore } from '../store/diagramStore';

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

/**
 * Full-pane transparent overlay for click-to-plant wire drawing.
 *
 * Mounted when a wire gesture starts. Steals pointer capture so all subsequent
 * pointer events route to this overlay instead of React Flow. Handles:
 * - Move: update cursor position for preview
 * - Click (pointerdown): plant a vertex at the click point
 * - Click on target Handle: complete the wire, create edge
 * - Escape key: cancel
 * - Double-click: cancel
 */
export function WireOverlay({ onComplete, onCancel }: Props) {
  const rf = useReactFlow();
  const completedRef = useRef(false);

  // Parse port index from handle id string (e.g. "out-0" → 0, "in-1" → 1)
  const parsePortIndex = (handleId: string) =>
    parseInt(handleId.split('-').pop() ?? '0', 10) || 0;

  const completeWire = useCallback(
    (targetNodeId: string, targetHandleId: string) => {
      if (completedRef.current) return;
      completedRef.current = true;

      const gesture = wireGesture.get();
      if (!gesture.source) return;

      const connection: Connection = {
        source: gesture.source.nodeId,
        target: targetNodeId,
        sourceHandle: gesture.source.handleId,
        targetHandle: targetHandleId,
      };

      const edges = useDiagramStore.getState().edges;
      let waypoints = gesture.planted;

      // If no vertices planted and this is a backward edge, auto-route
      if (waypoints.length === 0) {
        const srcNode = rf.getNode(connection.source!);
        const tgtNode = rf.getNode(connection.target!);
        if (srcNode && tgtNode && isBackwardEdge(srcNode, tgtNode)) {
          const srcPortIdx = parsePortIndex(connection.sourceHandle!);
          const tgtPortIdx = parsePortIndex(connection.targetHandle!);
          const srcPort = nodePortPosition(srcNode, srcPortIdx, srcNode.data?.outputs ?? 1, true);
          const tgtPort = nodePortPosition(tgtNode, tgtPortIdx, tgtNode.data?.inputs ?? 1, false);
          const srcBottom = srcNode.position.y + (srcNode.measured?.height ?? 40);
          const tgtBottom = tgtNode.position.y + (tgtNode.measured?.height ?? 40);
          waypoints = computeFeedbackRoute(srcPort, tgtPort, srcBottom, tgtBottom);
        }
      }

      const newEdge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        type: 'straight' as const,
        data: { waypoints },
      };

      useDiagramStore.getState().setEdges(addEdge(newEdge, edges) as any);
      wireGesture.reset();
      onComplete();
    },
    [rf, onComplete],
  );

  const cancelWire = useCallback(() => {
    wireGesture.reset();
    onCancel();
  }, [onCancel]);

  // Capture pointer on mount
  const onPointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      const overlay = e.currentTarget as HTMLElement;
      overlay.setPointerCapture(e.pointerId);
      wireGesture.set({ pointerId: e.pointerId });
    },
    [],
  );

  // Plant vertex on click
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const gesture = wireGesture.get();
      const flowPos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });

      // Check if the click is on a target Handle
      // Pitfall: elementFromPoint may return overlay itself if pointer-events stacking is wrong.
      // The overlay's background div has pointerEvents: 'none' so clicks pass through visually,
      // but setPointerCapture redirects all pointer events here. We must briefly release pointer
      // capture to peek underneath, or use React Flow's getIntersectingNodes as fallback.
      // For now, check if any node is at this position (simplified — handles aren't directly hit-testable).
      overlay.style.pointerEvents = 'none';
      const el = document.elementFromPoint(e.clientX, e.clientY);
      overlay.style.pointerEvents = 'all';

      if (el) {
        const handleEl = (el as HTMLElement).closest?.('[data-handleid]') as HTMLElement | null;
        if (handleEl) {
          const nodeId = handleEl.closest?.('[data-id]')?.getAttribute('data-id');
          const handleId = handleEl.getAttribute('data-handleid');
          if (nodeId && handleId && nodeId !== gesture.source?.nodeId) {
            completeWire(nodeId, handleId);
            return;
          }
        }
      }

      // Not on a handle — plant a vertex
      wireGesture.set({ planted: [...gesture.planted, flowPos] });
    },
    [rf, completeWire],
  );

  // Update cursor on move
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const flowPos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      wireGesture.set({ cursor: flowPos });
    },
    [rf],
  );

  // Escape key listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelWire();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancelWire]);

  // Safety: release pointer capture and reset on unmount
  useEffect(() => {
    return () => {
      if (!completedRef.current) {
        wireGesture.reset();
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1000,
        pointerEvents: 'all',
        cursor: 'crosshair',
      }}
      onPointerDownCapture={onPointerDownCapture}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onDoubleClick={cancelWire}
    />
  );
}
```

- [ ] **Step 2: Modify `DiagramCanvas.tsx` to wire up overlay and ConnectionPreview**

```typescript
// Add imports:
import { ConnectionPreview } from './ConnectionPreview';
import { WireOverlay } from './WireOverlay';
import { wireGesture } from './edges/wireGesture';
import { useState, useCallback } from 'react';

// Inside DiagramCanvas component, add state for wire drawing:
const [wireActive, setWireActive] = useState(false);

// onConnectStart handler:
const onConnectStart = useCallback(
  (_event: any, { nodeId, handleId }: { nodeId: string; handleId: string | null }) => {
    if (!handleId) return;
    wireGesture.set({ active: true, source: { nodeId, handleId }, planted: [], cursor: null });
    setWireActive(true);
  },
  [],
);

// onConnectEnd safety net (fires on React Flow's own pointerup):
const onConnectEnd = useCallback(() => {
  // If we already completed, nothing to do (completedRef in overlay guards double-edge)
  // If still active with no completion, clean up
  if (wireGesture.get().active) {
    wireGesture.reset();
    setWireActive(false);
  }
}, []);

// Wire completion/cancel callbacks:
const handleWireComplete = useCallback(() => setWireActive(false), []);
const handleWireCancel = useCallback(() => setWireActive(false), []);

// Add to <ReactFlow> props:
//   onConnectStart={onConnectStart}
//   onConnectEnd={onConnectEnd}
//   connectionLineComponent={ConnectionPreview}

// Add overlay after </ReactFlow>:
//   {wireActive && <WireOverlay onComplete={handleWireComplete} onCancel={handleWireCancel} />}
```

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: 180 tests pass (existing DiagramCanvas tests may need mock updates for new props).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/WireOverlay.tsx src/components/DiagramCanvas.tsx
git commit -m "feat: add WireOverlay click-to-plant + ConnectionPreview integration in DiagramCanvas"
```

---

### Task 8: Update StraightEdge — arrowhead, screen-space hit testing, hover handles, materialize-on-move

**Files:**
- Modify: `src/components/edges/StraightEdge.tsx`

**Interfaces:**
- Consumes: existing geometry functions, `useReactFlow().getZoom`

- [ ] **Step 1: Apply changes to `src/components/edges/StraightEdge.tsx`**

Four changes:

**A) Arrowhead —** Add `markerEnd` to `BaseEdge`:

```typescript
import { MarkerType } from '@xyflow/react';
// In BaseEdge:
<BaseEdge
  id={id}
  path={path}
  markerEnd={{
    type: MarkerType.ArrowClosed,
    color: selected ? '#3b82f6' : '#94a3b8',
    width: 14,
    height: 14,
  }}
  style={{ strokeWidth: 2, stroke: selected ? '#3b82f6' : '#94a3b8' }}
/>
```

**B) Screen-space hit testing —** `HIT_THRESHOLD` becomes screen-px, converted to flow units per zoom:

```typescript
const HIT_THRESHOLD_SCREEN_PX = 10;
// In onPointerDown:
const { screenToFlowPosition, getZoom } = useReactFlow();
// ...
const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
const zoom = getZoom();
const threshold = HIT_THRESHOLD_SCREEN_PX / zoom;
const segmentIndex = hitTestSegment(currentV, flowPos, threshold);
```

**C) Waypoint handles on hover —** Track `hovered` state, render markers when `selected || hovered`:

```typescript
const [hovered, setHovered] = useState(false);
// On hit path:
onPointerEnter={() => setHovered(true)}
onPointerLeave={() => setHovered(false)}
// Render waypoints:
{(selected || hovered) && waypoints.map(...)}
```

Waypoint handle dragging: `onPointerDown` on a circle with `stopPropagation` → start vertex drag (translate that single waypoint, preserving axis alignment with neighbors via existing `translateSegment`).

**D) Materialize-on-move —** Defer materialization to first `pointermove` with delta > 0:

```typescript
// Remove materialize logic from onPointerDown (lines 84-88 in current code).
// Replace with: record drag origin in ref, but don't materialize yet.

// In onPointerMove, on first move with delta > 0:
if (!dragRef.current) {
  // First move — materialize now
  if (waypoints.length === 0) {
    const frozenWp = materializeWaypoints(currentV);
    updateEdgeWaypoints(frozenWp);
    currentV = expandPoints(frozenWp, sourcePos, targetPos);
  }
  // ... establish drag state
}
```

- [ ] **Step 2: Update StraightEdge tests mock for `getZoom`**

In `tests/components/StraightEdge.test.tsx`, update `useReactFlow` mock:

```typescript
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    useReactFlow: () => ({
      screenToFlowPosition: vi.fn((p: { x: number; y: number }) => p),
      getZoom: () => 1,
    }),
  };
});
```

- [ ] **Step 3: Run StraightEdge tests**

Run: `npx vitest run tests/components/StraightEdge.test.tsx`
Expected: 9 tests pass (with mock update).

- [ ] **Step 4: Verify all tests + build**

Run: `npx vitest run && npm run build`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/components/edges/StraightEdge.tsx tests/components/StraightEdge.test.tsx
git commit -m "feat: add arrowhead, screen-space hit testing, hover handles, materialize-on-move to StraightEdge"
```

---

### Task 9: Update exportImport.ts — waypoint serialization

**Files:**
- Modify: `src/utils/exportImport.ts`

- [ ] **Step 1: Add waypoints to export and import**

In `exportModel` — update the `edges` map:

```typescript
edges: edges.map((e) => ({
  id: e.id,
  source: e.source,
  sourcePort: parsePort(e.sourceHandle),
  target: e.target,
  targetPort: parsePort(e.targetHandle),
  waypoints: (e.data as any)?.waypoints ?? [],  // NEW
})),
```

In `importModel` — update the `edges` map:

```typescript
const edges: Edge[] = data.edges.map((e) => ({
  id: e.id,
  source: e.source,
  target: e.target,
  sourceHandle: `out-${e.sourcePort}`,
  targetHandle: `in-${e.targetPort}`,
  type: 'straight',                                     // changed from default
  data: { waypoints: (e as any).waypoints ?? [] },      // NEW
}));
```

Update `ExportedModel` interface:

```typescript
interface ExportedModel {
  blocks: SerializedGraph['blocks'];
  edges: (SerializedGraph['edges'][number] & { waypoints?: XYPosition[] })[];  // MODIFIED
  simConfig: { dt: number; duration: number };
}
```

- [ ] **Step 2: Update exportImport tests**

Add to `tests/utils/exportImport.test.ts`:

```typescript
it('round-trips waypoints through export/import', async () => {
  // First import a model with waypoints
  const modelWithWaypoints = {
    blocks: [
      { id: 'src', type: 'Constant', params: { value: 1 }, position: { x: 300, y: 100 } },
      { id: 'tgt', type: 'Scope', params: {}, position: { x: 100, y: 100 } },
    ],
    edges: [
      { id: 'e1', source: 'src', sourcePort: 0, target: 'tgt', targetPort: 0,
        waypoints: [{ x: 350, y: 100 }, { x: 350, y: 200 }, { x: 50, y: 200 }, { x: 50, y: 100 }] },
    ],
  };
  const json = JSON.stringify(modelWithWaypoints);
  const file = new File([json], 'model.json', { type: 'application/json' });
  await importModel(file);

  const edge = useDiagramStore.getState().edges[0];
  expect((edge.data as any).waypoints).toEqual(modelWithWaypoints.edges[0].waypoints);
});

it('imports old-format JSON (no waypoints) with empty array', async () => {
  const oldJson = JSON.stringify({
    blocks: [{ id: 'src', type: 'Constant', params: {}, position: { x: 0, y: 0 } }],
    edges: [{ id: 'e1', source: 'src', sourcePort: 0, target: 'tgt', targetPort: 0 }],
  });
  // Need to add a Scope node too for import to succeed
  const json = JSON.stringify({
    blocks: [
      { id: 'src', type: 'Constant', params: {}, position: { x: 0, y: 0 } },
      { id: 'tgt', type: 'Scope', params: {}, position: { x: 100, y: 0 } },
    ],
    edges: [{ id: 'e1', source: 'src', sourcePort: 0, target: 'tgt', targetPort: 0 }],
  });
  const file = new File([json], 'old.json', { type: 'application/json' });
  await importModel(file);

  const edge = useDiagramStore.getState().edges[0];
  expect((edge.data as any).waypoints).toEqual([]);
  expect(edge.type).toBe('straight');
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/utils/exportImport.test.ts`
Expected: 12 tests pass (10 existing + 2 new).

- [ ] **Step 4: Verify all tests + build**

Run: `npx vitest run && npm run build`
Expected: 180 + 2 = 182 tests pass, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/utils/exportImport.ts tests/utils/exportImport.test.ts
git commit -m "feat: add waypoint serialization to exportImport with backward compat"
```

---

### Task 10: E2E tests — feedback route, click-to-plant, arrow

**Files:**
- Modify: `tests/e2e/edges.spec.ts` (append)

- [ ] **Step 1: Append E2E tests**

```typescript
test('feedback edge (source right of target) auto-routes with downward U', async ({ page }) => {
  // Place Step (source) to the RIGHT of Sum (target)
  const canvas = page.locator('.react-flow');
  // Place Sum first (left side)
  const sumChip = page.locator('[draggable="true"]').filter({ hasText: 'Sum' });
  await sumChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 200, y: 200 } });
  await page.mouse.up();

  // Place Step to the right
  const stepChip = page.locator('[draggable="true"]').filter({ hasText: 'Step' });
  await stepChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 500, y: 200 } });
  await page.mouse.up();

  // Connect Step output → Sum input: this is right-to-left (backward)
  const sourceHandle = page.locator('.react-flow__node-Source .react-flow__handle-right').first();
  const targetHandle = page.locator('.react-flow__node-Source .react-flow__handle-left'); // Sum's left input
  // Actually need Sum's handle. Let's use the Math node handles.
  const sumInputHandle = page.locator('.react-flow__node-Math .react-flow__handle-left').first();
  await sourceHandle.hover();
  await page.mouse.down();
  await sumInputHandle.hover();
  await page.mouse.up();

  // Assert edge exists and has a downward jog (y > block bottom)
  const edgePath = page.locator('.react-flow__edge path.react-flow__edge-path').first();
  const d = await edgePath.getAttribute('d');
  // The path should have a y component below 200 + node height (~240 with clearance)
  expect(d).toMatch(/L [\d.]+ [23][\d]{2}/); // y in 200-400 range (below blocks)
});

test('click-to-plant wire creates bends at click points', async ({ page }) => {
  // Place Constant and Scope
  const canvas = page.locator('.react-flow');
  const constantChip = page.locator('[draggable="true"]').filter({ hasText: 'Constant' });
  await constantChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 200, y: 200 } });
  await page.mouse.up();

  const scopeChip = page.locator('[draggable="true"]').filter({ has: page.locator('img[alt="Scope"]') });
  await scopeChip.hover();
  await page.mouse.down();
  await canvas.hover({ position: { x: 500, y: 400 } });
  await page.mouse.up();

  // Start wire from Constant's output handle
  const sourceHandle = page.locator('.react-flow__node-Source .react-flow__handle-right').first();
  await sourceHandle.click();

  // Click two points on canvas to plant vertices
  await canvas.click({ position: { x: 300, y: 200 } });
  await canvas.click({ position: { x: 300, y: 400 } });

  // Click on Scope's input handle to complete
  const targetHandle = page.locator('.react-flow__node-Sink .react-flow__handle-left').first();
  await targetHandle.click();

  // Assert edge was created with waypoints (non-empty path with bends)
  await expect(page.locator('.react-flow__edge')).toHaveCount(1, { timeout: 5000 });
});

test('arrow marker is present on edges', async ({ page }) => {
  // Same setup: Constant → Scope
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

  // Check marker-end attribute
  const edgePath = page.locator('.react-flow__edge path.react-flow__edge-path').first();
  const markerEnd = await edgePath.getAttribute('marker-end');
  expect(markerEnd).toBeTruthy();
  expect(markerEnd).toContain('arrow');
});
```

- [ ] **Step 2: Run E2E tests**

Run: `npx playwright test tests/e2e/edges.spec.ts --reporter=list`
Expected: new tests depend on click-to-plant UX behaving correctly in browser. May need refinement.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/edges.spec.ts
git commit -m "test: add E2E tests for feedback auto-route, click-to-plant, and arrow markers"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: 182+ tests pass.

- [ ] **Step 2: Run E2E tests**

Run: `npx playwright test`
Expected: E2E tests pass.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: `tsc` + `vite build` succeed.

- [ ] **Step 4: Acceptance checklist**

- [ ] New feedback edge auto-routes with downward U
- [ ] Click canvas mid-wire creates vertex
- [ ] Escape cancels wire
- [ ] Click-drag straight wire creates bend (zoom-independent)
- [ ] Waypoint handles on hover/select; drag moves; double-click deletes
- [ ] Every edge has arrowhead, color-matched to selection
- [ ] Connection preview shows arrow while drawing
- [ ] Waypoints survive JSON export → import
- [ ] All existing + new tests pass
- [ ] `npm run build` passes

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: final verification — all tests pass, build succeeds"
```
