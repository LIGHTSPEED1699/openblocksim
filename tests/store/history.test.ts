import { describe, it, expect } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import { HISTORY_LIMIT, snapshotDoc, sameDoc, pushEntry, type DiagramDoc, type HistoryEntry } from '../../src/store/history';

function node(id: string, x: number, y: number, extra: Record<string, unknown> = {}): Node {
  return {
    id,
    type: 'Source',
    position: { x, y },
    data: { type: 'Constant', inputs: 0, outputs: 1, color: '', ...extra },
    selected: true,
    dragging: true,
    measured: { width: 100, height: 40 },
  } as Node;
}

function edge(id: string, source: string, target: string): Edge {
  return {
    id,
    type: 'straight',
    source,
    target,
    sourceHandle: 'out-0',
    targetHandle: 'in-0',
    data: { waypoints: [] },
    selected: true,
  } as Edge;
}

describe('history helpers', () => {
  it('snapshotDoc keeps only model fields (drops selected/dragging/measured)', () => {
    const n = node('a', 10, 20);
    const e = edge('e1', 'a', 'b');
    const params = { a: { value: 3 } };
    const doc = snapshotDoc([n], [e], params);
    expect(doc).toEqual({
      nodes: [{ id: 'a', type: 'Source', position: { x: 10, y: 20 }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } }],
      edges: [{ id: 'e1', type: 'straight', source: 'a', target: 'b', sourceHandle: 'out-0', targetHandle: 'in-0', data: { waypoints: [] } }],
      params: { a: { value: 3 } },
    });
    // Transient flags must not survive the snapshot
    expect(JSON.stringify(doc)).not.toContain('selected');
    expect(JSON.stringify(doc)).not.toContain('dragging');
    expect(JSON.stringify(doc)).not.toContain('measured');
  });

  it('snapshotDoc copies positions so later in-place mutation cannot corrupt history', () => {
    const n = node('a', 10, 20);
    const doc = snapshotDoc([n], [], {});
    (doc.nodes[0].position as { x: number }).x = 999; // mutate the snapshot copy
    expect(n.position).toEqual({ x: 10, y: 20 });
  });

  it('keeps waypoints inside edge data (feature H round-trips for free)', () => {
    const e = { id: 'e1', source: 'a', target: 'b', data: { waypoints: [{ x: 5, y: 5 }] } } as Edge;
    const doc = snapshotDoc([], [e], {});
    expect(doc.edges[0].data).toEqual({ waypoints: [{ x: 5, y: 5 }] });
  });

  it('sameDoc is true for equal documents and false when positions or params differ', () => {
    const a: DiagramDoc = snapshotDoc([node('a', 0, 0)], [], { a: { gain: 1 } });
    const same: DiagramDoc = snapshotDoc([node('a', 0, 0)], [], { a: { gain: 1 } });
    const moved: DiagramDoc = snapshotDoc([node('a', 5, 0)], [], { a: { gain: 1 } });
    const paramChanged: DiagramDoc = snapshotDoc([node('a', 0, 0)], [], { a: { gain: 2 } });
    expect(sameDoc(a, same)).toBe(true);
    expect(sameDoc(a, moved)).toBe(false);
    expect(sameDoc(a, paramChanged)).toBe(false);
  });

  it('pushEntry appends an entry and returns a new array', () => {
    const d0: DiagramDoc = { nodes: [], edges: [], params: {} };
    const d1: DiagramDoc = snapshotDoc([node('a', 0, 0)], [], {});
    const past: HistoryEntry[] = [];
    const next = pushEntry(past, { before: d0, after: d1 });
    expect(next).toHaveLength(1);
    expect(next).not.toBe(past);
    expect(next[0].before).toBe(d0);
    expect(next[0].after).toBe(d1);
  });

  it('pushEntry caps the stack at the limit, dropping the oldest entries', () => {
    const past: HistoryEntry[] = [];
    let last: HistoryEntry[] = past;
    for (let i = 0; i < 5; i++) {
      const before: DiagramDoc = { nodes: [], edges: [], params: { g: { k: i } } };
      const after: DiagramDoc = { nodes: [], edges: [], params: { g: { k: i + 1 } } };
      last = pushEntry(last, { before, after }, 3);
    }
    expect(last).toHaveLength(3);
    expect((last[0].before.params.g as { k: number }).k).toBe(2); // oldest two dropped
    expect((last[2].before.params.g as { k: number }).k).toBe(4);
  });

  it('exports HISTORY_LIMIT = 100 used as the default cap', () => {
    expect(HISTORY_LIMIT).toBe(100);
    const before: DiagramDoc = { nodes: [], edges: [], params: {} };
    const after: DiagramDoc = { nodes: [], edges: [], params: { g: { k: 1 } } };
    let past: HistoryEntry[] = [];
    for (let i = 0; i < 105; i++) {
      past = pushEntry(past, { before, after });
    }
    expect(past).toHaveLength(100);
  });
});
