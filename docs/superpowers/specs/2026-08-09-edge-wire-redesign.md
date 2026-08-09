# Design Spec: Edge Wire Redesign — Feedback Routing, Click-to-Plant Wire Tool, Signal Arrows

**Date:** 2026-08-09
**Project:** OpenBlockSim (openblocksim, sim.hongbinli.ca)
**Status:** Approved (design review 2026-08-09, approach A)

## 1. Problem Statement

Two usability gaps in the current edge wiring (built on the segment-dragging foundation from `2026-08-09-straight-edge-segments-design.md`, which is shipped and working):

1. **Feedback wires are unusable in real control diagrams.** A feedback wire from a plant/process transfer function output back to the error summer's `−` input renders as a straight line (or a midpoint jog) that cuts straight through the feedforward chain (controller, plant blocks) stacked between the two ports. In Simulink, this wire routes *downward* around the whole feedforward chain. There is no way to shape it: the connection preview is a straight line from handle to cursor, the user cannot plant a bend mid-drag, and click-dragging an existing straight wire does not reliably create a bend (hit-testing is in flow units so it breaks when zoomed, and waypoint handles only appear when the edge is already selected).

2. **Wire direction is not readable.** Wires have no arrowheads, so feedback vs feedforward direction is ambiguous at a glance — exactly wrong for a control-systems tool where loop direction matters.

## 2. Goals

- **Auto-route feedback edges** with a downward U-shaped path at connection time: out of the source's right port, down below both blocks, across, up into the target's left port. Manual bends simply overwrite the auto-routed waypoints — no conflict.
- **Simulink-style click-to-plant wire tool:** while drawing a new connection, each click on empty canvas plants a vertex; the preview wire routes orthogonally through planted vertices; clicking a target port completes and the planted vertices become the edge's waypoints. Escape or double-click on empty canvas cancels. (Note: "release on empty canvas cancels" is impossible in a click model — a click is press+release, so release cannot cancel or planting would never work. The correct Simulink semantics: planted vertices persist, cancellation is an explicit gesture.)
- **Reliable bend-drag on existing wires:** click a straight wire and drag → a bend vertex is created at the click point and follows the cursor. Hit-testing in screen space (zoom-independent). Waypoint handles visible on hover/select; drag a handle to move that vertex; double-click deletes it.
- **Signal-flow arrows:** small arrowhead at the end of every edge (marker-end), color-matched to the stroke; arrow also shown on the in-progress connection preview.
- **Waypoint persistence:** bends survive JSON export → import round trips (currently `edge.data` is dropped entirely by `exportImport.ts`).
- All existing tests stay green; new pure-function geometry is unit-tested; new interactions covered by component + Playwright e2e tests.

## 3. Non-Goals (v2 candidates)

- Obstacle-aware auto-routing that avoids *arbitrary* blocks (only the feedback U-route heuristic in scope; Simulink-grade full routing is a large feature).
- Re-routing existing edges when nodes move. Auto-route fires **once at connection time**; afterwards waypoints are absolute coordinates and follow nothing (same as current shipped behavior).
- Top/Bottom port support (all ports remain Left/Right).
- Bezier edges, edge labels, or multi-arrow mid-wire markers.

## 4. Design Decisions Recorded

| Question | Decision |
|---|---|
| Auto-route, manual, or both? | Both — auto-route backward edges at connect, manual tool overrides (user chose C) |
| Arrow placement | Target-end arrowhead on every edge; preview arrow while dragging (user chose A) |
| Planting interaction | Simulink-style click-to-plant; Escape/double-click cancels (user, Q3; the "release cancels" wording in Q3 was internally contradictory with click-to-plant and was corrected in spec self-review) |
| Approach | Store-driven waypoints + custom connection line (approach A, user approved) |
| Bend-drag on existing wire | Fix + polish shipped StraightEdge; screen-space hit threshold, hover/select handles, vertex dragging |

## 5. Data Model

### 5.1 Waypoints (unchanged shape, new semantics)

`edge.data.waypoints: XYPosition[]` as in the shipped straight-edge spec:

- **`[]`** = auto-routed: renderer computes default path (straight if same y, midpoint jog otherwise).
- **Non-empty** = fixed routing through waypoints in order (absolute coordinates).

**New:** at creation time, the completion path may seed `waypoints` with the feedback U-route (see §6.4b). Once seeded, the edge behaves exactly like a manually routed edge. Nothing in the rendering path distinguishes auto-routed-from-heuristic vs user-bent — same data, same code path.

### 5.2 Edge shape

Unchanged from shipped work: `{ id, source, target, sourceHandle, targetHandle, type: 'straight', data: { waypoints } }`.

## 6. Architecture

### 6.1 Files

| File | Action | Responsibility |
|---|---|---|
| `src/components/edges/geometry.ts` | Modify | Add `isBackwardEdge`, `computeFeedbackRoute`, `nodePortPosition`. Keep existing functions untouched (API-compatible additions only). |
| `src/components/edges/wireGesture.ts` | Create | Tiny external observable store (plain object + `subscribe`/`get`/`set` — no zustand, not persisted) holding `WireGestureState`. Owns plant/move/complete/cancel state transitions. |
| `src/components/WireOverlay.tsx` | Create | Transparent full-pane overlay mounted while a wire is in progress. Steals pointer capture, handles plant/move/complete/cancel pointer events, calls `wireGesture` + edge creation. |
| `src/components/ConnectionPreview.tsx` | Create | Custom React Flow `connectionLineComponent`. Reads `wireGesture` via `useSyncExternalStore`. Renders straight line + arrow with no vertices; orthogonal polyline + arrow through planted vertices. |
| `src/components/DiagramCanvas.tsx` | Modify | Mount `WireOverlay` on `onConnectStart`, unmount on completion/cancel, pass `ConnectionPreview` as `connectionLineComponent`, supply `screenToFlowPosition`/`setEdges`/`addEdge`/`getNode` to the overlay's completion path. |
| `src/components/edges/StraightEdge.tsx` | Modify | Screen-space hit testing, arrowhead (`markerEnd`), waypoint handles on hover/select, handle dragging, robust materialize-on-drag. |
| `src/utils/exportImport.ts` | Modify | Serialize/restore `waypoints` per edge. |
| `tests/components/geometry.test.ts` | Modify | New tests for the three new functions. |
| `tests/components/wireGesture.test.ts` | Create | Plant/move/complete/cancel state transitions. |
| `tests/components/ConnectionPreview.test.tsx` | Create | Component tests (inactive, straight, orthogonal-through-vertices, arrow present). |
| `tests/components/StraightEdge.test.tsx` | Modify | Marker present, hover/select handles, pointer-down creates waypoint. |
| `tests/components/DiagramCanvas.test.tsx` | Modify | Drive mocked `ReactFlow`'s `onConnectStart` + overlay handlers; assert waypoint seeding in completion path. |
| `tests/utils/exportImport.test.ts` | Modify | Waypoint round-trip. |
| `tests/e2e/edges.spec.ts` | Modify | Feedback bend, drag-to-bend, vertex delete, planted-click wire, arrow visible. |

No changes to: store schema, node components, block registry, engine. No new dependencies (arrowhead uses React Flow's built-in `MarkerType`).

### 6.2 New geometry functions (`geometry.ts`)

All pure, no React/DOM, unit-testable:

```
isBackwardEdge(sourceNode: { position: {x,y} }, targetNode: { position: {x,y} }): boolean
  - true iff sourceNode.position.x > targetNode.position.x
  - Rationale: in a feedback loop the plant sits to the right of the summer;
    any edge flowing right-to-left is feedback.

nodePortPosition(node, portIndex, isSource): XYPosition
  - Returns the flow-coordinate position of port `portIndex` on the node.
  - x = isSource ? node.position.x + width : node.position.x   (right edge / left edge)
  - y = node.position.y + ((portIndex + 1) / (inputs + 1)) * height
  - width/height come from React Flow's measured node dims; fallback height = 40,
    width = 100 when measured is unavailable (matches BaseNode min sizes).
  - Same topPct formula BaseNode uses for handle placement.

computeFeedbackRoute(
  sourcePort: XYPosition, targetPort: XYPosition,
  sourceBottom: number, targetBottom: number, clearance = 60
): XYPosition[]
  - Builds the downward U-shape:
      [{ x: sourcePort.x + clearance, y: sourcePort.y },        // horizontal out of source
       { x: sourcePort.x + clearance, y: bottomY },             // down
       { x: targetPort.x - clearance, y: bottomY },             // across below blocks
       { x: targetPort.x - clearance, y: targetPort.y },        // up
       { x: targetPort.x, y: targetPort.y }]                    // horizontal into target
  - bottomY = max(sourceBottom, targetBottom) + clearance
  - sourceBottom = sourceNode.position.y + measuredHeight (fallback 40)
  - Returns exactly the stored waypoints (edge.data.waypoints) — NOT the expanded
    vertex list; expandPoints handles expansion at render time.
```

All existing geometry functions (`expandPoints`, `buildOrthogonalPath`, `hitTestSegment`, `insertWaypoint`, `translateSegment`, `removeWaypoint`) stay as-is — the new functions compose with them (`computeFeedbackRoute` output flows into the existing waypoint pipeline unchanged).

### 6.3 wireGesture.ts — external observable store

A tiny external store (plain module — not zustand, not persisted) so the preview and the overlay can share live gesture state without React Flow re-render coupling:

```
// wireGesture.ts
type Listener = () => void;
let state: WireGestureState = { active: false, source: null, planted: [], cursor: null, pointerId: null };
const listeners = new Set<Listener>();

export const wireGesture = {
  get: () => state,
  set: (patch: Partial<WireGestureState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); },
  subscribe: (l: Listener) => { listeners.add(l); return () => listeners.delete(l); },
  reset: () => wireGesture.set({ active: false, source: null, planted: [], cursor: null, pointerId: null }),
};

export interface WireGestureState {
  active: boolean;
  source: { nodeId: string; handleId: string } | null;
  planted: XYPosition[];          // flow coords, planted by clicks
  cursor: XYPosition | null;      // flow coords, live during drag
  pointerId: number | null;
}
```

`ConnectionPreview` reads it with `useSyncExternalStore(wireGesture.subscribe, wireGesture.get)`; the overlay writes it from pointer handlers. This avoids ref-mutation-without-re-render (a plain ref read by the preview would never update the DOM — the store subscription is what drives re-renders).

### 6.4 ConnectionPreview.tsx

Custom `connectionLineComponent` — driven entirely by `wireGesture`, not React Flow's transient connection props. React Flow's native connection lifecycle (hold-drag, cancel-on-pane-release, pointer capture on the handle) is incompatible with Simulink-style click-to-plant: a click that plants a vertex would also end the connection (mouseup on pane = cancel), and pointer capture retargets pane events to the source handle so `onPaneClick` never fires mid-drag. Therefore: DiagramCanvas mounts its own overlay (below), and our component renders the preview from gesture state.

- **Inputs:** `wireGesture` via `useSyncExternalStore`. Renders nothing when `!state.active`.
- **Rendering:** SVG `<g>`:
  - No planted vertices → straight `<path>` from source port to cursor, stroke `#94a3b8`, width 2.
  - Planted vertices → `expandPoints(planted, sourcePort, cursor)` + `buildOrthogonalPath`, same stroke.
  - Arrow: inline `<defs><marker id="conn-preview-arrow">` with a filled triangle; `<path markerEnd="url(#conn-preview-arrow)">`. Arrow color `#94a3b8`.
  - `fill="none"`, `pointerEvents="none"` (the gesture overlay handles all interaction).
  - Source port position comes from `nodePortPosition(sourceNode, srcPortIndex, true)` using the node from `useReactFlow().getNode(state.source.nodeId)`.

### 6.4a WireOverlay + WireGestureManager — custom connection gesture layer

The overlay component + DiagramCanvas wiring owns the wire-drawing interaction end to end. It replaces React Flow's native connection UX; React Flow still renders handles and stores the final edge, but every gesture event flows through us.

**Gesture flow (click-based, Simulink semantics):**

1. **Start** — `onConnectStart` fires from React Flow's handle drag (user pressed a source handle). DiagramCanvas records `source` (`nodeId`/`handleId` from React Flow's params), calls `wireGesture.set({ active: true, source })`, and mounts `<WireOverlay />`. The overlay's `onPointerDown` calls `overlay.setPointerCapture(e.pointerId)` — the last `setPointerCapture` call wins, so this redirects all subsequent pointer events to our overlay.
2. **Move** — overlay `onPointerMove`: `wireGesture.set({ cursor: screenToFlowPosition(e) })`; preview re-renders via the store subscription.
3. **Plant** — overlay `onPointerDown` (a fresh press while the wire is in progress): `planted.push(screenToFlowPosition(e))`. The wire **stays in-progress** after this press+release — planting is click-based, not hold-based (see §2).
4. **Complete** — overlay `onPointerUp` where `document.elementFromPoint(e.clientX, e.clientY)` hits a target `Handle`: resolve node/handle ids from the element's `data-nodeid` / `data-handleid` attributes (React Flow sets both on handle elements), build `connection = { source, target, sourceHandle, targetHandle }`, create the edge via `setEdges(addEdge({ ...connection, id, type: 'straight', data: { waypoints } }, edges))` where `waypoints = planted.length > 0 ? planted : feedbackHeuristic(...)` (see §6.4b), then `wireGesture.reset()`.
5. **Cancel** — `Escape` keydown (window listener while `active`) or overlay `onDoubleClick` (double-click on empty canvas): discard `planted`, `wireGesture.reset()`.
6. **Teardown safety net** — `onConnectEnd` (React Flow, fires on its own pointerup) is treated as a no-op if we already completed or cancelled; if it fires while `active` with no completion (React Flow's internal state cleared the gesture), `wireGesture.reset()` to avoid a stuck overlay.

React Flow's own connection state also runs during the gesture (we can't suppress it cleanly without disabling connectability). It is harmless: its line is replaced by our `connectionLineComponent`, and its cancel-on-release is ignored because completion and cancellation are ours.

**Fallback if pointer capture is flaky in practice:** window-level capture-phase `pointerdown/pointermove/pointerup` listeners installed while `active`, doing the same plant/move/complete logic. Task 0 of the plan (spike) verifies which path works in React Flow v12 and locks the implementation to one.

### 6.4b Auto-route in the completion path

When the wire completes **without any planted vertices**, apply the feedback heuristic (source block right of target → downward U); when the user planted vertices, those win:

```
const srcNode = rf.getNode(connection.source);
const tgtNode = rf.getNode(connection.target);
const waypoints = planted.length > 0
  ? planted
  : (srcNode && tgtNode && isBackwardEdge(srcNode, tgtNode)
      ? computeFeedbackRoute(
          nodePortPosition(srcNode, srcPortIndex, true),
          nodePortPosition(tgtNode, tgtPortIndex, false),
          srcNode.position.y + (srcNode.measured?.height ?? 40),
          tgtNode.position.y + (tgtNode.measured?.height ?? 40))
      : []);
setEdges(addEdge({ ...connection, id, type: 'straight', data: { waypoints } }, edges));
```

- `srcPortIndex` / `tgtPortIndex` parse the trailing integer of the handle ids (`out-0` → 0, `in-1` → 1), same as `parsePort` in `exportImport.ts`.
- Reconnect (`onReconnect`, shipped) preserves `data.waypoints` — no re-route on reconnect.

### 6.5 StraightEdge changes

1. **Arrowhead:** pass `markerEnd={{ type: MarkerType.ArrowClosed, color: selected ? '#3b82f6' : '#94a3b8', width: 14, height: 14 }}` to `BaseEdge`. React Flow injects `<marker>` defs automatically — no manual defs. Arrow color follows selection.

2. **Screen-space hit testing:** `HIT_THRESHOLD` becomes a screen-px constant (10). In `onPointerDown`, convert cursor to flow coords (`screenToFlowPosition`), and convert the threshold to flow units using `getZoom()` from `useReactFlow()`: `hitTestSegment(V, flowPos, 10 / zoom)`. This keeps the grab area constant on screen regardless of zoom.

3. **Waypoint handles on hover/select:** track `hovered` via `onPointerEnter/onPointerLeave` on the hit path (local `useState`). Render waypoint circles when `selected || hovered`. Handles get `onPointerDown` with `stopPropagation` → start a *vertex drag*: on move, translate that single waypoint (snapped to preserve axis alignment with neighbors via existing `translateSegment` semantics — vertex drag = drag the segment formed by the waypoint's neighbors, i.e., reuse translation mode with the waypoint's segment index). Double-click still removes (existing).

4. **Materialize-on-drag robustness (the reported bug):** current code materializes waypoints on `pointerdown`, which freezes routing even on a plain click and makes the drag feel broken. Fix: defer materialization to the **first `pointermove` with delta > 0** (same as shipped spec §5.4 intent). On first move:
   - If `waypoints.length === 0`: materialize `V` (minus source/target) as waypoints, then if the grabbed segment was the only straight segment (source→target directly), insert a waypoint at the **pointerdown grab position** (orthogonalized to the segment axis) and translate it.
   - Otherwise enter segment-translation mode on the grabbed segment.
   - `setEdges` with updated `data.waypoints`, preserving `selected`.

5. **No other rendering changes.** Visible path, hit path, marker circles keep current styling.

### 6.6 exportImport.ts

- `exportModel`: per edge, emit `{ id, source, sourcePort, target, targetPort, waypoints: edge.data?.waypoints ?? [] }`.
- `importModel`: rebuild edges as `{ id, source, target, sourceHandle: 'out-' + sourcePort, targetHandle: 'in-' + targetPort, type: 'straight', data: { waypoints: e.waypoints ?? [] } }`.
- `ExportedModel` edge type: add optional `waypoints: XYPosition[]` (backward compatible — old files import with `[]`).

## 7. Error Handling & Edge Cases

| Case | Behavior |
|---|---|
| Click on canvas while NOT connecting | No overlay mounted (gesture inactive) — clicks pass through to React Flow normally. No stray state. |
| Plant a vertex, then click on empty canvas again | Another vertex planted; wire stays in-progress. |
| Double-click on empty canvas while connecting | Wire cancelled, planted vertices discarded. |
| Escape while connecting | Wire cancelled, planted vertices discarded. |
| Plant vertices then click on target port | Planted vertices win over feedback heuristic. |
| Click (no drag) on a source handle, then click a target port | Straight wire; feedback heuristic applies if backward. |
| Feedback edge where source/target not yet measured (`getNode` returns undefined dims) | Fallback height 40 / width 100; route still computed from positions. |
| Two blocks at same x (vertical stack) | `isBackwardEdge` false (x equal) → default routing; acceptable (ambiguous case, no heuristic claim). |
| Feedback wire later reconnected | Waypoints preserved as-is (no re-route). |
| Edge with `waypoints` missing (corrupt/old data) | `?? []` → auto-routed. |
| Node drag after auto-route | Waypoints are absolute; wire does not follow (documented v1 limitation, matches shipped behavior). |
| Export → import round trip | Waypoints survive. |
| Zoomed far out, grabbing a wire | Screen-space threshold keeps grab area constant. |
| React Flow's native connection state fires during our gesture | Ignored; completion/cancel are ours. `onConnectEnd` is a teardown safety net only. |

## 8. Testing

### 8.1 Unit — `tests/components/geometry.test.ts` (extend)

1. `isBackwardEdge`: source right of target → true; source left → false; equal x → false.
2. `nodePortPosition`: left/right edge x, topPct y formula, measured vs fallback dims.
3. `computeFeedbackRoute`: full U-shape for simple case (assert all 5 waypoints), bottomY = max(bottoms) + clearance, horizontal-in/out segments, clearance respected.

### 8.2 Unit — `tests/components/wireGesture.test.ts` (new)

1. `set`/`get`/`subscribe` round-trip; listeners fire on change and unsubscribe cleanly.
2. Plant appends to `planted` and keeps `active` true.
3. `reset` clears all fields.

### 8.3 Component — `tests/components/ConnectionPreview.test.tsx` (new)

1. Inactive state → renders nothing.
2. No vertices → straight `M L` path, no `C` bezier, arrow marker `url(#conn-preview-arrow)` present.
3. Two planted vertices → path passes through them, all segments axis-aligned.

### 8.4 Component — `tests/components/StraightEdge.test.tsx` (extend)

1. `markerEnd` prop present with `ArrowClosed` (assert via rendered path's `marker-end` attribute or the `MarkerType` prop passed to BaseEdge — mock BaseEdge if needed).
2. Waypoint circles rendered on hover (fire `pointerEnter`) and on select.
3. `pointerDown` + `pointerMove` on a straight edge → `setEdges` called with non-empty `data.waypoints` (materialize + bend insert).
4. Existing 9 tests stay green (mock updates: `useReactFlow` now needs `getZoom`).

### 8.5 Component — `tests/components/DiagramCanvas.test.tsx` (extend)

The existing mock `ReactFlow` captures props; extend to drive the gesture wiring:

1. Fire the mocked `ReactFlow`'s `onConnectStart` → assert `wireGesture.get().active === true` and overlay mounted.
2. Dispatch `pointerdown` on the overlay → `planted` grows; dispatch `pointerup` over a mocked target handle element (stubbed `document.elementFromPoint`) → assert `setEdges` called with `data.waypoints` = planted vertices.
3. Completion with no planted vertices and source-right-of-target nodes → `data.waypoints` is the U-route (non-empty, 5 points).
4. Completion with forward nodes and no planted vertices → `waypoints: []`.
5. `Escape` keydown → `wireGesture.reset()` called (overlay unmounted).

### 8.6 Unit — `tests/utils/exportImport.test.ts` (extend)

1. Export a model with an edge carrying waypoints → re-import → waypoints equal.
2. Old-format JSON (no waypoints) → imports with `[]`.

### 8.7 E2E — `tests/e2e/edges.spec.ts` (extend)

1. Build a loop (Step → Sum → Gain → Scope, plus feedback edge Gain → Sum second port): assert the feedback edge's path contains a downward jog below the block bottoms (path `d` has a y > max block bottom).
2. Click-drag the middle of a straight wire → bend vertex appears; double-click it → gone.
3. Draw a wire with two planted canvas clicks → edge renders with two bends.
4. Assert an arrow marker is present on an edge (`marker-end` attribute non-empty).

### 8.8 Existing tests

All 157 tests stay green. Existing `edges.spec.ts` cases (orthogonal rendering, selection, delete) unaffected.

## 9. Acceptance Criteria

1. New feedback edge (source right of target) auto-routes with a downward U; no overlap with intervening blocks.
2. Click-to-plant works: click canvas mid-drag creates vertex, preview routes through it, click on target commits it as waypoints.
3. Escape or double-click cancels a wire with no stray state; a plain click on canvas while not connecting does nothing.
4. Click-drag a straight wire creates a bend that follows the cursor; works at zoom 0.5 and 2.
5. Waypoint handles appear on hover and selection; drag moves a vertex; double-click deletes.
6. Every edge ends in a small arrowhead, color-matched to stroke; connection preview shows an arrow.
7. Waypoints survive JSON export → import.
8. All 157 existing + new tests pass; `npm run build` passes.

## 10. Open Questions / Decisions Recorded

| Question | Decision |
|---|---|
| Auto-route vs manual vs both | Both; heuristic seeds waypoints at connect, manual overrides (user, Q1) |
| Arrow style/placement | Target-end only, every edge + preview (user, Q2) |
| Planting interaction | Simulink-style click-to-plant; Escape/double-click cancels (user, Q3; "release cancels" corrected in self-review — contradictory with click model) |
| Approach | A — store-driven waypoints + custom connection line (user) |
| Re-route on node move | No (v1 limitation; matches shipped behavior) |
| Full obstacle-avoidance routing | v2 candidate |
