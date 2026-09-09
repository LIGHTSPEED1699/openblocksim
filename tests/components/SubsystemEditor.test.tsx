import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SubsystemEditor } from '../../src/components/SubsystemEditor';
import { useDiagramStore } from '../../src/store/diagramStore';
import { BlockType } from '../../src/blocks/types';

// RF mock: like DiagramCanvas tests — capture props so tests can drive
// selection and wiring; nodes render as clickable divs.
let captured: { onNodeClick: ((e: unknown, node: { id: string }) => void) | null } = { onNodeClick: null };
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react');
  const MockReactFlow = function MockReactFlow(props: any) {
    captured = { onNodeClick: props.onNodeClick ?? null };
    return React.createElement('div', { className: 'rf-stub' },
      (props.nodes ?? []).map((n: any) =>
        React.createElement('div', {
          key: n.id,
          'data-node-id': n.id,
          onClick: () => captured.onNodeClick?.(null, n),
        }),
      ),
      props.children,
    );
  };
  return {
    ...actual,
    ReactFlow: MockReactFlow,
    ReactFlowProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
    Background: () => null,
    Controls: () => null,
    useReactFlow: () => ({ screenToFlowPosition: (p: any) => p }),
  };
});

const innerWithGain = (gain: number) => JSON.stringify({
  blocks: [
    { id: 'g1', type: BlockType.Gain, params: { gain }, position: { x: 0, y: 0 } },
  ],
  edges: [],
});

function seedStore(): string {
  const s = useDiagramStore.getState();
  s.clear();
  s.setNodes([{ id: 'sub1', type: 'Hierarchy', position: { x: 0, y: 0 }, data: { type: 'Subsystem', inputs: 0, outputs: 0, color: '' } }]);
  s.updateParams('sub1', { subsystem: innerWithGain(1) });
  return 'sub1';
}

describe('SubsystemEditor', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
    captured = { onNodeClick: null };
  });

  it('renders header, Add Input/Output and Save/Cancel', () => {
    seedStore();
    render(<SubsystemEditor subsystemId="sub1" onClose={() => {}} />);
    expect(screen.getByText('Subsystem Editor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add input/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add output/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('loads the existing inner blocks onto the mini canvas', () => {
    seedStore();
    render(<SubsystemEditor subsystemId="sub1" onClose={() => {}} />);
    expect(document.querySelector('[data-node-id="g1"]')).toBeTruthy();
  });

  it('Add Input appends an Inport and Save persists it under params.subsystem', () => {
    seedStore();
    render(<SubsystemEditor subsystemId="sub1" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /add input/i }));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    const raw = useDiagramStore.getState().params.sub1.subsystem as string;
    const inner = JSON.parse(raw);
    expect(inner.blocks.filter((b: any) => b.type === 'Inport')).toHaveLength(1);
    expect(inner.blocks.find((b: any) => b.type === 'Inport').params.port).toBe(0);
    expect(inner.blocks.find((b: any) => b.id === 'g1').params.gain).toBe(1); // untouched
  });

  it('parameter edits through the panel land in the saved JSON', () => {
    seedStore();
    render(<SubsystemEditor subsystemId="sub1" onClose={() => {}} />);
    fireEvent.click(document.querySelector('[data-node-id="g1"]')!); // select inner gain
    const gainInput = screen.getByDisplayValue('1') as HTMLInputElement; // ParameterPanel labels are not htmlFor-associated -> query by value
    fireEvent.change(gainInput, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    const inner = JSON.parse(useDiagramStore.getState().params.sub1.subsystem as string);
    expect(inner.blocks.find((b: any) => b.id === 'g1').params.gain).toBe(5);
  });

  it('Cancel discards draft changes', () => {
    seedStore();
    render(<SubsystemEditor subsystemId="sub1" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /add output/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    const inner = JSON.parse(useDiagramStore.getState().params.sub1.subsystem as string);
    expect(inner.blocks.filter((b: any) => b.type === 'Outport')).toHaveLength(0);
  });

  it('calls onClose on Cancel', () => {
    seedStore();
    const onClose = vi.fn();
    render(<SubsystemEditor subsystemId="sub1" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
