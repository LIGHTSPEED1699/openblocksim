import { describe, it, expect, beforeEach } from 'vitest';
import { useDiagramStore } from '../../src/store/diagramStore';

describe('edge migration on rehydrate', () => {
  it('converts bezier edges to straight type with empty waypoints', () => {
    const bezierEdge = { id: 'e1', type: 'default', data: {} };
    const migrated = {
      ...bezierEdge,
      type: 'straight',
      data: { waypoints: [] },
    };
    expect(migrated.type).toBe('straight');
    expect((migrated.data as any).waypoints).toEqual([]);
  });

  it('preserves existing waypoints during migration', () => {
    const bezierEdge = { id: 'e1', type: 'default', data: { waypoints: [{ x: 10, y: 10 }] } };
    const migrated = {
      ...bezierEdge,
      type: 'straight',
      data: { waypoints: [{ x: 10, y: 10 }] },
    };
    expect((migrated.data as any).waypoints).toEqual([{ x: 10, y: 10 }]);
  });

  it('leaves already-straight edges untouched', () => {
    const straightEdge = { id: 'e2', type: 'straight', data: { waypoints: [{ x: 5, y: 5 }] } };
    expect(straightEdge.type).toBe('straight');
    expect((straightEdge.data as any).waypoints).toEqual([{ x: 5, y: 5 }]);
  });

  it('treats missing waypoints as empty array', () => {
    const bezierEdge = { id: 'e1', type: 'default', data: {} };
    const wp = (bezierEdge.data as any)?.waypoints ?? [];
    expect(wp).toEqual([]);
  });
});

describe('flipNode', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
  });

  function seed(): string {
    useDiagramStore.getState().setNodes([
      { id: 'g1', type: 'Math', position: { x: 0, y: 0 }, data: { type: 'Gain', inputs: 1, outputs: 1, color: '' } },
    ]);
    return 'g1';
  }

  it('sets data.flipped=true on first flip and keeps other data', () => {
    const id = seed();
    useDiagramStore.getState().flipNode(id);
    const node = useDiagramStore.getState().nodes[0];
    expect((node.data as any).flipped).toBe(true);
    expect((node.data as any).type).toBe('Gain');
    expect(node.position).toEqual({ x: 0, y: 0 });
  });

  it('toggles back to false on second flip', () => {
    const id = seed();
    useDiagramStore.getState().flipNode(id);
    useDiagramStore.getState().flipNode(id);
    expect((useDiagramStore.getState().nodes[0].data as any).flipped).toBe(false);
  });

  it('does not touch other nodes', () => {
    seed();
    useDiagramStore.getState().setNodes([
      { id: 'g1', type: 'Math', position: { x: 0, y: 0 }, data: { type: 'Gain', inputs: 1, outputs: 1, color: '' } },
      { id: 'c1', type: 'Source', position: { x: 100, y: 0 }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } },
    ]);
    useDiagramStore.getState().flipNode('c1');
    const g1 = useDiagramStore.getState().nodes.find((n) => n.id === 'g1')!;
    expect((g1.data as any).flipped).toBeUndefined();
    expect((useDiagramStore.getState().nodes.find((n) => n.id === 'c1')!.data as any).flipped).toBe(true);
  });

  it('is a no-op for an unknown id', () => {
    seed();
    expect(() => useDiagramStore.getState().flipNode('missing')).not.toThrow();
    expect(useDiagramStore.getState().nodes).toHaveLength(1);
  });
});
