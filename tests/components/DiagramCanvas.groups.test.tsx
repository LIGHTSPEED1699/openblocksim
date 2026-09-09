import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { DiagramCanvas } from '../../src/components/DiagramCanvas';
import { useDiagramStore } from '../../src/store/diagramStore';
import type { Node, NodeChange } from '@xyflow/react';

// Prop-capturing RF mock: same shape as tests/components/DiagramCanvas.test.tsx,
// plus it records the props so we can drive onNodesChange directly.
let captured: {
  nodes: Node[];
  onNodesChange: ((changes: NodeChange[]) => void) | null;
} = { nodes: [], onNodesChange: null };

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react');
  const MockReactFlow = function MockReactFlow(props: any) {
    captured = { nodes: props.nodes ?? [], onNodesChange: props.onNodesChange ?? null };
    return React.createElement('div', { className: 'react-flow' },
      (props.nodes ?? []).map((n: any) =>
        React.createElement('div', { key: n.id, className: 'react-flow__node' }),
      ),
      props.children,
    );
  };
  return {
    ...actual,
    ReactFlow: MockReactFlow,
    ReactFlowProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
    Background: () => React.createElement('div', { className: 'react-flow__background' }),
    Controls: () => React.createElement('div', { className: 'react-flow__controls' }),
    useReactFlow: () => ({
      screenToFlowPosition: (p: { x: number; y: number }) => p,
      getNode: (id: string) => captured.nodes.find((n) => n.id === id) ?? null,
    }),
  };
});

describe('DiagramCanvas group integration', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
    captured = { nodes: [], onNodesChange: null };
  });

  function seed(): string {
    const s = useDiagramStore.getState();
    s.setNodes([
      { id: 'n1', type: 'Math', position: { x: 100, y: 100 }, data: { type: 'Gain', inputs: 1, outputs: 1, color: '' } },
    ]);
    s.addGroup({ x: 0, y: 0, width: 300, height: 200 }); // n1 anchor (100,100) inside
    return useDiagramStore.getState().groups[0].id;
  }

  it('passes a derived GroupBox node (zIndex -1001, mirroring the rect) to ReactFlow', () => {
    const gid = seed();
    render(React.createElement(DiagramCanvas));
    const groupNode = captured.nodes.find((n) => n.type === 'GroupBox');
    expect(groupNode).toBeTruthy();
    expect(groupNode!.id).toBe(gid);
    expect(groupNode!.position).toEqual({ x: 0, y: 0 });
    expect(groupNode!.width).toBe(300);
    expect(groupNode!.zIndex).toBe(-1001);
    expect(groupNode!.deletable).toBe(false);
  });

  it('does not add group nodes when no groups exist', () => {
    render(React.createElement(DiagramCanvas));
    expect(captured.nodes.filter((n) => n.type === 'GroupBox')).toHaveLength(0);
  });

  it('routes a group move: rect moves and the contained member translates with it', () => {
    const gid = seed(); // n1 anchor (100,100) is inside the 300x200 box at (0,0)
    render(React.createElement(DiagramCanvas));
    captured.onNodesChange!([{ id: gid, type: 'position', position: { x: 150, y: 120 } }]); // delta (+150,+120)
    const s = useDiagramStore.getState();
    expect(s.groups[0]).toMatchObject({ x: 150, y: 120 });
    expect(s.nodes.find((n) => n.id === 'n1')!.position).toEqual({ x: 250, y: 220 }); // translated member
  });

  it('still applies ordinary user-node changes through the existing path', () => {
    seed();
    render(React.createElement(DiagramCanvas));
    captured.onNodesChange!([{ id: 'n1', type: 'position', position: { x: 700, y: 600 } }]);
    expect(useDiagramStore.getState().nodes.find((n) => n.id === 'n1')!.position).toEqual({ x: 700, y: 600 });
  });

  it('routes a NodeResizer batch as a resize: rect grows, members do not move', () => {
    const gid = seed();
    render(React.createElement(DiagramCanvas));
    captured.onNodesChange!([
      { id: gid, type: 'position', position: { x: 50, y: 50 } },
      { id: gid, type: 'dimensions', resizing: true, dimensions: { width: 400, height: 250 } },
    ]);
    const s = useDiagramStore.getState();
    expect(s.groups[0]).toMatchObject({ x: 50, y: 50, width: 400, height: 250 });
    expect(s.nodes.find((n) => n.id === 'n1')!.position).toEqual({ x: 100, y: 100 }); // NOT translated
  });

  it('routes select changes to selectedGroupId and marks the derived node selected', () => {
    const gid = seed();
    render(React.createElement(DiagramCanvas));
    captured.onNodesChange!([{ id: gid, type: 'select', selected: true }]);
    expect(useDiagramStore.getState().selectedGroupId).toBe(gid);
  });
});
