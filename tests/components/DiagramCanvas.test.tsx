import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DiagramCanvas } from '../../src/components/DiagramCanvas';
import { useDiagramStore } from '../../src/store/diagramStore';
import React from 'react';

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  const MockReactFlow = function MockReactFlow({ children, nodes, edges }: any) {
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
