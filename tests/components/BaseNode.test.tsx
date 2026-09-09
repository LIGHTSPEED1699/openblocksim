import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BaseNode } from '../../src/components/nodes/BaseNode';
import { useDiagramStore } from '../../src/store/diagramStore';
import type { NodeProps } from '@xyflow/react';
import React from 'react';

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    Handle: function Handle(props: any) {
      return React.createElement('div', {
        'data-handlepos': props.position,
        'data-testid': props.id || `handle-${props.type}-${props.position}`,
        className: props.className,
      });
    },
  };
});

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
    expect(container.textContent).toContain('\u2212');
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

  it('renders semantic port labels from BlockMeta (Gain: u in, y out)', () => {
    const { getByTestId } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'Gain', inputs: 1, outputs: 1, color: 'bg-orange-500' },
    })));
    expect(getByTestId('port-in-0').textContent).toBe('u');
    expect(getByTestId('port-out-0').textContent).toBe('y');
  });

  it('renders PID labels e/PV from BlockMeta, not hardcoding', () => {
    const { getByTestId } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'PID', inputs: 2, outputs: 1, color: 'bg-teal-500' },
    })));
    expect(getByTestId('port-in-0').textContent).toBe('e');
    expect(getByTestId('port-in-1').textContent).toBe('PV');
    expect(getByTestId('port-out-0').textContent).toBe('y');
  });

  it('keeps +/- signs as the Sum input labels and does not show in1/in2', () => {
    useDiagramStore.getState().updateParams('test-1', { signs: [1, -1] });
    const { getByTestId } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'Sum', inputs: 2, outputs: 1, color: 'bg-orange-500' },
    })));
    expect(getByTestId('port-in-0').textContent).toBe('+');
    expect(getByTestId('port-in-1').textContent).toBe('−');
    expect(getByTestId('port-in-0').textContent).not.toBe('in1');
  });

  it('renders no port labels for Comment', () => {
    const { container } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'Comment', inputs: 0, outputs: 0, color: '' },
    })));
    expect(container.querySelectorAll('[data-testid^="port-"]').length).toBe(0);
  });

  it('renders multi-output default labels y1..yN (Demux with 2 outputs)', () => {
    const { getByTestId } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'Demux', inputs: 1, outputs: 2, color: 'bg-cyan-500' },
    })));
    expect(getByTestId('port-in-0').textContent).toBe('u');
    expect(getByTestId('port-out-0').textContent).toBe('y1');
    expect(getByTestId('port-out-1').textContent).toBe('y2');
  });

  it('flipped node swaps handle sides: inputs right, outputs left', () => {
    const { container } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'Gain', inputs: 1, outputs: 1, color: 'bg-orange-500', flipped: true },
    })));
    const inHandle = container.querySelector('[data-testid="in-0"]')!;
    const outHandle = container.querySelector('[data-testid="out-0"]')!;
    expect(inHandle.getAttribute('data-handlepos')).toBe('right');
    expect(outHandle.getAttribute('data-handlepos')).toBe('left');
  });

  it('flipped node moves labels to the mirrored sides', () => {
    const { getByTestId } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'Gain', inputs: 1, outputs: 1, color: 'bg-orange-500', flipped: true },
    })));
    expect(getByTestId('port-in-0').getAttribute('data-side')).toBe('right');
    expect(getByTestId('port-out-0').getAttribute('data-side')).toBe('left');
  });

  it('unflipped nodes keep inputs left and outputs right', () => {
    const { container, getByTestId } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'Gain', inputs: 1, outputs: 1, color: 'bg-orange-500' },
    })));
    const inHandle = container.querySelector('[data-testid="in-0"]')!;
    const outHandle = container.querySelector('[data-testid="out-0"]')!;
    expect(inHandle.getAttribute('data-handlepos')).toBe('left');
    expect(outHandle.getAttribute('data-handlepos')).toBe('right');
    expect(getByTestId('port-in-0').getAttribute('data-side')).toBe('left');
    expect(getByTestId('port-out-0').getAttribute('data-side')).toBe('right');
  });

  it('flipped Sum keeps signs on the right side', () => {
    useDiagramStore.getState().updateParams('test-1', { signs: [1, 1] });
    const { getByTestId } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'Sum', inputs: 2, outputs: 1, color: 'bg-orange-500', flipped: true },
    })));
    expect(getByTestId('port-in-0').textContent).toBe('+');
    expect(getByTestId('port-in-0').getAttribute('data-side')).toBe('right');
  });
});
