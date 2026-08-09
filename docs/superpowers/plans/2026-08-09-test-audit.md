# OpenBlockSim Test Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close test coverage gaps in the OpenBlockSim codebase by adding unit/component tests for 6 untested source files (exportImport, worker, StraightEdge, PlotArea, DiagramCanvas, BaseNode), going from 113 passing tests to ~160+.

**Architecture:** Each task targets one untested module. Tests use Vitest + @testing-library/react for components, jsdom for DOM simulation. No code changes to production files — tests only.

**Tech Stack:** Vitest 4, @testing-library/react 16, @testing-library/jest-dom 7, jsdom 30, React 18.

## Global Constraints

- All 113 existing tests must stay green throughout
- Zero production code changes — this is a test-only plan
- `npm run build` must still pass after every task
- Follow existing test patterns: `describe`/`it`/`expect` from vitest
- Component tests use `render` from @testing-library/react
- Worker tests run in the main thread (no actual Web Worker — mock `postMessage`)

---

### Task 1: Test exportImport.ts — JSON round-trip serialization

**Files:**
- Create: `tests/utils/exportImport.test.ts`

**Interfaces:**
- Consumes: `exportModel`, `importModel` from `src/utils/exportImport.ts`
- Consumes: `useDiagramStore` from `src/store/diagramStore`

- [ ] **Step 1: Create `tests/utils/exportImport.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { importModel } from '../../src/utils/exportImport';
import { useDiagramStore } from '../../src/store/diagramStore';

// Helper: create a minimal valid model JSON
function makeModelJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    blocks: [
      { id: 'Constant-1', type: 'Constant', params: { value: 1 }, position: { x: 100, y: 100 } },
      { id: 'Scope-1', type: 'Scope', params: {}, position: { x: 400, y: 100 } },
    ],
    edges: [
      { id: 'e1', source: 'Constant-1', sourcePort: 0, target: 'Scope-1', targetPort: 0 },
    ],
    simConfig: { dt: 0.01, duration: 10 },
    ...overrides,
  });
}

describe('importModel', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
  });

  it('imports blocks, edges, params, and simConfig', async () => {
    const json = makeModelJson();
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    const state = useDiagramStore.getState();
    expect(state.nodes).toHaveLength(2);
    expect(state.nodes[0].data.type).toBe('Constant');
    expect(state.nodes[1].data.type).toBe('Scope');
    expect(state.edges).toHaveLength(1);
    expect(state.edges[0].source).toBe('Constant-1');
    expect(state.edges[0].target).toBe('Scope-1');
    expect(state.params['Constant-1']).toEqual({ value: 1 });
    expect(state.simConfig).toEqual({ dt: 0.01, duration: 10 });
  });

  it('sets correct IO counts from TYPE_IO lookup', async () => {
    const json = makeModelJson();
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    const state = useDiagramStore.getState();
    // Constant: 0 inputs, 1 output
    expect(state.nodes[0].data.inputs).toBe(0);
    expect(state.nodes[0].data.outputs).toBe(1);
    // Scope: 1 input, 0 outputs
    expect(state.nodes[1].data.inputs).toBe(1);
    expect(state.nodes[1].data.outputs).toBe(0);
  });

  it('maps sourcePort/targetPort to sourceHandle/targetHandle strings', async () => {
    const json = makeModelJson();
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    const edge = useDiagramStore.getState().edges[0];
    expect(edge.sourceHandle).toBe('out-0');
    expect(edge.targetHandle).toBe('in-0');
  });

  it('clears existing state before import', async () => {
    // Pre-populate store
    useDiagramStore.getState().addNode(
      { id: 'old', type: 'Source', position: { x: 0, y: 0 }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } },
      'Constant' as any,
      {},
    );

    const json = makeModelJson();
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    // Old node should be gone
    const state = useDiagramStore.getState();
    expect(state.nodes.find(n => n.id === 'old')).toBeUndefined();
    expect(state.nodes).toHaveLength(2);
  });

  it('throws on missing blocks', async () => {
    const json = JSON.stringify({ edges: [] });
    const file = new File([json], 'bad.json', { type: 'application/json' });
    await expect(importModel(file)).rejects.toThrow('Invalid model file');
  });

  it('throws on missing edges', async () => {
    const json = JSON.stringify({ blocks: [] });
    const file = new File([json], 'bad.json', { type: 'application/json' });
    await expect(importModel(file)).rejects.toThrow('Invalid model file');
  });

  it('throws on invalid JSON', async () => {
    const file = new File(['not json'], 'bad.json', { type: 'application/json' });
    await expect(importModel(file)).rejects.toThrow();
  });

  it('defaults simConfig when not present in imported file', async () => {
    const json = JSON.stringify({
      blocks: [{ id: 'Constant-1', type: 'Constant', params: {}, position: { x: 0, y: 0 } }],
      edges: [],
    });
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    // simConfig should be untouched (retains store defaults)
    const state = useDiagramStore.getState();
    expect(state.simConfig.dt).toBe(0.01);
  });

  it('imports a graph with all block types and verifies category mapping', async () => {
    const blocks = [
      { id: 's1', type: 'Sine', params: {}, position: { x: 0, y: 0 } },
      { id: 'sc1', type: 'Scope', params: {}, position: { x: 100, y: 0 } },
      { id: 'sum1', type: 'Sum', params: {}, position: { x: 200, y: 0 } },
      { id: 'tf1', type: 'TransferFunction', params: {}, position: { x: 300, y: 0 } },
      { id: 'sat1', type: 'Saturation', params: {}, position: { x: 400, y: 0 } },
      { id: 'pid1', type: 'PID', params: {}, position: { x: 500, y: 0 } },
    ];
    const json = JSON.stringify({ blocks, edges: [] });
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    const state = useDiagramStore.getState();
    expect(state.nodes[0].type).toBe('Source');   // Sine
    expect(state.nodes[1].type).toBe('Sink');     // Scope
    expect(state.nodes[2].type).toBe('Math');     // Sum
    expect(state.nodes[3].type).toBe('Linear');   // TransferFunction
    expect(state.nodes[4].type).toBe('Nonlinear');// Saturation
    expect(state.nodes[5].type).toBe('Control');  // PID
  });

  it('handles unknown block type gracefully (falls back to Math category)', async () => {
    const json = JSON.stringify({
      blocks: [{ id: 'x1', type: 'UnknownBlock', params: {}, position: { x: 0, y: 0 } }],
      edges: [],
    });
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    const node = useDiagramStore.getState().nodes[0];
    expect(node.type).toBe('Math'); // fallback
    expect(node.data.inputs).toBe(1); // default IO
    expect(node.data.outputs).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/utils/exportImport.test.ts`
Expected: 10 tests pass.

- [ ] **Step 3: Verify no regressions**

Run: `npx vitest run`
Expected: 113 + 10 = 123 tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/utils/exportImport.test.ts
git commit -m "test: add exportImport round-trip serialization tests"
```

---

### Task 2: Test worker.ts — simulation pipeline from message to result

**Files:**
- Create: `tests/engine/worker.test.ts`

**Interfaces:**
- Consumes: worker's `onmessage` handler logic (tested via message dispatch pattern)
- Consumes: `SerializedGraph`, `WorkerMessage` from `src/engine/types`

- [ ] **Step 1: Create `tests/engine/worker.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the worker's message handler by reproducing its logic.
// The worker imports validateGraph, compileGraph, solve from sibling modules
// — those are already unit-tested. Here we verify the integration wiring:
// correct message dispatch, error handling, and type filtering.

describe('Worker message handler (integration wiring)', () => {
  let postMessageSpy: ReturnType<typeof vi.fn>;
  let onmessageHandler: (e: MessageEvent) => void;

  // Build a minimal SerializedGraph that passes validation and compilation
  const validGraph = {
    blocks: [
      { id: 'Constant-1', type: 'Constant' as const, params: { value: 1 }, position: { x: 0, y: 0 } },
      { id: 'Scope-1', type: 'Scope' as const, params: {}, position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'Constant-1', sourcePort: 0, target: 'Scope-1', targetPort: 0 },
    ],
  };

  beforeEach(async () => {
    postMessageSpy = vi.fn();
    // Mock self.postMessage
    (globalThis as any).postMessage = postMessageSpy;

    // Dynamically import the worker — its top-level self.onmessage assignment
    // runs during import. We capture the handler.
    const mod = await import('../../src/engine/worker');
    // The worker sets self.onmessage at module scope
    onmessageHandler = (self as any).onmessage;
  });

  it('dispatches done message for a valid graph', async () => {
    const msg: MessageEvent = {
      data: { type: 'run', graph: validGraph, dt: 0.01, duration: 0.1 },
    } as MessageEvent;

    onmessageHandler(msg);

    // Allow async compilation/solving to complete
    await vi.waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalled();
    }, { timeout: 5000 });

    const call = postMessageSpy.mock.calls.find(
      (c: any[]) => c[0].type === 'done'
    );
    expect(call).toBeDefined();
    expect(call[0].results).toBeDefined();
    expect(call[0].results.time).toBeInstanceOf(Array);
    expect(call[0].results.scopes).toBeDefined();
  });

  it('ignores non-run messages', async () => {
    const msg: MessageEvent = {
      data: { type: 'cancel' },
    } as MessageEvent;

    onmessageHandler(msg);

    // Give time for any async work
    await new Promise(r => setTimeout(r, 100));
    // Should not have dispatched done or error
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it('dispatches error for invalid graph (missing edges)', async () => {
    const invalidGraph = {
      blocks: [{ id: 'Constant-1', type: 'Constant' as const, params: { value: 1 }, position: { x: 0, y: 0 } }],
      edges: [], // No edges → validation should fail (no sink)
    };

    const msg: MessageEvent = {
      data: { type: 'run', graph: invalidGraph, dt: 0.01, duration: 0.1 },
    } as MessageEvent;

    onmessageHandler(msg);

    await vi.waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalled();
    }, { timeout: 5000 });

    const errorCall = postMessageSpy.mock.calls.find(
      (c: any[]) => c[0].type === 'error'
    );
    expect(errorCall).toBeDefined();
    expect(typeof errorCall[0].message).toBe('string');
  });

  it('dispatches error when graph has missing block in edges', async () => {
    const badGraph = {
      blocks: [
        { id: 'Constant-1', type: 'Constant' as const, params: { value: 1 }, position: { x: 0, y: 0 } },
        { id: 'Scope-1', type: 'Scope' as const, params: {}, position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'Constant-1', sourcePort: 0, target: 'GhostBlock', targetPort: 0 },
      ],
    };

    const msg: MessageEvent = {
      data: { type: 'run', graph: badGraph, dt: 0.01, duration: 0.1 },
    } as MessageEvent;

    onmessageHandler(msg);

    await vi.waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalled();
    }, { timeout: 5000 });

    const errorCall = postMessageSpy.mock.calls.find(
      (c: any[]) => c[0].type === 'error'
    );
    expect(errorCall).toBeDefined();
  });

  it('result has correct structure: time array and scopes map', async () => {
    const msg: MessageEvent = {
      data: { type: 'run', graph: validGraph, dt: 0.01, duration: 0.1 },
    } as MessageEvent;

    onmessageHandler(msg);

    await vi.waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalled();
    }, { timeout: 5000 });

    const doneCall = postMessageSpy.mock.calls.find(
      (c: any[]) => c[0].type === 'done'
    );
    expect(doneCall).toBeDefined();
    const results = doneCall[0].results;
    expect(results.time.length).toBeGreaterThan(0);
    expect(results.time[0]).toBe(0);
    expect(results.scopes['Scope-1']).toBeDefined();
    expect(results.scopes['Scope-1'].length).toBe(results.time.length);
  });
});
```

- [ ] **Step 2: Run worker tests**

Run: `npx vitest run tests/engine/worker.test.ts`
Expected: 5 tests pass.

- [ ] **Step 3: Verify no regressions**

Run: `npx vitest run`
Expected: 123 + 5 = 128 tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/engine/worker.test.ts
git commit -m "test: add worker integration-wiring tests (message → validate → compile → solve)"
```

---

### Task 3: Test StraightEdge component — React rendering and interaction

**Files:**
- Create: `tests/components/StraightEdge.test.tsx`

**Interfaces:**
- Consumes: `StraightEdge` from `src/components/edges/StraightEdge`
- Consumes: React Flow's `EdgeProps` type
- Uses: `@testing-library/react` for rendering

- [ ] **Step 1: Create `tests/components/StraightEdge.test.tsx`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StraightEdge } from '../../src/components/edges/StraightEdge';
import type { EdgeProps } from '@xyflow/react';
import React from 'react';

// Mock the store
vi.mock('../../src/store/diagramStore', () => ({
  useDiagramStore: {
    getState: () => ({
      edges: [],
      setEdges: vi.fn(),
    }),
  },
}));

// Mock useReactFlow (screenToFlowPosition)
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    useReactFlow: () => ({
      screenToFlowPosition: vi.fn((p: { x: number; y: number }) => p),
    }),
  };
});

function makeProps(overrides: Partial<EdgeProps> = {}): EdgeProps {
  return {
    id: 'e1',
    source: 'src-1',
    target: 'tgt-1',
    sourceX: 100,
    sourceY: 100,
    targetX: 300,
    targetY: 100,
    sourcePosition: 'right' as any,
    targetPosition: 'left' as any,
    data: { waypoints: [] },
    selected: false,
    ...overrides,
  } as EdgeProps;
}

// React Flow's custom edges expect to be rendered inside a ReactFlowProvider/SVG.
// We wrap in an SVG to avoid "foreignObject" issues.
function renderEdge(props: EdgeProps) {
  return render(
    React.createElement('svg', null,
      React.createElement(StraightEdge, props)
    )
  );
}

describe('StraightEdge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a BaseEdge with an orthogonal path', () => {
    const { container } = renderEdge(makeProps());
    const path = container.querySelector('.react-flow__edge-path');
    expect(path).toBeTruthy();
    const d = path!.getAttribute('d');
    expect(d).toMatch(/^M/);
    expect(d).not.toMatch(/[CSQTA]/); // no bezier
  });

  it('renders a transparent hit path with wide stroke', () => {
    const { container } = renderEdge(makeProps());
    const hitPath = container.querySelector('path[stroke="transparent"]');
    expect(hitPath).toBeTruthy();
    expect(hitPath!.getAttribute('stroke-width')).toBe('14');
  });

  it('renders waypoint markers when selected', () => {
    const { container } = renderEdge(makeProps({
      selected: true,
      data: { waypoints: [{ x: 200, y: 100 }] },
    }));
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(1);
    expect(circles[0].getAttribute('r')).toBe('4');
  });

  it('does not render waypoint markers when not selected', () => {
    const { container } = renderEdge(makeProps({
      selected: false,
      data: { waypoints: [{ x: 200, y: 100 }] },
    }));
    expect(container.querySelectorAll('circle').length).toBe(0);
  });

  it('renders blue stroke when selected', () => {
    const { container } = renderEdge(makeProps({ selected: true }));
    const path = container.querySelector('.react-flow__edge-path');
    expect(path!.getAttribute('style')).toContain('#3b82f6');
  });

  it('renders slate stroke when not selected', () => {
    const { container } = renderEdge(makeProps({ selected: false }));
    const path = container.querySelector('.react-flow__edge-path');
    expect(path!.getAttribute('style')).toContain('#94a3b8');
  });

  it('renders midpoint jog for different-y source/target with no waypoints', () => {
    const { container } = renderEdge(makeProps({
      sourceY: 100,
      targetY: 200,
      data: { waypoints: [] },
    }));
    const path = container.querySelector('.react-flow__edge-path');
    const d = path!.getAttribute('d')!;
    // Should have 4 vertices: source → midpointJog1 → midpointJog2 → target
    const vertices = d.match(/[ML]\s+[\d.]+/g);
    expect(vertices).toBeTruthy();
    expect(vertices!.length).toBeGreaterThanOrEqual(3); // at least 3 segments
  });

  it('renders single straight line for same-y source/target', () => {
    const { container } = renderEdge(makeProps({
      sourceY: 100,
      targetY: 100,
      data: { waypoints: [] },
    }));
    const path = container.querySelector('.react-flow__edge-path');
    const d = path!.getAttribute('d')!;
    // Should be exactly 2 vertices for straight line
    expect(d).toBe('M 100 100 L 300 100');
  });

  it('passes through explicit waypoints', () => {
    const { container } = renderEdge(makeProps({
      sourceY: 100,
      targetY: 300,
      data: { waypoints: [{ x: 200, y: 150 }, { x: 250, y: 250 }] },
    }));
    const path = container.querySelector('.react-flow__edge-path');
    const d = path!.getAttribute('d')!;
    expect(d).toContain('200');
    expect(d).toContain('250');
  });
});
```

- [ ] **Step 2: Run StraightEdge tests**

Run: `npx vitest run tests/components/StraightEdge.test.tsx`
Expected: 9 tests pass.

- [ ] **Step 3: Verify no regressions**

Run: `npx vitest run`
Expected: 128 + 9 = 137 tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/components/StraightEdge.test.tsx
git commit -m "test: add StraightEdge component rendering tests"
```

---

### Task 4: Test PlotArea.tsx — conditional rendering states

**Files:**
- Create: `tests/components/PlotArea.test.tsx`

**Interfaces:**
- Consumes: `PlotArea` from `src/components/PlotArea`
- Consumes: `useDiagramStore` from `src/store/diagramStore`

- [ ] **Step 1: Create `tests/components/PlotArea.test.tsx`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlotArea } from '../../src/components/PlotArea';
import { useDiagramStore } from '../../src/store/diagramStore';
import React from 'react';

describe('PlotArea', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
  });

  it('shows error message when simError is set', () => {
    useDiagramStore.getState().setSimError('Simulation failed: division by zero');
    render(React.createElement(PlotArea));
    expect(screen.getByText('Simulation failed: division by zero')).toBeTruthy();
  });

  it('shows empty prompt when no simResults and no error', () => {
    useDiagramStore.getState().setSimResults(null);
    useDiagramStore.getState().setSimError(null);
    render(React.createElement(PlotArea));
    expect(screen.getByText('Run a simulation to see plots')).toBeTruthy();
  });

  it('shows "No Scope blocks" when simResults exist but no Scope nodes', () => {
    useDiagramStore.getState().setSimResults({
      time: [0, 0.1, 0.2],
      scopes: {},
    });
    // No nodes added → no Scope blocks
    render(React.createElement(PlotArea));
    expect(screen.getByText('No Scope blocks in diagram')).toBeTruthy();
  });

  it('renders plot when simResults and Scope nodes exist', () => {
    // Add a Scope node
    useDiagramStore.getState().addNode(
      {
        id: 'Scope-1',
        type: 'Sink',
        position: { x: 0, y: 0 },
        data: { type: 'Scope', inputs: 1, outputs: 0, color: '' },
      },
      'Scope' as any,
      {},
    );
    useDiagramStore.getState().setSimResults({
      time: [0, 0.1, 0.2],
      scopes: { 'Scope-1': [0, 1, 2] },
    });

    render(React.createElement(PlotArea));
    // Plotly renders an SVG with class 'main-svg'
    const svg = document.querySelector('.main-svg');
    expect(svg).toBeTruthy();
  });

  it('renders one plot per Scope node', () => {
    useDiagramStore.getState().addNode(
      { id: 'Scope-1', type: 'Sink', position: { x: 0, y: 0 }, data: { type: 'Scope', inputs: 1, outputs: 0, color: '' } },
      'Scope' as any, {},
    );
    useDiagramStore.getState().addNode(
      { id: 'Scope-2', type: 'Sink', position: { x: 100, y: 0 }, data: { type: 'Scope', inputs: 1, outputs: 0, color: '' } },
      'Scope' as any, {},
    );
    useDiagramStore.getState().setSimResults({
      time: [0, 0.1],
      scopes: { 'Scope-1': [0, 1], 'Scope-2': [2, 3] },
    });

    render(React.createElement(PlotArea));
    const plots = document.querySelectorAll('.js-plotly-plot');
    expect(plots.length).toBe(2);
  });

  it('uses empty array for Scope node with no trace data', () => {
    useDiagramStore.getState().addNode(
      { id: 'Scope-1', type: 'Sink', position: { x: 0, y: 0 }, data: { type: 'Scope', inputs: 1, outputs: 0, color: '' } },
      'Scope' as any, {},
    );
    // Scope-1 is in nodes but not in scopes
    useDiagramStore.getState().setSimResults({
      time: [0, 0.1],
      scopes: { 'Scope-2': [0, 1] },
    });

    render(React.createElement(PlotArea));
    // Should still render — Plotly handles empty arrays gracefully
    const svg = document.querySelector('.main-svg');
    expect(svg).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run PlotArea tests**

Run: `npx vitest run tests/components/PlotArea.test.tsx`
Expected: 6 tests pass.

- [ ] **Step 3: Verify no regressions**

Run: `npx vitest run`
Expected: 137 + 6 = 143 tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/components/PlotArea.test.tsx
git commit -m "test: add PlotArea conditional rendering tests"
```

---

### Task 5: Test BaseNode.tsx — node rendering and selection

**Files:**
- Create: `tests/components/BaseNode.test.tsx`

**Interfaces:**
- Consumes: `BaseNode` from `src/components/nodes/BaseNode`
- Consumes: React Flow's `NodeProps` type

- [ ] **Step 1: Create `tests/components/BaseNode.test.tsx`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BaseNode } from '../../src/components/nodes/BaseNode';
import { useDiagramStore } from '../../src/store/diagramStore';
import type { NodeProps } from '@xyflow/react';
import React from 'react';

function makeProps(overrides: Partial<NodeProps> = {}): NodeProps {
  return {
    id: 'test-1',
    type: 'Source',
    data: {
      type: 'Constant',
      inputs: 0,
      outputs: 1,
      color: 'bg-green-500',
    },
    selected: false,
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    ...overrides,
  } as NodeProps;
}

describe('BaseNode', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
  });

  it('renders the icon for a known block type', () => {
    const { container } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'Sum', inputs: 2, outputs: 1, color: 'bg-orange-500' },
    })));
    expect(container.textContent).toContain('Σ');
  });

  it('renders the type string for unknown block types', () => {
    const { container } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'CustomBlock', inputs: 1, outputs: 1, color: '' },
    })));
    expect(container.textContent).toContain('CustomBlock');
  });

  it('renders input handles based on inputs count', () => {
    const { container } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'Sum', inputs: 2, outputs: 1, color: 'bg-orange-500' },
    })));
    const targetHandles = container.querySelectorAll('[data-handlepos="left"]');
    expect(targetHandles.length).toBe(2);
  });

  it('renders output handles based on outputs count', () => {
    const { container } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'Constant', inputs: 0, outputs: 1, color: 'bg-green-500' },
    })));
    const sourceHandles = container.querySelectorAll('[data-handlepos="right"]');
    expect(sourceHandles.length).toBe(1);
  });

  it('shows +/- signs on Sum block input ports', () => {
    useDiagramStore.getState().updateParams('test-1', { signs: [1, -1] });
    const { container } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'Sum', inputs: 2, outputs: 1, color: 'bg-orange-500' },
    })));
    expect(container.textContent).toContain('+');
    expect(container.textContent).toContain('−');
  });

  it('shows e and PV labels on PID block input ports', () => {
    const { container } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'PID', inputs: 2, outputs: 1, color: 'bg-teal-500' },
    })));
    expect(container.textContent).toContain('e');
    expect(container.textContent).toContain('PV');
  });

  it('applies selected styling when this node is the selected block', () => {
    useDiagramStore.getState().selectBlock('test-1');
    const { container } = render(React.createElement(BaseNode, makeProps()));
    const nodeDiv = container.firstElementChild;
    expect(nodeDiv!.className).toContain('border-blue-500');
    expect(nodeDiv!.className).toContain('ring-2');
  });

  it('does not apply selected styling when a different block is selected', () => {
    useDiagramStore.getState().selectBlock('other-block');
    const { container } = render(React.createElement(BaseNode, makeProps()));
    const nodeDiv = container.firstElementChild;
    expect(nodeDiv!.className).not.toContain('border-blue-500');
  });

  it('applies the color stripe class', () => {
    const { container } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'Constant', inputs: 0, outputs: 1, color: 'bg-green-500' },
    })));
    const stripe = container.querySelector('.bg-green-500');
    expect(stripe).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run BaseNode tests**

Run: `npx vitest run tests/components/BaseNode.test.tsx`
Expected: 9 tests pass.

- [ ] **Step 3: Verify no regressions**

Run: `npx vitest run`
Expected: 143 + 9 = 152 tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/components/BaseNode.test.tsx
git commit -m "test: add BaseNode rendering, handles, and selection tests"
```

---

### Task 6: Test DiagramCanvas.tsx — edge types and connection wiring

**Files:**
- Create: `tests/components/DiagramCanvas.test.tsx`

**Interfaces:**
- Consumes: `DiagramCanvas` from `src/components/DiagramCanvas`
- Consumes: React Flow rendering with mocked nodes/edges

- [ ] **Step 1: Create `tests/components/DiagramCanvas.test.tsx`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { DiagramCanvas } from '../../src/components/DiagramCanvas';
import { useDiagramStore } from '../../src/store/diagramStore';
import React from 'react';

describe('DiagramCanvas', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
  });

  it('renders without crashing (empty canvas)', () => {
    const { container } = render(React.createElement(DiagramCanvas));
    expect(container.querySelector('.react-flow')).toBeTruthy();
  });

  it('renders existing nodes', () => {
    useDiagramStore.getState().addNode(
      {
        id: 'Constant-1',
        type: 'Source',
        position: { x: 100, y: 100 },
        data: { type: 'Constant', inputs: 0, outputs: 1, color: 'bg-green-500' },
      },
      'Constant' as any,
      { value: 1 },
    );

    const { container } = render(React.createElement(DiagramCanvas));
    // React Flow renders nodes inside .react-flow__node
    expect(container.querySelector('.react-flow__node')).toBeTruthy();
  });

  it('renders straight edges', () => {
    useDiagramStore.getState().setNodes([
      {
        id: 'src',
        type: 'Source',
        position: { x: 0, y: 0 },
        data: { type: 'Constant', inputs: 0, outputs: 1, color: '' },
      },
      {
        id: 'tgt',
        type: 'Sink',
        position: { x: 200, y: 0 },
        data: { type: 'Scope', inputs: 1, outputs: 0, color: '' },
      },
    ]);
    useDiagramStore.getState().setEdges([
      {
        id: 'e1',
        source: 'src',
        target: 'tgt',
        type: 'straight',
        data: { waypoints: [] },
      },
    ]);

    const { container } = render(React.createElement(DiagramCanvas));
    // React Flow renders edges inside .react-flow__edge
    expect(container.querySelector('.react-flow__edge')).toBeTruthy();
    expect(container.querySelector('.react-flow__edge-path')).toBeTruthy();
  });

  it('renders background and controls', () => {
    const { container } = render(React.createElement(DiagramCanvas));
    expect(container.querySelector('.react-flow__background')).toBeTruthy();
    expect(container.querySelector('.react-flow__controls')).toBeTruthy();
  });

  it('registers straight edge type', () => {
    // This is verified by rendering an edge with type=straight
    // and confirming it uses StraightEdge (no bezier path)
    useDiagramStore.getState().setNodes([
      { id: 'src', type: 'Source', position: { x: 0, y: 0 }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } },
      { id: 'tgt', type: 'Sink', position: { x: 200, y: 0 }, data: { type: 'Scope', inputs: 1, outputs: 0, color: '' } },
    ]);
    useDiagramStore.getState().setEdges([
      { id: 'e1', source: 'src', target: 'tgt', type: 'straight', data: { waypoints: [] } },
    ]);

    const { container } = render(React.createElement(DiagramCanvas));
    const edgePath = container.querySelector('.react-flow__edge-path');
    expect(edgePath).toBeTruthy();
    const d = edgePath!.getAttribute('d');
    expect(d).not.toMatch(/[CSQTA]/);
  });
});
```

- [ ] **Step 2: Run DiagramCanvas tests**

Run: `npx vitest run tests/components/DiagramCanvas.test.tsx`
Expected: 5 tests pass.

- [ ] **Step 3: Verify no regressions + build**

Run: `npx vitest run`
Expected: 152 + 5 = 157 tests pass.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add tests/components/DiagramCanvas.test.tsx
git commit -m "test: add DiagramCanvas rendering, edge types, and connection tests"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: 157 tests pass (113 existing + 44 new).

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: `tsc` + `vite build` both succeed.

- [ ] **Step 3: Acceptance checklist**

- [x] exportImport.ts — 10 tests (serialization, IO mapping, error cases, category mapping, unknown types)
- [x] worker.ts — 5 tests (valid graph, invalid graph, error dispatch, result structure, type filtering)
- [x] StraightEdge.tsx — 9 tests (rendering, hit path, waypoint markers, colors, same-y, different-y, waypoints)
- [x] PlotArea.tsx — 6 tests (error, empty, no scope, scope with data, multiple scopes, missing trace)
- [x] BaseNode.tsx — 9 tests (icon, unknown type, handles, signs, PID labels, selection)
- [x] DiagramCanvas.tsx — 5 tests (empty, nodes, edges, background, edge types)
- [x] All 113 existing tests still pass
- [x] `npm run build` passes

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: final verification — 157 tests pass, build succeeds"
```
