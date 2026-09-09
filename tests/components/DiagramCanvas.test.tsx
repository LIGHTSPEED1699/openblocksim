import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { DiagramCanvas } from '../../src/components/DiagramCanvas';
import { useDiagramStore } from '../../src/store/diagramStore';
import React from 'react';

export const rfProps: Record<string, any> = {};

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  const MockReactFlow = function MockReactFlow({ children, nodes, edges, ...rest }: any) {
    Object.assign(rfProps, {
      onNodesChange: rest.onNodesChange,
      onNodeDragStart: rest.onNodeDragStart,
      onNodeDragStop: rest.onNodeDragStop,
      onSelectionDragStart: rest.onSelectionDragStart,
      onSelectionDragStop: rest.onSelectionDragStop,
      onNodesDelete: rest.onNodesDelete,
    });
    return React.createElement('div', { className: 'react-flow' },
      nodes && nodes.map((n: any) =>
        React.createElement('div', { key: n.id, className: 'react-flow__node' })
      ),
      edges && edges.map((e: any) =>
        React.createElement('div', { key: e.id, className: 'react-flow__edge' },
          React.createElement('path', { className: 'react-flow__edge-path', d: 'M 0 0 L 100 0' })
        )
      ),
      children,
    );
  };
  return {
    ...actual,
    ReactFlow: MockReactFlow,
    ReactFlowProvider: function Provider({ children }: any) { return React.createElement(React.Fragment, null, children); },
    Background: () => React.createElement('div', { className: 'react-flow__background' }),
    Controls: () => React.createElement('div', { className: 'react-flow__controls' }),
    useReactFlow: () => ({
      screenToFlowPosition: vi.fn((p: { x: number; y: number }) => p),
    }),
  };
});

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
    expect(container.querySelector('.react-flow__edge')).toBeTruthy();
    expect(container.querySelector('.react-flow__edge-path')).toBeTruthy();
  });

  it('renders background and controls', () => {
    const { container } = render(React.createElement(DiagramCanvas));
    expect(container.querySelector('.react-flow__background')).toBeTruthy();
    expect(container.querySelector('.react-flow__controls')).toBeTruthy();
  });

  it('registers straight edge type', () => {
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

function srcNode(id: string, x: number, y: number) {
  return { id, type: 'Source', position: { x, y }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } };
}

describe('DiagramCanvas history wiring', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
    Object.keys(rfProps).forEach((k) => delete rfProps[k]);
  });

  it('coalesces a full node-drag gesture (begin → moves → stop) into one history entry', () => {
    useDiagramStore.getState().setNodes([srcNode('a', 0, 0) as any]);   // baseline entry
    expect(useDiagramStore.getState().past.length).toBe(1);

    render(React.createElement(DiagramCanvas));

    act(() => { rfProps.onNodeDragStart?.(); });
    act(() => { useDiagramStore.getState().setNodes([srcNode('a', 10, 10) as any]); });
    act(() => { useDiagramStore.getState().setNodes([srcNode('a', 20, 20) as any]); });
    act(() => { useDiagramStore.getState().setNodes([srcNode('a', 30, 30) as any]); });
    expect(useDiagramStore.getState().past.length).toBe(1);            // still absorbed
    act(() => { rfProps.onNodeDragStop?.(); });

    const store = useDiagramStore.getState();
    expect(store.past.length).toBe(2);
    const e = store.past[store.past.length - 1];
    expect(e.before.nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(e.after.nodes[0].position).toEqual({ x: 30, y: 30 });

    act(() => { store.undo(); });
    expect(useDiagramStore.getState().nodes[0].position).toEqual({ x: 0, y: 0 });
  });

  it('coalesces a multi-node keyboard delete into one history entry and undo restores all', () => {
    useDiagramStore.getState().setNodes([
      srcNode('n1', 0, 0) as any,
      srcNode('n2', 100, 0) as any,
      srcNode('n3', 200, 0) as any,
    ]);
    expect(useDiagramStore.getState().past.length).toBe(1);

    render(React.createElement(DiagramCanvas));

    const three = useDiagramStore.getState().nodes;
    act(() => { rfProps.onNodesDelete?.(three); });

    const store = useDiagramStore.getState();
    expect(store.nodes).toEqual([]);
    expect(store.past.length).toBe(2);                                 // one entry for all three

    act(() => { store.undo(); });
    expect(useDiagramStore.getState().nodes.map((n) => n.id).sort()).toEqual(['n1', 'n2', 'n3']);
  });
});
