import { describe, it, expect } from 'vitest';
import { compileGraph } from '../../src/engine/compiler';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { Constant } from '../../src/blocks/sources/Constant';
import { Gain } from '../../src/blocks/math/Gain';
import { Integrator } from '../../src/blocks/linear/Integrator';
import { Scope } from '../../src/blocks/sinks/Scope';
import { Step } from '../../src/blocks/sources/Step';

function makeRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(BlockType.Constant, Constant);
  r.register(BlockType.Step, Step);
  r.register(BlockType.Gain, Gain);
  r.register(BlockType.Integrator, Integrator);
  r.register(BlockType.Scope, Scope);
  return r;
}

describe('compileGraph', () => {
  it('compiles Constant → Scope graph', () => {
    const registry = makeRegistry();
    const graph = {
      blocks: [
        { id: 'c1', type: BlockType.Constant, params: { value: 5 }, position: { x: 0, y: 0 } },
        { id: 's1', type: BlockType.Scope, params: {}, position: { x: 100, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'c1', sourcePort: 0, target: 's1', targetPort: 0 },
      ],
    };
    const model = compileGraph(graph, registry, 0.01);
    expect(model.stateSize).toBe(0);
    expect(model.scopeBlockIds).toContain('s1');
    const stateDot = model.f(0, []);
    expect(stateDot).toHaveLength(0);
  });

  it('compiles Step → Integrator → Scope with correct stateSize', () => {
    const registry = makeRegistry();
    const graph = {
      blocks: [
        { id: 'st1', type: BlockType.Step, params: { stepTime: 1, stepValue: 1 }, position: { x: 0, y: 0 } },
        { id: 'i1', type: BlockType.Integrator, params: {}, position: { x: 100, y: 0 } },
        { id: 's1', type: BlockType.Scope, params: {}, position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'st1', sourcePort: 0, target: 'i1', targetPort: 0 },
        { id: 'e2', source: 'i1', sourcePort: 0, target: 's1', targetPort: 0 },
      ],
    };
    const model = compileGraph(graph, registry, 0.01);
    expect(model.stateSize).toBe(1); // Integrator has 1 state
    // At t=0, step output=0, integrator state=0 → state_dot=0
    const stateDot = model.f(0, [0]);
    expect(stateDot[0]).toBeCloseTo(0, 5);
    // At t=1, step output=1, integrator state=0 → state_dot=1
    const stateDot2 = model.f(1, [0]);
    expect(stateDot2[0]).toBeCloseTo(1, 5);
  });
});