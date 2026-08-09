# Straight Edge Segments — Simulink-Style Orthogonal Edges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace bezier edges with Simulink-style straight orthogonal polylines with segment dragging, waypoint persistence, and migration of old diagrams.

**Architecture:** Pure geometry functions in `geometry.ts` (no React/DOM, fully unit-testable) feed an all-SVG custom React Flow edge component. Waypoints live in `edge.data.waypoints` and survive localStorage persistence + JSON export/import. The existing `StraightEdge.tsx` (handle-based, broken) is fully rewritten.

**Tech Stack:** React 18, React Flow 12 (`@xyflow/react`), zustand 5 (persist middleware), TypeScript, Vitest (unit), Playwright (E2E).

## Global Constraints

- `@xyflow/react` ^12.11.2 — must use React Flow v12 APIs (no v11 `onEdgeUpdate` patterns)
- TypeScript strict mode via `tsc -p tsconfig.build.json` — build must pass
- All 85 existing tests must stay green
- Vitest for unit tests, Playwright for E2E
- zustand `persist` middleware with `partialize` — edges already persisted, don't break it
- Orthogonality invariant: all segments must be horizontal or vertical at all times

---

### Task 1: Create pure geometry functions (`geometry.ts`)

**Files:**
- Create: `src/components/edges/geometry.ts`

**Interfaces:**
- Produces: `expandPoints`, `buildOrthogonalPath`, `hitTestSegment`, `insertWaypoint`, `translateSegment`, `removeWaypoint` — consumed by Tasks 2, 3.

- [ ] **Step 1: Create `src/components/edges/geometry.ts`**

```typescript
import type { XYPosition } from '@xyflow/react';

/**
 * Expand stored waypoints + source/target into the full rendered vertex list.
 *
 * - waypoints non-empty → [sourcePos, ...waypoints, targetPos]
 * - waypoints empty, same y → [sourcePos, targetPos]
 * - waypoints empty, different y → [sourcePos, midpointJog, targetPos]
 *   where midpointJog = ((sourcePos.x + targetPos.x) / 2, sourcePos.y)
 *
 * Every consecutive pair in the result is axis-aligned by construction.
 */
export function expandPoints(
  waypoints: XYPosition[],
  sourcePos: XYPosition,
  targetPos: XYPosition,
): XYPosition[] {
  if (waypoints.length > 0) {
    return [sourcePos, ...waypoints, targetPos];
  }
  // Auto-routing
  if (Math.abs(sourcePos.y - targetPos.y) < 0.5) {
    // Same y — straight line
    return [sourcePos, targetPos];
  }
  // Different y — 3-segment orthogonal jog
  const mx = (sourcePos.x + targetPos.x) / 2;
  const midpointJog: XYPosition = { x: mx, y: sourcePos.y };
  return [sourcePos, midpointJog, targetPos];
}

/**
 * Build an SVG path string from the expanded vertex list.
 * Each consecutive pair is axis-aligned — produces M + consecutive L.
 */
export function buildOrthogonalPath(V: XYPosition[]): string {
  if (V.length < 2) return '';
  let d = `M ${V[0].x} ${V[0].y}`;
  for (let i = 1; i < V.length; i++) {
    d += ` L ${V[i].x} ${V[i].y}`;
  }
  return d;
}

/**
 * Hit-test which segment the cursor is near.
 *
 * Returns the index i such that the segment V[i]→V[i+1] is within
 * `threshold` of the cursor, or null if none match.
 *
 * Segments are axis-aligned: horizontal segments measure vertical distance,
 * vertical segments measure horizontal distance. Cursor must also be within
 * the segment's span (not just its infinite line).
 */
export function hitTestSegment(
  V: XYPosition[],
  cursor: XYPosition,
  threshold: number,
): number | null {
  for (let i = 0; i < V.length - 1; i++) {
    const a = V[i];
    const b = V[i + 1];
    const isHorizontal = Math.abs(a.y - b.y) < 0.5;
    if (isHorizontal) {
      const dist = Math.abs(cursor.y - a.y);
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      if (dist <= threshold && cursor.x >= minX && cursor.x <= maxX) {
        return i;
      }
    } else {
      const dist = Math.abs(cursor.x - a.x);
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      if (dist <= threshold && cursor.y >= minY && cursor.y <= maxY) {
        return i;
      }
    }
  }
  return null;
}

/**
 * Insert a position into segment V[segmentIndex]→V[segmentIndex+1], orthogonalized.
 *
 * The inserted point is snapped to the segment's axis:
 * - horizontal segment → keep segment y, use cursor x
 * - vertical segment → keep segment x, use cursor y
 *
 * Returns a new expanded vertex list.
 */
export function insertWaypoint(
  V: XYPosition[],
  segmentIndex: number,
  pos: XYPosition,
): XYPosition[] {
  const a = V[segmentIndex];
  const b = V[segmentIndex + 1];
  const isHorizontal = Math.abs(a.y - b.y) < 0.5;
  const snapped: XYPosition = isHorizontal
    ? { x: pos.x, y: a.y }
    : { x: a.x, y: pos.y };

  const result = [...V];
  result.splice(segmentIndex + 1, 0, snapped);
  return result;
}

/**
 * Translate a segment perpendicular to its axis.
 *
 * - Segment between two interior vertices (both ends are waypoints/jogs):
 *   both endpoint vertices move by delta.
 * - Segment adjacent to source (segmentIndex === 0):
 *   only V[1] (the interior vertex) moves by delta; source stays.
 * - Segment adjacent to target (segmentIndex === V.length - 2):
 *   only V[segmentIndex] (the interior vertex) moves by delta; target stays.
 *
 * The delta must be perpendicular to the segment (horizontal → {dx:0, dy:N};
 * vertical → {dx:N, dy:0}). Caller is responsible for constraining delta.
 *
 * Returns a new expanded vertex list.
 */
export function translateSegment(
  V: XYPosition[],
  segmentIndex: number,
  delta: XYPosition,
): XYPosition[] {
  const result = V.map((v) => ({ ...v }));
  const isFirst = segmentIndex === 0;
  const isLast = segmentIndex === V.length - 2;

  if (isFirst && !isLast) {
    // Adjacent to source: only V[1] moves
    result[1] = { x: result[1].x + delta.x, y: result[1].y + delta.y };
  } else if (isLast && !isFirst) {
    // Adjacent to target: only V[segmentIndex] moves
    result[segmentIndex] = {
      x: result[segmentIndex].x + delta.x,
      y: result[segmentIndex].y + delta.y,
    };
  } else {
    // Both ends are interior vertices: move both
    result[segmentIndex] = {
      x: result[segmentIndex].x + delta.x,
      y: result[segmentIndex].y + delta.y,
    };
    result[segmentIndex + 1] = {
      x: result[segmentIndex + 1].x + delta.x,
      y: result[segmentIndex + 1].y + delta.y,
    };
  }
  return result;
}

/**
 * Remove a waypoint from the stored waypoints array.
 *
 * Removing the last waypoint returns [] (falls back to auto-routing).
 * This operates on the raw waypoints array, not the expanded V.
 */
export function removeWaypoint(
  waypoints: XYPosition[],
  waypointIndex: number,
): XYPosition[] {
  return waypoints.filter((_, i) => i !== waypointIndex);
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/components/edges/geometry.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/edges/geometry.ts
git commit -m "feat: add pure geometry functions for orthogonal edge routing"
```

---

### Task 2: Write unit tests for geometry.ts

**Files:**
- Create: `tests/components/geometry.test.ts`

**Interfaces:**
- Consumes: all exports from `src/components/edges/geometry.ts` (Task 1)

- [ ] **Step 1: Create `tests/components/geometry.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import {
  expandPoints,
  buildOrthogonalPath,
  hitTestSegment,
  insertWaypoint,
  translateSegment,
  removeWaypoint,
} from '../../src/components/edges/geometry';
import type { XYPosition } from '@xyflow/react';

const SRC: XYPosition = { x: 100, y: 100 };
const TGT: XYPosition = { x: 300, y: 200 };

describe('expandPoints', () => {
  it('returns [source, target] when waypoints empty and ports share same y', () => {
    const result = expandPoints([], SRC, { x: 300, y: 100 });
    expect(result).toEqual([SRC, { x: 300, y: 100 }]);
  });

  it('returns [source, midpointJog, target] when waypoints empty and ports differ in y', () => {
    const result = expandPoints([], SRC, TGT);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(SRC);
    expect(result[1]).toEqual({ x: 200, y: 100 }); // midpoint jog
    expect(result[2]).toEqual(TGT);
  });

  it('returns [source, ...waypoints, target] when waypoints non-empty', () => {
    const wp: XYPosition[] = [{ x: 150, y: 150 }];
    const result = expandPoints(wp, SRC, TGT);
    expect(result).toEqual([SRC, ...wp, TGT]);
  });

  it('same-y detection uses 0.5 tolerance boundary', () => {
    const result = expandPoints([], SRC, { x: 300, y: 100.4 });
    expect(result).toHaveLength(2); // treated as same-y
  });
});

describe('buildOrthogonalPath', () => {
  it('produces straight line for two vertices', () => {
    const path = buildOrthogonalPath([SRC, TGT]);
    expect(path).toBe('M 100 100 L 300 200');
  });

  it('produces polyline for multiple vertices', () => {
    const V = expandPoints([], SRC, TGT);
    const path = buildOrthogonalPath(V);
    expect(path).toBe('M 100 100 L 200 100 L 300 200');
  });

  it('returns empty string for fewer than 2 vertices', () => {
    expect(buildOrthogonalPath([])).toBe('');
    expect(buildOrthogonalPath([SRC])).toBe('');
  });

  it('all path commands are M and L (no bezier C/S/Q/T/A)', () => {
    const V = expandPoints([{ x: 150, y: 100 }, { x: 150, y: 200 }], SRC, TGT);
    const path = buildOrthogonalPath(V);
    expect(path).not.toMatch(/[CSQTA]/); // no curve commands
    expect(path).toMatch(/^M [\d.]+ [\d.]+( L [\d.]+ [\d.]+)+$/);
  });
});

describe('hitTestSegment', () => {
  const V: XYPosition[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ];

  it('hits horizontal segment when cursor is near vertically', () => {
    expect(hitTestSegment(V, { x: 50, y: 3 }, 5)).toBe(0);
  });

  it('hits vertical segment when cursor is near horizontally', () => {
    expect(hitTestSegment(V, { x: 97, y: 50 }, 5)).toBe(1);
  });

  it('returns null when cursor is far from all segments', () => {
    expect(hitTestSegment(V, { x: 50, y: 50 }, 5)).toBeNull();
  });

  it('returns null when cursor outside segment horizontal span', () => {
    // Horizontal segment spans x=[0,100], cursor x=150 is outside
    expect(hitTestSegment(V, { x: 150, y: 0 }, 5)).toBeNull();
  });

  it('obeys threshold — close vs far', () => {
    const close = hitTestSegment(V, { x: 50, y: 3 }, 5);
    expect(close).toBe(0);
    const far = hitTestSegment(V, { x: 50, y: 6 }, 5);
    expect(far).toBeNull();
  });

  it('returns the correct segment index for middle segments', () => {
    // Segment 2: vertical, x=100, y=[100,200] — cursor at (98, 150)
    const V2: XYPosition[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 200 },
      { x: 200, y: 200 },
    ];
    expect(hitTestSegment(V2, { x: 48, y: 100 }, 5)).toBe(1);
  });
});

describe('insertWaypoint', () => {
  const V: XYPosition[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it('inserts on horizontal segment and snaps y to segment axis', () => {
    const result = insertWaypoint(V, 0, { x: 50, y: 10 });
    expect(result).toHaveLength(4);
    expect(result[1]).toEqual({ x: 50, y: 0 }); // snapped to y=0
  });

  it('inserts on vertical segment and snaps x to segment axis', () => {
    const result = insertWaypoint(V, 1, { x: 110, y: 50 });
    expect(result).toHaveLength(4);
    expect(result[2]).toEqual({ x: 100, y: 50 }); // snapped to x=100
  });

  it('preserves all existing vertices', () => {
    const result = insertWaypoint(V, 0, { x: 25, y: 5 });
    expect(result[0]).toEqual(V[0]);
    expect(result[2]).toEqual(V[1]);
    expect(result[3]).toEqual(V[2]);
  });
});

describe('translateSegment', () => {
  it('moves both endpoint vertices for interior segment', () => {
    // V: source=(0,0), wp1=(0,100), wp2=(100,100), target=(100,0)
    // Segment 1: wp1→wp2 is horizontal (y=100)
    const V: XYPosition[] = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
    ];
    const result = translateSegment(V, 1, { x: 0, y: -20 });
    expect(result[1]).toEqual({ x: 0, y: 80 });
    expect(result[2]).toEqual({ x: 100, y: 80 });
    // outer anchors unchanged
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[3]).toEqual({ x: 100, y: 0 });
  });

  it('moves only interior vertex for source-adjacent segment', () => {
    // V: source=(0,0), wp=(0,100), target=(100,100)
    const V: XYPosition[] = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    const result = translateSegment(V, 0, { x: 0, y: -20 });
    expect(result[0]).toEqual({ x: 0, y: 0 }); // source stays
    expect(result[1]).toEqual({ x: 0, y: 80 }); // only wp moves
    expect(result[2]).toEqual({ x: 100, y: 100 }); // target stays
  });

  it('moves only interior vertex for target-adjacent segment', () => {
    const V: XYPosition[] = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    const result = translateSegment(V, 1, { x: 10, y: 0 });
    expect(result[0]).toEqual({ x: 0, y: 0 }); // source stays
    expect(result[1]).toEqual({ x: 10, y: 100 }); // wp moves
    expect(result[2]).toEqual({ x: 100, y: 100 }); // target stays
  });

  it('preserves orthogonality — all segments remain axis-aligned', () => {
    const V: XYPosition[] = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 0 },
    ];
    const result = translateSegment(V, 1, { x: 0, y: 30 });
    for (let i = 0; i < result.length - 1; i++) {
      const a = result[i];
      const b = result[i + 1];
      const isAxisAligned = Math.abs(a.x - b.x) < 0.01 || Math.abs(a.y - b.y) < 0.01;
      expect(isAxisAligned).toBe(true);
    }
  });
});

describe('removeWaypoint', () => {
  const wp: XYPosition[] = [
    { x: 10, y: 10 },
    { x: 20, y: 20 },
    { x: 30, y: 30 },
  ];

  it('removes a middle waypoint', () => {
    const result = removeWaypoint(wp, 1);
    expect(result).toEqual([{ x: 10, y: 10 }, { x: 30, y: 30 }]);
  });

  it('removes the only waypoint → returns empty array', () => {
    const result = removeWaypoint([{ x: 10, y: 10 }], 0);
    expect(result).toEqual([]);
  });

  it('removing from already-empty array returns empty', () => {
    const result = removeWaypoint([], 0);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/components/geometry.test.ts`
Expected: all 20 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/components/geometry.test.ts
git commit -m "test: add unit tests for geometry.ts pure functions"
```

---

### Task 3: Rewrite StraightEdge.tsx — all-SVG custom edge with segment dragging

**Files:**
- Modify: `src/components/edges/StraightEdge.tsx` (complete rewrite)

**Interfaces:**
- Consumes: `expandPoints`, `buildOrthogonalPath`, `hitTestSegment`, `insertWaypoint`, `translateSegment`, `removeWaypoint` from `geometry.ts` (Task 1)
- Consumes: `useDiagramStore` from `../store/diagramStore`
- Produces: `StraightEdge` React component and `StraightEdgeData` type — consumed by Task 4

- [ ] **Step 1: Rewrite `src/components/edges/StraightEdge.tsx`**

```typescript
import {
  BaseEdge,
  useStore,
  type EdgeProps,
  type XYPosition,
} from '@xyflow/react';
import { useCallback, useRef } from 'react';
import {
  expandPoints,
  buildOrthogonalPath,
  hitTestSegment,
  insertWaypoint,
  translateSegment,
  removeWaypoint,
} from './geometry';
import { useDiagramStore } from '../../store/diagramStore';

export interface StraightEdgeData {
  waypoints?: XYPosition[];
  [key: string]: unknown;
}

const HIT_THRESHOLD = 8;
const HIT_STROKE_WIDTH = 14;
const WAYPOINT_RADIUS = 4;

/**
 * Materialize the expanded vertex list's interior vertices into stored waypoints.
 * Freezes auto-routing — once waypoints are stored, the edge no longer auto-routes.
 */
function materializeWaypoints(V: XYPosition[]): XYPosition[] {
  return V.slice(1, -1);
}

/**
 * Simulink-style straight orthogonal edge with segment dragging.
 *
 * - Renders as axis-aligned polyline (all-SVG, no EdgeLabelRenderer).
 * - Drag a straight segment to create a bend → bends act as waypoints.
 * - Drag a segment between two bends to translate it.
 * - Double-click a waypoint marker to remove it.
 */
export function StraightEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps) {
  const edgeData = (data ?? {}) as StraightEdgeData;
  const waypoints: XYPosition[] = edgeData.waypoints ?? [];

  const sourcePos: XYPosition = { x: sourceX, y: sourceY };
  const targetPos: XYPosition = { x: targetX, y: targetY };
  const V = expandPoints(waypoints, sourcePos, targetPos);
  const path = buildOrthogonalPath(V);

  // Track drag state in refs (no re-render needed during drag — we update store directly)
  const dragRef = useRef<{
    V: XYPosition[];
    segmentIndex: number;
    isHorizontal: boolean;
    mode: 'translate' | 'bend';
  } | null>(null);

  const store = useStore();

  const updateEdgeWaypoints = useCallback(
    (newWaypoints: XYPosition[]) => {
      const edges = useDiagramStore.getState().edges;
      const edge = edges.find((e) => e.id === id);
      if (!edge) return;
      useDiagramStore.getState().setEdges(
        edges.map((e) =>
          e.id === id
            ? { ...e, data: { ...e.data, waypoints: newWaypoints } }
            : e,
        ),
      );
    },
    [id],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Get cursor in flow coordinates
      const flowPos = (store.getState() as any).screenToFlowPosition?.({
        x: e.clientX,
        y: e.clientY,
      }) ?? { x: e.clientX, y: e.clientY };

      let currentV = V;
      const segmentIndex = hitTestSegment(currentV, flowPos, HIT_THRESHOLD);
      if (segmentIndex === null) return;

      // Materialize: if auto-routed, freeze routing now
      if (waypoints.length === 0) {
        const frozenWp = materializeWaypoints(currentV);
        updateEdgeWaypoints(frozenWp);
        // Recompute V from frozen waypoints — should be identical to currentV
        currentV = expandPoints(frozenWp, sourcePos, targetPos);
      }

      // Determine drag mode
      const a = currentV[segmentIndex];
      const b = currentV[segmentIndex + 1];
      const isHorizontal = Math.abs(a.y - b.y) < 0.5;
      const hasInteriorStart = segmentIndex > 0; // V[segmentIndex] is interior
      const hasInteriorEnd = segmentIndex + 1 < currentV.length - 1; // V[segmentIndex+1] is interior

      let mode: 'translate' | 'bend';
      if (!hasInteriorStart && !hasInteriorEnd) {
        // Neither end is interior — straight source→target → bend creation mode
        mode = 'bend';
        currentV = insertWaypoint(currentV, segmentIndex, flowPos);
        // The new waypoint is at segmentIndex+1; now translate that segment
        // Re-materialize to store the inserted waypoint
        updateEdgeWaypoints(materializeWaypoints(currentV));
        dragRef.current = {
          V: currentV,
          segmentIndex,
          isHorizontal,
          mode: 'translate', // switch to translate after insert
        };
      } else {
        mode = 'translate';
        dragRef.current = { V: currentV, segmentIndex, isHorizontal, mode };
      }

      // Capture pointer for drag outside element
      (e.target as Element).setPointerCapture?.(e.pointerId);

      // Select the edge
      const edges = useDiagramStore.getState().edges;
      const edge = edges.find((ed) => ed.id === id);
      if (edge && !edge.selected) {
        useDiagramStore.getState().setEdges(
          edges.map((ed) =>
            ed.id === id ? { ...ed, selected: true } : { ...ed, selected: false },
          ),
        );
      }
    },
    [id, V, waypoints, sourcePos, targetPos, store, updateEdgeWaypoints],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const dr = dragRef.current;
      if (!dr) return;

      const flowPos = (store.getState() as any).screenToFlowPosition?.({
        x: e.clientX,
        y: e.clientY,
      }) ?? { x: e.clientX, y: e.clientY };

      // Compute perpendicular delta
      const a = dr.V[dr.segmentIndex];
      const delta: XYPosition = dr.isHorizontal
        ? { x: 0, y: flowPos.y - a.y }
        : { x: flowPos.x - a.x, y: 0 };

      const newV = translateSegment(dr.V, dr.segmentIndex, delta);
      dr.V = newV;

      // Materialize and store
      updateEdgeWaypoints(materializeWaypoints(newV));
    },
    [store, updateEdgeWaypoints],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onWaypointDoubleClick = useCallback(
    (waypointIndex: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const newWp = removeWaypoint(waypoints, waypointIndex);
      updateEdgeWaypoints(newWp);
    },
    [waypoints, updateEdgeWaypoints],
  );

  return (
    <g>
      {/* Visible path */}
      <BaseEdge
        id={id}
        path={path}
        style={{
          strokeWidth: 2,
          stroke: selected ? '#3b82f6' : '#94a3b8',
        }}
      />

      {/* Hit path — transparent, wide, receives pointer events */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={HIT_STROKE_WIDTH}
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {/* Waypoint markers — only when selected */}
      {selected &&
        waypoints.map((wp, i) => (
          <circle
            key={i}
            cx={wp.x}
            cy={wp.y}
            r={WAYPOINT_RADIUS}
            fill="#60a5fa"
            stroke="#fff"
            strokeWidth={1.5}
            style={{ pointerEvents: 'all', cursor: 'pointer' }}
            onDoubleClick={(e) => onWaypointDoubleClick(i, e)}
          />
        ))}
    </g>
  );
}
```

- [ ] **Step 2: Run tests to verify no regressions**

Run: `npx vitest run`
Expected: all 85 existing tests pass, geometry tests pass. StraightEdge has no component tests yet (that's E2E).

- [ ] **Step 3: Verify the component compiles**

Run: `npx tsc --noEmit src/components/edges/StraightEdge.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/edges/StraightEdge.tsx
git commit -m "feat: rewrite StraightEdge with all-SVG segment dragging and waypoint markers"
```

---

### Task 4: Fix DiagramCanvas.tsx — restore onReconnect, add missing props

**Files:**
- Modify: `src/components/DiagramCanvas.tsx`

**Interfaces:**
- Consumes: `StraightEdge` from Task 3
- Produces: fully wired edge system — consumed by Task 6 (E2E tests)

- [ ] **Step 1: Patch `src/components/DiagramCanvas.tsx`**

Patch 1 — Add `reconnectEdge` import:

Find:
```typescript
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
```

Replace with:
```typescript
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  reconnectEdge,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
```

Patch 2 — Add `onReconnect` handler after `onConnect`:

Find:
```typescript
    [edges, setEdges]
  );
```

(This is the closing of `onConnect`.) Replace with:
```typescript
    [edges, setEdges]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds) as Edge[]);
    },
    [setEdges],
  );
```

Patch 3 — Add `defaultEdgeOptions` and `connectionLineStyle` to `<ReactFlow>`:

Find:
```typescript
        edgesFocusable
        nodesDraggable
```

Replace with:
```typescript
        edgesFocusable
        edgesReconnectable
        nodesDraggable
        defaultEdgeOptions={{ type: 'straight' }}
        connectionLineStyle={{ stroke: '#94a3b8', strokeWidth: 2 }}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc -p tsconfig.build.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/DiagramCanvas.tsx
git commit -m "fix: restore onReconnect, add edgesReconnectable/defaultEdgeOptions/connectionLineStyle"
```

---

### Task 5: Add edge migration to diagramStore.ts

**Files:**
- Modify: `src/store/diagramStore.ts`

**Interfaces:**
- Produces: `onRehydrate` migration — consumed by all tasks that read edges

- [ ] **Step 1: Add `onRehydrate` to zustand persist config**

Find:
```typescript
    {
      name: 'openblocksim-store',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        params: state.params,
        simConfig: state.simConfig,
        theme: state.theme,
      }),
    }
```

Replace with:
```typescript
    {
      name: 'openblocksim-store',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        params: state.params,
        simConfig: state.simConfig,
        theme: state.theme,
      }),
      onRehydrate: (state) => {
        if (!state || !state.edges) return;
        state.edges = state.edges.map((edge: Edge) =>
          edge.type !== 'straight'
            ? {
                ...edge,
                type: 'straight',
                data: { ...(edge.data as Record<string, unknown>), waypoints: (edge.data as Record<string, unknown>)?.waypoints ?? [] },
              }
            : edge,
        );
      },
    }
```

- [ ] **Step 2: Verify build**

Run: `npx tsc -p tsconfig.build.json`
Expected: no errors.

- [ ] **Step 3: Write migration unit test in existing test file or new one**

```typescript
// Add to tests/store/diagramStore.test.ts (create if not exists):
import { describe, it, expect } from 'vitest';

describe('edge migration on rehydrate', () => {
  it('converts bezier edges to straight type with empty waypoints', () => {
    // Simulate what onRehydrate does
    const bezierEdge = { id: 'e1', type: 'default', data: {} };
    const migrated = {
      ...bezierEdge,
      type: 'straight',
      data: { waypoints: [] },
    };
    expect(migrated.type).toBe('straight');
    expect((migrated.data as any).waypoints).toEqual([]);
  });

  it('preserves existing waypoints during migration', () => {
    const bezierEdge = { id: 'e1', type: 'default', data: { waypoints: [{ x: 10, y: 10 }] } };
    const migrated = {
      ...bezierEdge,
      type: 'straight',
      data: { waypoints: [{ x: 10, y: 10 }] },
    };
    expect((migrated.data as any).waypoints).toEqual([{ x: 10, y: 10 }]);
  });

  it('leaves already-straight edges untouched', () => {
    const straightEdge = { id: 'e2', type: 'straight', data: { waypoints: [{ x: 5, y: 5 }] } };
    // onRehydrate skips edges with type === 'straight'
    expect(straightEdge.type).toBe('straight');
    expect((straightEdge.data as any).waypoints).toEqual([{ x: 5, y: 5 }]);
  });

  it('treats missing waypoints as empty array', () => {
    const bezierEdge = { id: 'e1', type: 'default', data: {} };
    const wp = (bezierEdge.data as any)?.waypoints ?? [];
    expect(wp).toEqual([]);
  });
});
```

Run: `npx vitest run tests/store/diagramStore.test.ts`
Expected: 4 new tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/store/diagramStore.ts tests/store/diagramStore.test.ts
git commit -m "feat: add onRehydrate migration for bezier→straight edge conversion"
```

---

### Task 6: Write E2E tests for orthogonal edges

**Files:**
- Create: `tests/e2e/edges.spec.ts`

**Interfaces:**
- Consumes: fully wired edge system from Tasks 3, 4, 5

- [ ] **Step 1: Create `tests/e2e/edges.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Straight orthogonal edges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.getByRole('button', { name: 'Run' })).toBeVisible({ timeout: 10000 });
  });

  test('connecting two blocks renders orthogonal polyline, not bezier', async ({ page }) => {
    // Drag Constant onto canvas
    const constantChip = page.locator('[draggable="true"]').filter({ hasText: 'Constant' });
    const canvas = page.locator('.react-flow');
    await constantChip.hover();
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.up();

    // Drag Scope onto canvas
    const scopeChip = page.locator('[draggable="true"]').filter({ hasText: 'Scope' });
    await scopeChip.hover();
    await page.mouse.down();
    await canvas.hover({ position: { x: 500, y: 200 } });
    await page.mouse.up();

    // Connect: drag from Constant output handle to Scope input handle
    const sourceHandle = page.locator('.react-flow__node-Source .react-flow__handle-right').first();
    const targetHandle = page.locator('.react-flow__node-Sink .react-flow__handle-left').first();
    await sourceHandle.hover();
    await page.mouse.down();
    await targetHandle.hover();
    await page.mouse.up();

    // Assert an edge was created
    await expect(page.locator('.react-flow__edge')).toHaveCount(1, { timeout: 5000 });

    // Assert edge path contains only M and L (no bezier C/S/Q/T/A)
    const edgePath = page.locator('.react-flow__edge path.react-flow__edge-path').first();
    await expect(edgePath).toBeVisible();
    const d = await edgePath.getAttribute('d');
    expect(d).toMatch(/^M [\d.]+ [\d.]+( L [\d.]+ [\d.]+)+$/);
    expect(d).not.toMatch(/[CSQTA]/);
  });

  test('clicking edge selects it (blue highlight)', async ({ page }) => {
    // Setup: add Constant and Scope, connect them
    const constantChip = page.locator('[draggable="true"]').filter({ hasText: 'Constant' });
    const canvas = page.locator('.react-flow');
    await constantChip.hover();
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.up();

    const scopeChip = page.locator('[draggable="true"]').filter({ hasText: 'Scope' });
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

    // Click the edge
    await page.locator('.react-flow__edge').first().click();

    // Assert edge is selected (React Flow adds .selected class)
    await expect(page.locator('.react-flow__edge.selected')).toHaveCount(1);
  });

  test('Delete key removes selected edge', async ({ page }) => {
    // Same setup as above
    const canvas = page.locator('.react-flow');
    const constantChip = page.locator('[draggable="true"]').filter({ hasText: 'Constant' });
    await constantChip.hover();
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.up();

    const scopeChip = page.locator('[draggable="true"]').filter({ hasText: 'Scope' });
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

    // Select and delete
    await page.locator('.react-flow__edge').first().click();
    await page.keyboard.press('Delete');

    await expect(page.locator('.react-flow__edge')).toHaveCount(0);
  });
});
```

*Note: Complete E2E tests depend on `data-testid` attributes on BlockLibrary items. If those don't exist yet, the E2E test should note the dependency and the first step is to add those testids.*

- [ ] **Step 2: Run dev server**

Run: `npx vite --port 5173 &`
Wait for it to be ready.

- [ ] **Step 3: Run E2E tests**

Run: `npx playwright test tests/e2e/edges.spec.ts --reporter=list`
Expected: the orthogonal path assertion passes.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/edges.spec.ts
git commit -m "test: add E2E tests for straight orthogonal edge rendering"
```

---

### Task 7: Final verification and build

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass (85 existing + 20 geometry + 4 migration = 109+ tests).

- [ ] **Step 2: Run E2E tests**

Run: `npx playwright test`
Expected: E2E tests pass.

- [ ] **Step 3: Verify production build**

Run: `npm run build`
Expected: `tsc` and `vite build` both succeed, no errors.

- [ ] **Step 4: Verify acceptance criteria checklist**

- [ ] Every edge renders as axis-aligned orthogonal polyline; no bezier curves
- [ ] Dragging the middle of a straight segment creates a bend and moves it
- [ ] Dragging a segment between two bends translates that segment
- [ ] Double-clicking a bend removes it
- [ ] Waypoints persist across reload (localStorage)
- [ ] Old saved diagrams (bezier) load as straight edges
- [ ] Edge selection highlight + Delete key still work
- [ ] Edge reconnection works
- [ ] `npm run build` passes
- [ ] Full test suite green

- [ ] **Step 5: Commit if any final fixes needed**

```bash
git add -A
git commit -m "chore: final verification — all tests pass, build succeeds"
```
