import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { NodeContextMenu } from '../../src/components/NodeContextMenu';

function renderMenu(overrides: Partial<Parameters<typeof NodeContextMenu>[0]> = {}) {
  const props = {
    x: 120, y: 80, nodeId: 'g1', nodeType: 'Gain',
    onFlip: vi.fn(), onClose: vi.fn(),
    ...overrides,
  };
  render(React.createElement(NodeContextMenu, props));
  return props;
}

describe('NodeContextMenu', () => {
  it('renders a menu at the given coordinates with a Flip item', () => {
    const props = renderMenu();
    const menu = screen.getByRole('menu');
    expect(menu.style.left).toBe('120px');
    expect(menu.style.top).toBe('80px');
    expect(screen.getByText('Flip ⇄')).toBeTruthy();
  });

  it('calls onFlip with nodeId then onClose when Flip is clicked', () => {
    const props = renderMenu();
    fireEvent.click(screen.getByText('Flip ⇄'));
    expect(props.onFlip).toHaveBeenCalledWith('g1');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('hides Flip for Comment nodes (no ports)', () => {
    renderMenu({ nodeType: 'Comment' });
    expect(screen.queryByText('Flip ⇄')).toBeNull();
  });

  it('closes on Escape', () => {
    const props = renderMenu();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalled();
  });

  it('closes on outside mousedown', () => {
    const props = renderMenu();
    fireEvent.mouseDown(document.body);
    expect(props.onClose).toHaveBeenCalled();
  });
});
