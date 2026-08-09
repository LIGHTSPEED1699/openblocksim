# Design Spec: Simulink-Style Orthogonal Edges with Segment Dragging

**Date:** 2026-08-09
**Project:** OpenBlockSim (openblocksim, sim.hongbinli.ca)
**Status:** Approved (design review 2026-08-09)

## 1. Problem Statement

Edge connections currently render as bezier curves (`type: 'default'` in React Flow). Users cannot reshape or route lines the way they want. The desired behavior is Simulink-style: edges are straight orthogonal (Manhattan) polylines, and individual line segments can be grabbed and dragged to adjust routing.

A half-finished `StraightEdge.tsx` exists in the working tree (uncommitted) with a handle-based interaction model. It does not compile (TS errors: missing `onReconnect`, `useStore()` called without selector, unused vars) and its interaction model (small circular waypoint handles) does not match the requested Simulink behavior. It also deleted the `onReconnect` handler, breaking edge reconnection. This spec supersedes that work.

## 2. Goals

- All edges render as straight orthogonal (horizontal/vertical, 90° bends) polylines — never bezier curves.
- Simulink-style line editing:
  - Drag the middle of a straight segment → creates a bend point at the cursor and moves it.
  - Drag a segment between two existing bends → moves that whole segment, keeping adjacent bends anchored.
  - Double-click a bend point → removes it, straightening the corner.
  - Segments stay axis-aligned while dragging.
- Waypoints persist (localStorage via existing zustand persist) and survive JSON export/import.
- Edge selection (click to select, blue highlight, Delete key) keeps working.
- Edge reconnection is restored.
- Old persisted diagrams (bezier edges) migrate automatically to straight edges.

## 3. Non-Goals (v2 candidates)

- Obstacle-aware auto-routing around blocks (Simulink does this; large feature, out of scope).
- Direct corner-point dragging (segment dragging already moves bends; can add later).
- Orthogonal routing that avoids overlapping other edges/nodes.

## 4. Data Model

### 4.1 Waypoints

Each edge carries `edge.data.waypoints: XYPosition[]`.

**Assumption:** all ports are positioned Left or Right (source on the right side of its node, target on the left). Top/Bottom port support is out of scope for v1.

- **Empty array (`[]`)** = auto-routing. The renderer computes a default orthogonal path:
  - Ports share the same y → single straight horizontal line.
  - Ports differ in y → 3-segment orthogonal jog: horizontal out of source, vertical at the x-midpoint, horizontal into target.
  - Auto-routing recomputes live when nodes move (no waypoints stored), so default lines stay connected.
- **Non-empty** = user-fixed routing. The polyline passes through waypoints in order. Once a user drags a segment, waypoints materialize and the routing freezes — waypoints are stored as absolute coordinates (they no longer follow node movement). Note: this differs from Simulink, where manually routed lines still adjust when blocks move. v1 chooses simpler absolute waypoints; relative/adaptive routing can be added later.

### 4.2 Migration

On store rehydration (`onRehydrate` in zustand persist), any edge with `type !== 'straight'` is converted:

```
{ ...edge, type: 'straight', data: { ...edge.data, waypoints: edge.data?.waypoints ?? [] } }
```

This handles old bezier diagrams saved before this feature. New edges are created with `type: 'straight', data: { waypoints: [] }` in `onConnect`.

## 5. Architecture

### 5.1 Files

| File | Purpose |
|---|---|
| `src/components/edges/geometry.ts` (new) | Pure geometry functions: path building, hit testing, waypoint insert/translate/remove. No React, no DOM. Unit-testable. |
| `src/components/edges/StraightEdge.tsx` (rewrite) | React Flow custom edge. Renders SVG paths + waypoint markers, wires pointer interactions to geometry functions. |
| `src/components/DiagramCanvas.tsx` (edit) | Keep `type: 'straight'` + `edgeTypes` wiring. Restore `onReconnect`. Ensure `edgesFocusable` + `edgesReconnectable` props. |

### 5.2 Rendering (all SVG inside the edge `<g>`)

React Flow renders custom edges inside an SVG `<g>` already positioned in flow coordinates. All elements render inside this group — no `EdgeLabelRenderer` needed:

1. **Visible path** — `<path>` with `strokeWidth={2}`, stroke `#94a3b8` (slate) normally, `#3b82f6` (blue) when selected.
2. **Hit path** — transparent `<path>` with `strokeWidth={14}`, `fill="none"`, `pointerEvents="stroke"`, `cursor="pointer"`. Receives pointer events for segment grabbing.
3. **Waypoint markers** — small `<circle>` (`r={4}`) at each waypoint, rendered only when the edge is selected, with `pointerEvents="all"`. Markers render **above** the hit path (later in DOM order) so double-click reaches them. Their only interaction is double-click to remove; pointerdown on a marker is a no-op (a drag starting on a marker does nothing — acceptable, Simulink corner-drag is out of scope).

**Vertex expansion:** the rendered polyline vertices are `expandPoints(waypoints, sourcePos, targetPos)` — the full vertex list `[source, ...waypoints, target]` plus any implicit midpoint-jog vertices when waypoints are empty.

### 5.3 Geometry functions (`geometry.ts`)

All functions take/return the **expanded vertex list** (`V = [source, ...waypoints, target, ...implicitJog]`). The component materializes waypoints from the expanded list when a drag begins on an auto-routed edge, so the stored `waypoints` always round-trips exactly to the rendered geometry.

```
expandPoints(waypoints: XYPosition[], sourcePos: XYPosition, targetPos: XYPosition): XYPosition[]
  - waypoints = the edge's stored waypoints (edge.data.waypoints). Source/target port coordinates are passed separately.
  - Internally constructs V = [sourcePos, ...waypoints, targetPos].
  - Returns the full rendered vertex list.
  - waypoints non-empty → just [sourcePos, ...waypoints, targetPos] (each consecutive pair is already axis-aligned).
  - waypoints empty, same y → [sourcePos, targetPos].
  - waypoints empty, different y → [sourcePos, midpointJog, targetPos] where midpointJog = ((sx+tx)/2, sy) —
    horizontal out of source, vertical at midpoint, horizontal into target.

buildOrthogonalPath(V: XYPosition[]): string
  - Produces SVG path: straight axis-aligned segments through consecutive vertices.

hitTestSegment(V: XYPosition[], cursor: XYPosition, threshold: number): number | null
  - Returns the index of the segment (between V[i] and V[i+1]) near the cursor.
  - Segments are axis-aligned; checks point-to-segment distance ≤ threshold.

insertWaypoint(V: XYPosition[], segmentIndex: number, pos: XYPosition): XYPosition[]
  - Inserts pos between V[segmentIndex] and V[segmentIndex+1] (as a waypoint).
  - Orthogonalizes: snap pos to the segment axis (horizontal segment → cursor x, keep y; vertical → cursor y, keep x).

translateSegment(V: XYPosition[], segmentIndex: number, delta: XYPosition): XYPosition[]
  - Moves the segment perpendicular to its axis by the drag delta.
  - Segment between two vertices (both are waypoints or jog vertices): both endpoint vertices move by delta; outer anchors stay.
  - Segment with a vertex on only one end (adjacent to source/target): that interior vertex moves by delta.
  - Jog vertices participate exactly like waypoints; after a drag the expanded list is materialized back into waypoints.

removeWaypoint(waypoints: XYPosition[], waypointIndex: number): XYPosition[]
  - Removes the waypoint; remaining waypoints reconnect straight between neighbors.
  - Removing the last waypoint → falls back to auto-routing ([]).
```

**Orthogonality invariant:** all functions operate on axis-aligned segments and produce axis-aligned segments.

### 5.4 Interaction flow (StraightEdge.tsx)

Pointer events on the **hit path**:

1. `onPointerDown` on a segment:
   - Compute segment index via `hitTestSegment` on the expanded vertex list `V`.
   - Capture pointer (setPointerCapture on the SVG element) so drags outside the element keep working.
   - Select the edge (so it highlights during drag).
   - **Do not materialize waypoints yet** — a click without movement must not freeze auto-routing (see §7).
2. `onPointerMove` — first move with delta > 0:
   - **Materialize:** if the edge currently has empty waypoints (auto-routed), convert `V` (minus source/target) into stored waypoints now. This freezes routing the first time the user actually drags a line.
   - Determine the drag mode:
     - If the grabbed segment has at least one interior vertex (waypoint or jog vertex, not source/target) at either end → **segment translation mode**. Record the segment's perpendicular axis and the starting vertex positions.
     - If neither end has an interior vertex (straight auto-routed segment, source→target directly) → **bend creation mode**. Insert a waypoint at the **pointerdown grab position** (orthogonalized to the segment axis — not the current moved cursor), then immediately enter translation mode on the newly created bend.
3. `onPointerMove` (continuing):
   - Translation mode: compute perpendicular delta from the drag start, call `translateSegment`, update `edge.data.waypoints` via `setEdges` (zustand) — preserving `selected` state.
   - Constrain delta to the segment's perpendicular axis only (horizontal segments move vertically, vertical segments move horizontally) so segments never tilt.
4. `onPointerUp` / `onPointerCancel`:
   - Release pointer capture, end drag.
5. `onDoubleClick` on a waypoint marker: `removeWaypoint` + update store.
6. Click on edge (no drag) → select edge. React Flow handles selection via `edgesFocusable`. The hit path's `pointerEvents="stroke"` forwards click events to React Flow's built-in selection handling.

### 5.5 Store updates during drag

- Drag updates flow: pointer event → geometry function → `useDiagramStore.getState().setEdges(...)` with the modified edge object.
- When replacing the edge object, carry over `selected` from the current edge state so selection doesn't flicker.
- Performance: updates happen per pointermove; fine for typical diagram sizes. No throttle needed in v1 (React Flow + zustand handle this at 60Hz for small graphs).

## 6. Integration Points

### 6.1 DiagramCanvas.tsx

- `onConnect`: `{ ...connection, id: ..., type: 'straight', data: { waypoints: [] } }` (already in working tree — keep).
- `edgeTypes = { straight: StraightEdge }` (already in working tree — keep).
- Restore `onReconnect` handler (deleted in uncommitted work): updates edge source/target/handles on reconnect.
- Props: `edgesFocusable` (keep), `edgesReconnectable` (add/verify), `deleteKeyCode` (keep).
- `onEdgesChange` already wired to `applyEdgeChanges` — handles selection changes and merges changes into existing edge objects, so `waypoints` data is preserved across selection updates.

### 6.2 Store (diagramStore.ts)

- Add `onRehydrate` migration for edge type → `straight`.
- No other changes: `edges` already persisted via `partialize`.

### 6.3 Export/Import

- Waypoints live in `edge.data`, which is already serialized by the existing JSON export/import utilities. No changes needed (verify with a test).

### 6.4 ConnectionLine

- While the user drags a new connection, React Flow renders a `ConnectionLine`. Set `connectionLineStyle` to render a straight line (not bezier) to match the final edge appearance. Alternatively, provide a custom `ConnectionLineComponent` if styling alone is insufficient.

### 6.5 ReactFlow default edge options

- Set `<ReactFlow defaultEdgeOptions={{ type: 'straight' }}>` so all newly created edges default to `type: 'straight'`. The `onConnect` handler also explicitly sets `type: 'straight'` as a belt-and-suspenders measure.

## 7. Error Handling & Edge Cases

| Case | Behavior |
|---|---|
| Pointer down and up with no drag movement (click on edge) | No-op for interaction. Edge selection is handled by React Flow via built-in click handling (no waypoints materialized). Defer materialization to the first `onPointerMove` with delta > 0. |
| Drag segment that would move a waypoint past its neighbor | Allow it — polyline may fold back on itself; Simulink does the same. No clamping in v1. |
| Double-click with no waypoints | No-op (no markers rendered). |
| Old bezier edges from localStorage | Migrated to `straight` on rehydrate. |
| Edge with `waypoints` missing (corrupt data) | Treated as `[]` via `?? []`. |
| Node deleted | Existing `removeNode` already removes connected edges. Waypoints die with the edge. |
| Reconnect edge | `onReconnect` preserves `data.waypoints` (keeps routing when reattaching). |
| Export → import round trip | Waypoints survive (JSON serialization of `edge.data`). |

## 8. Testing

### 8.1 Unit tests — `tests/components/geometry.test.ts` (new)

Pure function tests, no DOM:

1. `buildOrthogonalPath`:
   - Same-y ports → single straight line.
   - Different-y ports, no waypoints → midpoint jog (H-V-H, 3 segments).
   - With waypoints → polyline through waypoints, all segments axis-aligned.
2. `hitTestSegment`:
   - Cursor on horizontal segment → correct index.
   - Cursor on vertical segment → correct index.
   - Cursor far from all segments → null.
   - Threshold boundary behavior.
3. `insertWaypoint`:
   - Inserts at cursor position, orthogonalized to segment axis.
   - Segment index bounds.
4. `translateSegment`:
   - Horizontal segment dragged vertically → both endpoint waypoints move by dy.
   - Vertical segment dragged horizontally → endpoint waypoints move by dx.
   - Segment adjacent to source (one waypoint) → only that waypoint moves.
   - Orthogonality invariant: all resulting segments axis-aligned.
5. `removeWaypoint`:
   - Middle waypoint removed → neighbors connect straight.
   - Only waypoint removed → falls back to auto-routing ([]).

### 8.2 E2E — `tests/e2e/edges.spec.ts` (new)

Playwright, against the running dev server:

1. Add two blocks (e.g. Constant → Scope), connect them via handle drag.
2. Assert edge path is a polyline (`<path>` with `M ... L ...`), no `C` bezier commands.
3. Drag the middle of the edge → assert a waypoint marker appears and path now has a bend.
4. Drag the segment between two bends → assert the segment translates.
5. Double-click the bend → assert it's removed.
6. Reload page → assert waypoints persisted (localStorage).

### 8.3 Existing tests

- All 85 existing tests must stay green.
- Existing E2E `basic-flow.spec.ts` unaffected.

## 9. Acceptance Criteria

1. Every edge renders as an axis-aligned orthogonal polyline; no bezier curves anywhere.
2. Dragging the middle of a straight segment creates a bend and moves it.
3. Dragging a segment between two bends translates that segment; adjacent bends stay anchored.
4. Double-clicking a bend removes it.
5. Waypoints persist across reload and JSON export/import round trips.
6. Old saved diagrams (bezier) load as straight edges.
7. Edge selection highlight + Delete key still work.
8. Edge reconnection works.
9. `npm run build` passes (currently fails — this is a hard gate).
10. Full test suite green: unit + component + E2E.

## 10. Open Questions / Decisions Recorded

| Question | Decision |
|---|---|
| Orthogonal (Manhattan) vs straight diagonal? | Orthogonal (user chose A) |
| Handle circles or Simulink segment dragging? | Simulink segment dragging (user confirmed) |
| Custom edge (Approach 1) vs overlay vs built-in? | Approach 1 — all-SVG custom edge (user approved) |
| Auto-routing when no waypoints? | Straight if aligned, midpoint jog otherwise; recomputes on node move |
| Obstacle avoidance? | Out of scope (v2) |
| Direct corner dragging? | Out of scope (v2); segment drag moves bends |
