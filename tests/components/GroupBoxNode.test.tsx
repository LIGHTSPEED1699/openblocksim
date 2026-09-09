import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { NodeProps } from '@xyflow/react';
import { GroupBoxNode, GROUP_NODE_TYPE } from '../../src/components/nodes/GroupBoxNode';
import { useDiagramStore } from '../../src/store/diagramStore';

// NodeResizer is RF-internal (uses the RF store context); stub it. Only
// GroupBoxNode's own markup is under test here.
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react');
  return {
    ...actual,
    NodeResizer: (props: { isVisible?: boolean }) =>
      props.isVisible
        ? (globalThis as any).__resizerStub?.() ?? null
        : null,
  };
});

let gid = 'grp-1';
const nodeProps = (over: Partial<NodeProps> = {}) =>
  ({ id: gid, selected: false, ...over } as unknown as NodeProps);

describe('GroupBoxNode', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
    const s = useDiagramStore.getState();
    s.setNodes([
      { id: 'n1', type: 'Math', position: { x: 10, y: 10 }, data: { type: 'Gain', inputs: 1, outputs: 1, color: '' } },
      { id: 'n2', type: 'Math', position: { x: 500, y: 500 }, data: { type: 'Gain', inputs: 1, outputs: 1, color: '' } },
    ]);
    s.addGroup({ x: 0, y: 0, width: 300, height: 200 });
    gid = useDiagramStore.getState().groups[0].id;
    s.selectGroup(gid);
  });

  it('renders the box with the group color and name', () => {
    render(<GroupBoxNode {...nodeProps()} />);
    expect(screen.getByText('Group 1')).toBeInTheDocument();
    const box = screen.getByTestId('group-box');
    expect(box).toHaveStyle({ borderColor: '#3b82f6' });
    expect(box.style.backgroundColor).toBeTruthy();
  });

  it('renders no delete button when not selected', () => {
    render(<GroupBoxNode {...nodeProps({ selected: false })} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows NodeResizer when selected', () => {
    const seen: boolean[] = [];
    (globalThis as any).__resizerStub = () => { seen.push(true); return null; };
    render(<GroupBoxNode {...nodeProps({ selected: true })} />);
    expect(seen).toEqual([true]);
    delete (globalThis as any).__resizerStub;
  });

  it('deletes group + its contained members after confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<GroupBoxNode {...nodeProps({ selected: true })} />);
    fireEvent.click(screen.getByRole('button', { name: /Delete Group 1 and contents/i }));
    const state = useDiagramStore.getState();
    expect(state.groups).toHaveLength(0);
    expect(state.nodes.map((n) => n.id)).toEqual(['n2']); // n1 was inside (10,10)
    vi.restoreAllMocks();
  });

  it('keeps group when confirm is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<GroupBoxNode {...nodeProps({ selected: true })} />);
    fireEvent.click(screen.getByRole('button', { name: /Delete Group 1 and contents/i }));
    const state = useDiagramStore.getState();
    expect(state.groups).toHaveLength(1);
    expect(state.nodes).toHaveLength(2);
    vi.restoreAllMocks();
  });

  it('renders a convert-to-subsystem button when selected', () => {
    render(<GroupBoxNode {...nodeProps({ selected: true })} />);
    expect(screen.getByRole('button', { name: /Convert Group 1 to subsystem/i })).toBeInTheDocument();
  });

  it('does not render the convert button when not selected', () => {
    render(<GroupBoxNode {...nodeProps({ selected: false })} />);
    expect(screen.queryByRole('button', { name: /Convert Group 1 to subsystem/i })).toBeNull();
  });

  it('converts the box and its members into a subsystem node on convert click', () => {
    render(<GroupBoxNode {...nodeProps({ selected: true })} />);
    fireEvent.click(screen.getByRole('button', { name: /Convert Group 1 to subsystem/i }));
    const state = useDiagramStore.getState();
    expect(state.groups).toHaveLength(0);
    expect(state.nodes.find((n) => n.data.type === 'Subsystem')).toBeTruthy();
    expect(state.nodes.map((n) => n.id)).not.toContain('n1'); // member gone
    expect(state.nodes.map((n) => n.id)).toContain('n2');    // non-member kept
  });

  it('exposes the GROUP_NODE_TYPE constant', () => {
    expect(GROUP_NODE_TYPE).toBe('GroupBox');
  });
});
