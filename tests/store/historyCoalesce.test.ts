import { describe, it, expect, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import { useDiagramStore } from '../../src/store/diagramStore';

function srcNode(id: string, x: number, y: number): Node {
  return { id, type: 'Source', position: { x, y }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } };
}

const past = () => useDiagramStore.getState().past.length;
const future = () => useDiagramStore.getState().future.length;
const topPast = () => useDiagramStore.getState().past[useDiagramStore.getState().past.length - 1];

describe('diagramStore history coalescing', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
  });

  it('merges consecutive updateParams to the same block+param into one entry', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('g1', 0, 0)]);            // entry 1
    store.updateParams('g1', { gain: 1 });            // entry 2 (typing run start)
    store.updateParams('g1', { gain: 2 });            // merged into entry 2
    store.updateParams('g1', { gain: 3 });            // merged into entry 2
    expect(past()).toBe(2);                           // typing run collapsed into entry 2
    expect(topPast()!.before.params['g1']).toBeUndefined(); // state before the run (no g1 yet)
    expect(topPast()!.after.params['g1']).toEqual({ gain: 3 });

    useDiagramStore.getState().undo();                // one undo reverts the whole run
    expect(useDiagramStore.getState().params['g1']).toBeUndefined();
    useDiagramStore.getState().undo();
    expect(useDiagramStore.getState().nodes).toEqual([]);
  });

  it('a different param key (or block) breaks the merge into a new entry', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('g1', 0, 0)]);
    store.updateParams('g1', { a: 1 });
    store.updateParams('g1', { a: 2 });               // merges with previous
    store.updateParams('g1', { b: 5 });               // different key set → new entry
    store.updateParams('g2', { c: 1 });               // different block → new entry
    expect(past()).toBe(4);
  });

  it('beginCoalesce/endCoalesce collapse a node-drag stream to one entry (first and last position)', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('a', 0, 0)]);             // baseline entry
    expect(past()).toBe(1);

    store.beginCoalesce();
    store.setNodes([srcNode('a', 1, 1)]);             // intermediate drag frames — absorbed
    store.setNodes([srcNode('a', 2, 2)]);
    store.setNodes([srcNode('a', 3, 3)]);
    store.setNodes([srcNode('a', 40, 40)]);           // final drag frame
    expect(past()).toBe(1);                           // nothing recorded mid-window
    store.endCoalesce();

    expect(past()).toBe(2);
    const e = topPast()!;
    expect(e.before.nodes[0].position).toEqual({ x: 0, y: 0 });   // pre-drag
    expect(e.after.nodes[0].position).toEqual({ x: 40, y: 40 });  // post-drag

    useDiagramStore.getState().undo();
    expect(useDiagramStore.getState().nodes[0].position).toEqual({ x: 0, y: 0 });
    useDiagramStore.getState().redo();
    expect(useDiagramStore.getState().nodes[0].position).toEqual({ x: 40, y: 40 });
  });

  it('a drag that returns to the start position records nothing (sameDoc skip)', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('a', 0, 0)]);
    store.beginCoalesce();
    store.setNodes([srcNode('a', 5, 5)]);
    store.setNodes([srcNode('a', 0, 0)]);             // back where it started
    store.endCoalesce();
    expect(past()).toBe(1);                           // no new entry
  });

  it('begin/end with no effective mutation records nothing', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('a', 0, 0)]);
    store.beginCoalesce();
    store.endCoalesce();
    expect(past()).toBe(1);
    expect(future()).toBe(0);
  });

  it('window can span mixed mutation kinds (generic transaction seam for G/H ops)', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('a', 0, 0)]);
    const before = past();
    store.beginCoalesce();
    store.updateParams('a', { value: 2 });
    store.setNodes([srcNode('a', 10, 10)]);
    store.endCoalesce();
    expect(past()).toBe(before + 1);
    const e = topPast()!;
    expect(e.after.nodes[0].position).toEqual({ x: 10, y: 10 });
    expect(e.after.params['a']).toEqual({ value: 2 });
    useDiagramStore.getState().undo();
    const s = useDiagramStore.getState();
    expect(s.nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(s.params['a']).toBeUndefined();
  });

  it('undo()/redo() discard an open coalesce window without committing it', () => {
    const store = useDiagramStore.getState();
    store.setNodes([srcNode('a', 0, 0)]);             // entry 1
    store.beginCoalesce();
    store.setNodes([srcNode('a', 5, 5)]);             // would-be entry 2 (still open)
    useDiagramStore.getState().undo();                // force-closes window, discards the move
    expect(past()).toBe(0);
    expect(useDiagramStore.getState().nodes).toEqual([]);
    useDiagramStore.getState().redo();
    expect(useDiagramStore.getState().nodes).toEqual([expect.objectContaining({ id: 'a', position: { x: 0, y: 0 } })]);
    expect(future()).toBe(0);
  });
});
