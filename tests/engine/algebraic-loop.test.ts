import { describe, it, expect } from 'vitest';
import { compileGraph } from '../../src/engine/compiler';
import { solve } from '../../src/engine/solver';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { Constant } from '../../src/blocks/sources/Constant';
import { Gain } from '../../src/blocks/math/Gain';
import { Sum } from '../../src/blocks/math/Sum';
import { Scope } from '../../src/blocks/sinks/Scope';

function makeRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(BlockType.Constant, Constant);
  r.register(BlockType.Gain, Gain);
  r.register(BlockType.Sum, Sum);
  r.register(BlockType.Scope, Scope);
  return r;
}

// y = u + K*y with u=1, K=0.5 -> y = 2 (algebraic loop, fixed point)
const gainFeedbackGraph = {
  blocks: [
    { id: 'const', type: BlockType.Constant, params: { value: 1 }, position: { x: 0, y: 0 } },
    { id: 'sum', type: BlockType.Sum, params: { signs: [1, 1] }, position: { x: 100, y: 0 } },
    { id: 'gain', type: BlockType.Gain, params: { gain: 0.5 }, position: { x: 200, y: 0 } },
    { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 300, y: 0 } },
  ],
  edges: [
    { id: 'e1', source: 'const', sourcePort: 0, target: 'sum', targetPort: 0 },
    { id: 'e2', source: 'sum', sourcePort: 0, target: 'gain', targetPort: 0 },
    { id: 'e3', source: 'gain', sourcePort: 0, target: 'sum', targetPort: 1 },
    { id: 'e4', source: 'sum', sourcePort: 0, target: 'scope', targetPort: 0 },
  ],
};

describe('Algebraic loop fixed-point solver', () => {
  it('converges a Gain-only feedback loop to the correct fixed point', () => {
    const registry = makeRegistry();
    const model = compileGraph(gainFeedbackGraph as any, registry, 0.01);
    const res = solve(model, { dt: 0.01, duration: 0.1 }, new Array(model.stateSize).fill(0));
    const trace = res.scopes['scope'];
    // y = u + K*y = 1 + 0.5*2 = 2
    expect(trace.at(-1)).toBeCloseTo(2, 4);
  });

  it('produces algebraicLoopSolver on the compiled model', () => {
    const registry = makeRegistry();
    const model = compileGraph(gainFeedbackGraph as any, registry, 0.01);
    expect(model.algebraicLoopSolver).toBeDefined();
    expect(model.algebraicLoops).toBeDefined();
    expect(model.algebraicLoops!.length).toBe(1);
  });
});