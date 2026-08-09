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
});
