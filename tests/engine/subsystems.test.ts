import { describe, it, expect } from 'vitest';
import type { SerializedGraph, SerializedBlock } from '../../src/engine/types';
import { BlockType } from '../../src/blocks/types';
import { flattenGraph, subsystemPortCounts } from '../../src/engine/subsystems';

// Cast helper: G2-T1 runs before the Inport/Outport/Subsystem enum values land
// (G2-T2), so fixtures use raw strings.
const t = (type: string) => type as unknown as BlockType;

const b = (id: string, type: string, params: Record<string, number | number[] | string> = {}, position = { x: 0, y: 0 }): SerializedBlock =>
  ({ id, type: t(type), params, position });

// Inner graph: one Gain(2) between Inport 0 and Outport 0.
const gainInner: SerializedGraph = {
  blocks: [
    b('ip0', 'Inport', { port: 0 }),
    b('gain', 'Gain', { gain: 2 }),
    b('op0', 'Outport', { port: 0 }),
  ],
  edges: [
    { id: 'e-ip', source: 'ip0', sourcePort: 0, target: 'gain', targetPort: 0 },
    { id: 'e-op', source: 'gain', sourcePort: 0, target: 'op0', targetPort: 0 },
  ],
};

describe('subsystemPortCounts', () => {
  it('counts ports from Inport/Outport port params', () => {
    expect(subsystemPortCounts(gainInner)).toEqual({ inputs: 1, outputs: 1 });
    expect(subsystemPortCounts({ blocks: [], edges: [] })).toEqual({ inputs: 0, outputs: 0 });
  });
});

describe('flattenGraph', () => {
  it('passes graphs without subsystems through unchanged', () => {
    const flat = { blocks: [b('c1', 'Constant', { value: 1 })], edges: [] };
    expect(flattenGraph(flat)).toEqual(flat);
  });

  it('splices a Constant → Subsystem(gain) → Scope into the equivalent flat graph', () => {
    const graph: SerializedGraph = {
      blocks: [
        b('c1', 'Constant', { value: 3 }, { x: 0, y: 0 }),
        b('sub1', 'Subsystem', { subsystem: JSON.stringify(gainInner) }, { x: 200, y: 0 }),
        b('sc1', 'Scope', {}, { x: 500, y: 0 }),
      ],
      edges: [
        { id: 'e1', source: 'c1', sourcePort: 0, target: 'sub1', targetPort: 0 },
        { id: 'e2', source: 'sub1', sourcePort: 0, target: 'sc1', targetPort: 0 },
      ],
    };
    const flat = flattenGraph(graph);
    const types = Object.fromEntries(flat.blocks.map((x) => [x.id, x.type]));
    expect(types).toEqual({ c1: t('Constant'), 'sub1::gain': t('Gain'), sc1: t('Scope') });
    expect(flat.edges).toEqual([
      { id: 'e1', source: 'c1', sourcePort: 0, target: 'sub1::gain', targetPort: 0 },
      { id: 'e2', source: 'sub1::gain', sourcePort: 0, target: 'sc1', targetPort: 0 },
    ]);
    expect((flat.blocks.find((x) => x.id === 'sub1::gain')!.params as any).gain).toBe(2);
  });

  it('flattening is idempotent', () => {
    const graph: SerializedGraph = {
      blocks: [b('c1', 'Constant', { value: 1 }), b('sub1', 'Subsystem', { subsystem: JSON.stringify(gainInner) })],
      edges: [{ id: 'e1', source: 'c1', sourcePort: 0, target: 'sub1', targetPort: 0 }],
    };
    const once = flattenGraph(graph);
    expect(flattenGraph(once)).toEqual(once);
  });

  it('throws when a wired subsystem input has no inner consumer', () => {
    const broken = { blocks: [b('ip0', 'Inport', { port: 0 })], edges: [] };
    const graph: SerializedGraph = {
      blocks: [b('c1', 'Constant'), b('sub1', 'Subsystem', { subsystem: JSON.stringify(broken) })],
      edges: [{ id: 'e1', source: 'c1', sourcePort: 0, target: 'sub1', targetPort: 0 }],
    };
    expect(() => flattenGraph(graph)).toThrow(/sub1/);
  });

  it('throws on forbidden sink blocks inside a subsystem', () => {
    const inner: SerializedGraph = { blocks: [b('sc', 'Scope')], edges: [] };
    const graph: SerializedGraph = {
      blocks: [b('sub1', 'Subsystem', { subsystem: JSON.stringify(inner) })],
      edges: [],
    };
    expect(() => flattenGraph(graph)).toThrow(/Scope/);
  });

  it('throws on missing inner diagram JSON', () => {
    const graph: SerializedGraph = { blocks: [b('sub1', 'Subsystem', {})], edges: [] };
    expect(() => flattenGraph(graph)).toThrow(/inner diagram/);
  });

  it('flattens nested subsystems (subsystem inside subsystem)', () => {
    const nested: SerializedGraph = {
      blocks: [b('n1', 'Gain', { gain: 3 })],
      edges: [],
    };
    // inner of the outer subsystem contains its own Subsystem block 'innerSub'
    const mid = (): SerializedGraph => ({
      blocks: [b('ip0', 'Inport', { port: 0 }), b('innerSub', 'Subsystem', { subsystem: JSON.stringify(nested) }), b('op0', 'Outport', { port: 0 })],
      edges: [
        { id: 'a', source: 'ip0', sourcePort: 0, target: 'innerSub', targetPort: 0 },
        { id: 'z', source: 'innerSub', sourcePort: 0, target: 'op0', targetPort: 0 },
      ],
    });
    const graph: SerializedGraph = {
      blocks: [
        b('c1', 'Constant', { value: 1 }),
        b('outer', 'Subsystem', { subsystem: JSON.stringify(mid()) }),
        b('sc1', 'Scope'),
      ],
      edges: [
        { id: 'e1', source: 'c1', sourcePort: 0, target: 'outer', targetPort: 0 },
        { id: 'e2', source: 'outer', sourcePort: 0, target: 'sc1', targetPort: 0 },
      ],
    };
    const flat = flattenGraph(graph);
    const ids = flat.blocks.map((x) => x.id).sort();
    expect(ids).toEqual(['c1', 'outer::innerSub::n1', 'sc1']);
    expect(flat.edges).toEqual([
      { id: 'e1', source: 'c1', sourcePort: 0, target: 'outer::innerSub::n1', targetPort: 0 },
      { id: 'e2', source: 'outer::innerSub::n1', sourcePort: 0, target: 'sc1', targetPort: 0 },
    ]);
  });

  it('throws on a subsystem output that nothing produces', () => {
    const inner: SerializedGraph = { blocks: [b('ip0', 'Inport', { port: 0 }), b('op0', 'Outport', { port: 0 })], edges: [] };
    const graph: SerializedGraph = {
      blocks: [b('sub1', 'Subsystem', { subsystem: JSON.stringify(inner) })],
      edges: [{ id: 'e2', source: 'sub1', sourcePort: 0, target: 'sc1', targetPort: 0 }],
    };
    // sc1 block missing on purpose → flatten must throw about output port 0 BEFORE id checks
    expect(() => flattenGraph(graph)).toThrow(/output port 0/);
  });
});
