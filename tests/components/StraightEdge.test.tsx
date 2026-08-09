import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { StraightEdge } from '../../src/components/edges/StraightEdge';
import type { EdgeProps } from '@xyflow/react';
import React from 'react';

vi.mock('../../src/store/diagramStore', () => ({
  useDiagramStore: {
    getState: () => ({
      edges: [],
      setEdges: vi.fn(),
    }),
  },
}));

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
    expect(d).not.toMatch(/[CSQTA]/);
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
});
