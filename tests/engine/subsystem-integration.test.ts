import { describe, it, expect } from 'vitest';
import { compileGraph } from '../../src/engine/compiler';
import { solve } from '../../src/engine/solver';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType, Params } from '../../src/blocks/types';
import { Constant } from '../../src/blocks/sources/Constant';
import { Gain } from '../../src/blocks/math/Gain';
import { Integrator } from '../../src/blocks/linear/Integrator';
import { Scope } from '../../src/blocks/sinks/Scope';
import type { SerializedGraph } from '../../src/engine/types';

function registry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(BlockType.Constant, Constant);
  r.register(BlockType.Gain, Gain);
  r.register(BlockType.Integrator, Integrator);
  r.register(BlockType.Scope, Scope);
  return r;
}

function runFlat(graph: SerializedGraph): { last: number; steps: number } {
  const model = compileGraph(graph, registry(), 0.01);
  const res = solve(model, { dt: 0.01, duration: 2 }, new Array(model.stateSize).fill(0));
  const scope = res.scopes[graph.blocks.find((b) => b.type === BlockType.Scope)!.id];
  return { last: scope[scope.length - 1], steps: scope.length };
}

const block = (id: string, type: BlockType, params: Params = {}, position = { x: 0, y: 0 }) =>
  ({ id, type, params, position });

describe('subsystem simulation equivalence', () => {
  it('Constant → Subsystem(Gain×3) → Scope matches the flat Constant → Gain → Scope traces', () => {
    // flat reference
    const flat: SerializedGraph = {
      blocks: [
        block('c', BlockType.Constant, { value: 2 }),
        block('g', BlockType.Gain, { gain: 3 }),
        block('s', BlockType.Scope),
      ],
      edges: [
        { id: 'e1', source: 'c', sourcePort: 0, target: 'g', targetPort: 0 },
        { id: 'e2', source: 'g', sourcePort: 0, target: 's', targetPort: 0 },
      ],
    };
    const inner: SerializedGraph = {
      blocks: [
        block('ip0', BlockType.Inport, { port: 0 }),
        block('g', BlockType.Gain, { gain: 3 }),
        block('op0', BlockType.Outport, { port: 0 }),
      ],
      edges: [
        { id: 'a', source: 'ip0', sourcePort: 0, target: 'g', targetPort: 0 },
        { id: 'b', source: 'g', sourcePort: 0, target: 'op0', targetPort: 0 },
      ],
    };
    const withSub: SerializedGraph = {
      blocks: [
        block('c', BlockType.Constant, { value: 2 }),
        block('sub', BlockType.Subsystem, { subsystem: JSON.stringify(inner) }),
        block('s', BlockType.Scope),
      ],
      edges: [
        { id: 'e1', source: 'c', sourcePort: 0, target: 'sub', targetPort: 0 },
        { id: 'e2', source: 'sub', sourcePort: 0, target: 's', targetPort: 0 },
      ],
    };
    const flatRes = runFlat(flat);
    const subRes = runFlat(withSub);
    expect(flatRes.last).toBeCloseTo(6, 5);
    expect(subRes.last).toBeCloseTo(flatRes.last, 5);
    expect(subRes.steps).toBe(flatRes.steps);
  });

  it('a subsystem containing an Integrator behaves dynamically (matches flat integrator model)', () => {
    // y = ∫ 2 dt over [0,2] at dt=0.01 → ~4
    const inner: SerializedGraph = {
      blocks: [
        block('ip0', BlockType.Inport, { port: 0 }),
        block('i', BlockType.Integrator, { initialValue: 0 }),
        block('op0', BlockType.Outport, { port: 0 }),
      ],
      edges: [
        { id: 'a', source: 'ip0', sourcePort: 0, target: 'i', targetPort: 0 },
        { id: 'b', source: 'i', sourcePort: 0, target: 'op0', targetPort: 0 },
      ],
    };
    const graph: SerializedGraph = {
      blocks: [
        block('c', BlockType.Constant, { value: 2 }),
        block('sub', BlockType.Subsystem, { subsystem: JSON.stringify(inner) }),
        block('s', BlockType.Scope),
      ],
      edges: [
        { id: 'e1', source: 'c', sourcePort: 0, target: 'sub', targetPort: 0 },
        { id: 'e2', source: 'sub', sourcePort: 0, target: 's', targetPort: 0 },
      ],
    };
    const res = runFlat(graph);
    expect(res.last).toBeCloseTo(4, 1);
  });

  it('inner dynamic blocks contribute to the compiled model state size', () => {
    const inner: SerializedGraph = {
      blocks: [
        block('ip0', BlockType.Inport, { port: 0 }),
        block('i', BlockType.Integrator, { initialValue: 0 }),
        block('op0', BlockType.Outport, { port: 0 }),
      ],
      edges: [
        { id: 'a', source: 'ip0', sourcePort: 0, target: 'i', targetPort: 0 },
        { id: 'b', source: 'i', sourcePort: 0, target: 'op0', targetPort: 0 },
      ],
    };
    const graph: SerializedGraph = {
      blocks: [
        block('c', BlockType.Constant, { value: 1 }),
        block('sub', BlockType.Subsystem, { subsystem: JSON.stringify(inner) }),
        block('s', BlockType.Scope),
      ],
      edges: [
        { id: 'e1', source: 'c', sourcePort: 0, target: 'sub', targetPort: 0 },
        { id: 'e2', source: 'sub', sourcePort: 0, target: 's', targetPort: 0 },
      ],
    };
    const model = compileGraph(graph, registry(), 0.01);
    expect(model.stateSize).toBe(1); // the inner Integrator
    expect(model.blockOrder).toContain('sub::i');
  });
});
