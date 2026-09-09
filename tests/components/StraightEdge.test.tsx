import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { StraightEdge } from '../../src/components/edges/StraightEdge';
import type { EdgeProps } from '@xyflow/react';
import React from 'react';

const storeRef = vi.hoisted(() => {
  const state: any = { edges: [] as any[], theme: 'dark' };
  state.setEdges = vi.fn((next: any[]) => { state.edges = next; });
  state.beginCoalesce = vi.fn();
  state.endCoalesce = vi.fn();
  const hook = ((selector?: (s: any) => any) => (selector ? selector(state) : state)) as any;
  hook.getState = () => state;
  return { hook, state };
});

vi.mock('../../src/store/diagramStore', () => ({
  useDiagramStore: storeRef.hook,
}));

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

function renderEdge(props: EdgeProps) {
  return render(
    React.createElement('svg', null,
      React.createElement(StraightEdge, props)
    )
  );
}

function seedEdge(data: Record<string, unknown>) {
  storeRef.state.edges = [{ id: 'e1', source: 'src-1', target: 'tgt-1', type: 'straight', data }];
}

describe('StraightEdge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeRef.state.edges = [];
  });

  it('renders a BaseEdge with an orthogonal path', () => {
    const { container } = renderEdge(makeProps());
    const path = container.querySelector('.react-flow__edge-path');
    expect(path).toBeTruthy();
    const d = path!.getAttribute('d');
    expect(d).toMatch(/^M/);
    expect(d).not.toMatch(/[CSQTA]/);
  });

  it('renders a transparent hit path with wide stroke', () => {
    const { container } = renderEdge(makeProps());
    const hitPath = container.querySelector('path[stroke="transparent"]');
    expect(hitPath).toBeTruthy();
    expect(hitPath!.getAttribute('stroke-width')).toBe('12');
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
    expect(path!.getAttribute('style')).toContain('rgb(59, 130, 246)');
  });

  it('renders slate stroke when not selected', () => {
    const { container } = renderEdge(makeProps({ selected: false }));
    const path = container.querySelector('.react-flow__edge-path');
    expect(path!.getAttribute('style')).toContain('rgb(148, 163, 184)');
  });

  it('renders midpoint jog for different-y source/target with no waypoints', () => {
    const { container } = renderEdge(makeProps({
      sourceY: 100,
      targetY: 200,
      data: { waypoints: [] },
    }));
    const path = container.querySelector('.react-flow__edge-path');
    const d = path!.getAttribute('d')!;
    const vertices = d.match(/[ML]\s+[\d.]+/g);
    expect(vertices).toBeTruthy();
    expect(vertices!.length).toBeGreaterThanOrEqual(3);
  });

  it('renders single straight line for same-y source/target', () => {
    const { container } = renderEdge(makeProps({
      sourceY: 100,
      targetY: 100,
      data: { waypoints: [] },
    }));
    const path = container.querySelector('.react-flow__edge-path');
    const d = path!.getAttribute('d')!;
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

  it('brackets a waypoint drag with beginCoalesce/endCoalesce so history records one entry', () => {
    seedEdge({ waypoints: [] });
    const { container } = renderEdge(makeProps());
    const hitPath = container.querySelector('path[stroke="transparent"]')!;
    fireEvent.pointerDown(hitPath, { clientX: 200, clientY: 100 });
    expect(storeRef.state.beginCoalesce).toHaveBeenCalledTimes(1);
    fireEvent.pointerMove(hitPath, { clientX: 200, clientY: 150 });
    expect(storeRef.state.setEdges).toHaveBeenCalled();
    fireEvent.pointerUp(hitPath);
    expect(storeRef.state.endCoalesce).toHaveBeenCalledTimes(1);
  });
});

// StraightEdge's drag state machine: a first pointer-move on a straight edge
// materializes + inserts the bend (snapped to the segment axis) and flips to
// translate mode; *subsequent* moves translate the new vertex. So drag tests
// fire pointerDown → one or more pointerMove → pointerUp, in real order.
function dragPointer(
  el: Element,
  down: { clientX: number; clientY: number },
  moves: { clientX: number; clientY: number }[],
) {
  (el as any).setPointerCapture = vi.fn();
  fireEvent.pointerDown(el, { ...down, pointerId: 1 });
  for (const m of moves) fireEvent.pointerMove(el, { ...m, pointerId: 1 });
  fireEvent.pointerUp(el, { ...moves[moves.length - 1], pointerId: 1 });
}

describe('StraightEdge gestures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeRef.state.edges = [];
  });

  it('dragging a straight edge creates and persists a single bend waypoint', () => {
    seedEdge({ waypoints: [] });
    const { container } = renderEdge(makeProps({ data: { waypoints: [] }, sourceY: 100, targetY: 100 }));
    const hitPath = container.querySelector('path[stroke="transparent"]')!;
    // Move 1 inserts the bend snapped to the line (y=100); move 2 translates
    // the new vertex down to the cursor.
    dragPointer(hitPath, { clientX: 200, clientY: 103 }, [
      { clientX: 200, clientY: 140 },
      { clientX: 200, clientY: 150 },
    ]);
    expect(storeRef.state.edges).toHaveLength(1);
    expect(storeRef.state.edges[0].data.waypoints).toEqual([{ x: 200, y: 150 }]);
  });

  it('translating an interior segment persists both moved vertices', () => {
    // Waypoints chosen so expandPoints adds no elbows: source(100,100) →
    // wp1(200,100) → wp2(200,200) → target(300,200). V = [S, wp1, wp2, T].
    seedEdge({ waypoints: [{ x: 200, y: 100 }, { x: 200, y: 200 }] });
    const { container } = renderEdge(makeProps({
      sourceY: 100, targetY: 200,
      data: { waypoints: [{ x: 200, y: 100 }, { x: 200, y: 200 }] },
    }));
    const hitPath = container.querySelector('path[stroke="transparent"]')!;
    // Hit the vertical segment (x=200, y 100..200) near y=150 and drag it
    // right: segment 1 is interior, so translateSegment moves both vertices
    // horizontally by the cursor delta from wp1 (200 → 237).
    dragPointer(hitPath, { clientX: 197, clientY: 150 }, [{ clientX: 237, clientY: 150 }]);
    expect(storeRef.state.edges[0].data.waypoints).toEqual([
      { x: 237, y: 100 },
      { x: 237, y: 200 },
    ]);
  });

  it('dragging a waypoint dot moves only that waypoint (vertex mode)', () => {
    seedEdge({ waypoints: [{ x: 200, y: 100 }, { x: 200, y: 200 }, { x: 300, y: 200 }] });
    const { container } = renderEdge(makeProps({
      selected: true,
      sourceY: 100, targetY: 300,
      data: { waypoints: [{ x: 200, y: 100 }, { x: 200, y: 200 }, { x: 300, y: 200 }] },
    }));
    const dots = container.querySelectorAll('circle');
    expect(dots.length).toBe(3);
    const middle = dots[1]!;
    dragPointer(middle, { clientX: 200, clientY: 200 }, [{ clientX: 250, clientY: 220 }]);
    expect(storeRef.state.edges[0].data.waypoints).toEqual([
      { x: 200, y: 100 },
      { x: 250, y: 220 }, // only the dragged vertex moved
      { x: 300, y: 200 },
    ]);
  });

  it('double-clicking a waypoint dot removes it', () => {
    seedEdge({ waypoints: [{ x: 200, y: 100 }, { x: 300, y: 100 }] });
    const { container } = renderEdge(makeProps({
      selected: true,
      data: { waypoints: [{ x: 200, y: 100 }, { x: 300, y: 100 }] },
    }));
    fireEvent.doubleClick(container.querySelectorAll('circle')[0]!);
    expect(storeRef.state.edges[0].data.waypoints).toEqual([{ x: 300, y: 100 }]);
  });

  it('pointer down far from the edge does nothing', () => {
    seedEdge({ waypoints: [] });
    const { container } = renderEdge(makeProps({ data: { waypoints: [] } }));
    const hitPath = container.querySelector('path[stroke="transparent"]')!;
    dragPointer(hitPath, { clientX: 50, clientY: 50 }, [{ clientX: 60, clientY: 60 }]);
    expect(storeRef.state.setEdges).not.toHaveBeenCalled();
    expect(storeRef.state.edges[0].data.waypoints).toEqual([]);
  });
});
