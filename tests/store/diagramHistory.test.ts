import { describe, it, expect, beforeEach } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import { useDiagramStore } from '../../src/store/diagramStore';

function srcNode(id: string, x: number, y: number): Node {
  return { id, type: 'Source', position: { x, y }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } };
}

const past = () => useDiagramStore.getState().past.length;
const future = () => useDiagramStore.getState().future.length;

describe('diagramStore history (record / undo / redo)', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
  });

  it('starts with empty history and disabled undo/redo', () => {
    const s = useDiagramStore.getState();
    expect(s.past).toEqual([]);
    expect(s.future).toEqual([]);
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
  });

  it('records setNodes and round-trips through undo/redo', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('a', 10, 20)]);
    expect(past()).toBe(1);
    expect(useDiagramStore.getState().canUndo).toBe(true);

    useDiagramStore.getState().undo();
    let s = useDiagramStore.getState();
    expect(s.nodes).toEqual([]);
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(true);
    expect(future()).toBe(1);

    useDiagramStore.getState().redo();
    s = useDiagramStore.getState();
    expect(s.nodes).toHaveLength(1);
    expect(s.nodes[0].id).toBe('a');
    expect(s.nodes[0].position).toEqual({ x: 10, y: 20 });
    expect(s.canUndo).toBe(true);
    expect(s.canRedo).toBe(false);
  });

  it('selection-only setNodes calls are not recorded', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('a', 0, 0)]);
    expect(past()).toBe(1);
    store.setNodes([{ ...srcNode('a', 0, 0), selected: true } as Node]);
    store.setNodes([{ ...srcNode('a', 0, 0), selected: false } as Node]);
    expect(past()).toBe(1); // still just the initial add
    useDiagramStore.getState().undo();
    expect(useDiagramStore.getState().nodes).toEqual([]);
  });

  it('undo/redo walk a stack of two distinct edits', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('a', 0, 0)]);
    store.setNodes([srcNode('a', 50, 50)]);
    expect(past()).toBe(2);

    useDiagramStore.getState().undo();
    expect(useDiagramStore.getState().nodes[0].position).toEqual({ x: 0, y: 0 });
    useDiagramStore.getState().undo();
    expect(useDiagramStore.getState().nodes).toEqual([]);

    useDiagramStore.getState().redo();
    expect(useDiagramStore.getState().nodes[0].position).toEqual({ x: 0, y: 0 });
    useDiagramStore.getState().redo();
    expect(useDiagramStore.getState().nodes[0].position).toEqual({ x: 50, y: 50 });
    expect(useDiagramStore.getState().canRedo).toBe(false);
  });

  it('a fresh edit after undo clears the redo branch', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('a', 0, 0)]);
    store.setNodes([srcNode('a', 50, 50)]);
    useDiagramStore.getState().undo();
    expect(future()).toBe(1);

    store.setNodes([srcNode('a', 99, 99)]);
    expect(future()).toBe(0);
    expect(useDiagramStore.getState().canRedo).toBe(false);
    useDiagramStore.getState().redo(); // must be a no-op
    expect(useDiagramStore.getState().nodes[0].position).toEqual({ x: 99, y: 99 });
  });

  it('undo()/redo() are no-ops at the boundaries', () => {
    useDiagramStore.getState().undo();
    expect(useDiagramStore.getState().nodes).toEqual([]);
    useDiagramStore.getState().redo();
    expect(useDiagramStore.getState().nodes).toEqual([]);
  });

  it('removeNode is atomic: undo restores the node, its params, and its cascaded edges', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('a', 0, 0), srcNode('b', 200, 0)]);
    store.setEdges([
      { id: 'e1', source: 'a', target: 'b', sourceHandle: 'out-0', targetHandle: 'in-0', type: 'straight', data: { waypoints: [] } } as Edge,
    ]);
    store.updateParams('a', { value: 9 });
    const before = past();
    store.removeNode('a');

    let s = useDiagramStore.getState();
    expect(s.nodes.map((n) => n.id)).toEqual(['b']);
    expect(s.edges).toEqual([]);
    expect(s.params['a']).toBeUndefined();
    expect(past()).toBe(before + 1);

    useDiagramStore.getState().undo();
    s = useDiagramStore.getState();
    expect(s.nodes.map((n) => n.id).sort()).toEqual(['a', 'b']);
    expect(s.edges).toHaveLength(1);
    expect(s.edges[0].id).toBe('e1');
    expect(s.params['a']).toEqual({ value: 9 });
  });

  it('undo() clears selectedBlockId so the panel never points at a ghost node', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('a', 0, 0)]);
    store.selectBlock('a');
    expect(useDiagramStore.getState().selectedBlockId).toBe('a');
    useDiagramStore.getState().undo();
    expect(useDiagramStore.getState().selectedBlockId).toBeNull();
  });

  it('history is bounded at 100 entries (oldest dropped)', () => {
    const store = useDiagramStore.getState();
    for (let i = 1; i <= 120; i++) {
      store.updateParams('g', { [`k${i}`]: i });
    }
    const s = useDiagramStore.getState();
    expect(s.past).toHaveLength(100);
    expect(s.canUndo).toBe(true);
    for (let i = 0; i < 100; i++) useDiagramStore.getState().undo();
    // The oldest 20 edits were trimmed, so params keeps k1..k20 after 100 undos.
    expect(Object.keys(useDiagramStore.getState().params['g'] ?? {})).toHaveLength(20);
    expect(useDiagramStore.getState().canUndo).toBe(false);
  });

  it('clear() resets document and history', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('a', 0, 0)]);
    store.updateParams('a', { value: 1 });
    useDiagramStore.getState().clear();
    const s = useDiagramStore.getState();
    expect(s.nodes).toEqual([]);
    expect(s.params).toEqual({});
    expect(s.past).toEqual([]);
    expect(s.future).toEqual([]);
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
  });

  it('clearHistory() resets history but keeps the document (baseline for model loads)', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('a', 0, 0)]);
    store.updateParams('a', { value: 7 });
    useDiagramStore.getState().clearHistory();
    const s = useDiagramStore.getState();
    expect(s.nodes).toHaveLength(1);
    expect(s.params['a']).toEqual({ value: 7 });
    expect(s.past).toEqual([]);
    expect(s.canUndo).toBe(false);
    useDiagramStore.getState().undo(); // no-op
    expect(s.nodes).toHaveLength(1);
  });

  it('never persists history to localStorage (partialize keeps it out)', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('a', 0, 0)]);
    store.updateParams('a', { value: 2 });
    store.setEdges([]);
    useDiagramStore.getState().undo();
    useDiagramStore.getState().redo();
    const raw = localStorage.getItem('openblocksim-store');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as { state: Record<string, unknown> };
    expect(Object.keys(parsed.state).sort()).toEqual(['edges', 'groups', 'nodes', 'params', 'simConfig', 'theme']);
  });
});
