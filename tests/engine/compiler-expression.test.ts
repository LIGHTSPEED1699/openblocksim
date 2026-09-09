import { describe, it, expect } from 'vitest';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { Step } from '../../src/blocks/sources/Step';
import { Gain } from '../../src/blocks/math/Gain';
import { Scope } from '../../src/blocks/sinks/Scope';
import { compileGraph } from '../../src/engine/compiler';
import { solve } from '../../src/engine/solver';
import type { SerializedGraph } from '../../src/engine/types';

function registry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(BlockType.Step, Step);
  r.register(BlockType.Gain, Gain);
  r.register(BlockType.Scope, Scope);
  return r;
}

describe('expression params in compileGraph', () => {
  it('resolves stepValue "=2*stepTime" and the scope output reaches 2', () => {
    const graph: SerializedGraph = {
      blocks: [
        { id: 'step', type: BlockType.Step, params: { stepTime: 1, stepValue: '=2*stepTime' }, position: { x: 0, y: 0 } },
        { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 100, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'step', sourcePort: 0, target: 'scope', targetPort: 0 }],
    };
    const model = compileGraph(graph, registry(), 0.01);
    const result = solve(model, { dt: 0.01, duration: 10 }, new Array(model.stateSize).fill(0));
    const trace = result.scopes['scope'];
    expect(trace.length).toBeGreaterThan(100);
    expect(trace[trace.length - 1]).toBeCloseTo(2, 6); // step fired at t=1 → value 2 holds
  });

  it('leaves a Gain param that is a plain number unchanged', () => {
    const graph: SerializedGraph = {
      blocks: [
        { id: 'src', type: BlockType.Step, params: { stepTime: 0, stepValue: 1 }, position: { x: 0, y: 0 } },
        { id: 'g', type: BlockType.Gain, params: { gain: 5 }, position: { x: 100, y: 0 } },
        { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'src', sourcePort: 0, target: 'g', targetPort: 0 },
        { id: 'e2', source: 'g', sourcePort: 0, target: 'scope', targetPort: 0 },
      ],
    };
    const model = compileGraph(graph, registry(), 0.01);
    const result = solve(model, { dt: 0.01, duration: 1 }, new Array(model.stateSize).fill(0));
    expect(result.scopes['scope'][result.scopes['scope'].length - 1]).toBeCloseTo(5, 6);
  });

  it('throws a descriptive error naming the block and param for an unknown symbol', () => {
    const graph: SerializedGraph = {
      blocks: [
        { id: 'g1', type: BlockType.Gain, params: { gain: '=Kp*2' }, position: { x: 0, y: 0 } },
        { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 100, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'g1', sourcePort: 0, target: 'scope', targetPort: 0 }],
    };
    expect(() => compileGraph(graph, registry(), 0.01)).toThrow(
      /Cannot resolve expression parameter "gain" on block "g1"/,
    );
  });
});
