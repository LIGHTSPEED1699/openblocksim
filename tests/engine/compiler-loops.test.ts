import { describe, it, expect } from 'vitest';
import { compileGraph } from '../../src/engine/compiler';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { Constant } from '../../src/blocks/sources/Constant';
import { Gain } from '../../src/blocks/math/Gain';
import { Sum } from '../../src/blocks/math/Sum';
import { Integrator } from '../../src/blocks/linear/Integrator';
import { Scope } from '../../src/blocks/sinks/Scope';

function makeRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(BlockType.Constant, Constant);
  r.register(BlockType.Gain, Gain);
  r.register(BlockType.Sum, Sum);
  r.register(BlockType.Integrator, Integrator);
  r.register(BlockType.Scope, Scope);
  return r;
}

// Constant → Sum → Gain → (feedback to Sum) — no dynamic block in the loop
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

// Constant → Sum → Integrator → (feedback to Sum) — Integrator breaks the algebraic dependency
const integratorFeedbackGraph = {
  blocks: [
    { id: 'const', type: BlockType.Constant, params: { value: 1 }, position: { x: 0, y: 0 } },
    { id: 'sum', type: BlockType.Sum, params: { signs: [1, -1] }, position: { x: 100, y: 0 } },
    { id: 'integ', type: BlockType.Integrator, params: {}, position: { x: 200, y: 0 } },
    { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 300, y: 0 } },
  ],
  edges: [
    { id: 'e1', source: 'const', sourcePort: 0, target: 'sum', targetPort: 0 },
    { id: 'e2', source: 'sum', sourcePort: 0, target: 'integ', targetPort: 0 },
    { id: 'e3', source: 'integ', sourcePort: 0, target: 'sum', targetPort: 1 },
    { id: 'e4', source: 'integ', sourcePort: 0, target: 'scope', targetPort: 0 },
  ],
};

describe('Compiler loop classification', () => {
  it('classifies a Gain-only feedback loop as algebraic', () => {
    const registry = makeRegistry();
    const model = compileGraph(gainFeedbackGraph as any, registry, 0.01);
    expect(model.algebraicLoops).toBeDefined();
    expect(model.algebraicLoops!.length).toBe(1);
    expect(model.dynamicLoops).toBeDefined();
    expect(model.dynamicLoops!.length).toBe(0);
  });

  it('classifies an Integrator feedback loop as dynamic', () => {
    const registry = makeRegistry();
    const model = compileGraph(integratorFeedbackGraph as any, registry, 0.01);
    expect(model.dynamicLoops).toBeDefined();
    expect(model.dynamicLoops!.length).toBe(1);
    expect(model.algebraicLoops!.length).toBe(0);
  });
});