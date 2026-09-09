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
    type: 'Linear',
    data: { type: 'Integrator', inputs: 1, outputs: 1, color: 'bg-purple-500' },
    selected: false,
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    ...overrides,
  } as NodeProps;
}

describe('BaseNode math faces', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
  });

  const KATEX_BLOCKS = [
    'TransferFunction',
    'DiscreteTransferFcn',
    'Integrator',
    'Derivative',
    'StateSpace',
  ];

  it('renders a KaTeX face for every math-capable block type', () => {
    for (const type of KATEX_BLOCKS) {
      useDiagramStore.getState().clear();
      const { container, unmount } = render(React.createElement(BaseNode, makeProps({
        data: { type, inputs: type === 'TransferFunction' || type === 'StateSpace' ? 1 : 1, outputs: 1, color: 'bg-purple-500' },
      })));
      expect(container.querySelector('.katex'), `expected .katex for ${type}`).not.toBeNull();
      unmount();
    }
  });

  it('renders a TransferFunction face as KaTeX math', () => {
    useDiagramStore.getState().updateParams('test-1', { num: [1], den: [1, 1] });
    const { container } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'TransferFunction', inputs: 1, outputs: 1, color: 'bg-purple-500' },
    })));
    expect(container.querySelector('.katex')).not.toBeNull();
  });

  it('keeps Unicode glyphs for blocks without a math face', () => {
    const { container } = render(React.createElement(BaseNode, makeProps({
      data: { type: 'Gain', inputs: 1, outputs: 1, color: 'bg-orange-500' },
    })));
    expect(container.querySelector('.katex')).toBeNull();
    expect(container.textContent).toContain('K');
  });
});
