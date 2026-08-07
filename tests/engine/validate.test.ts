import { describe, it, expect } from 'vitest';
import { validateGraph } from '../../src/engine/validate';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType, BlockCategory } from '../../src/blocks/types';
import { Integrator } from '../../src/blocks/linear/Integrator';
import { Gain } from '../../src/blocks/math/Gain';
import { Constant } from '../../src/blocks/sources/Constant';
import { Scope } from '../../src/blocks/sinks/Scope';

function makeRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(BlockType.Constant, Constant);
  r.register(BlockType.Gain, Gain);
  r.register(BlockType.Integrator, Integrator);
  r.register(BlockType.Scope, Scope);
  return r;
}

describe('validateGraph', () => {
  it('passes valid graph: Constant → Gain → Scope', () => {
    const registry = makeRegistry();
    const graph = {
      blocks: [
        { id: 'c1', type: BlockType.Constant, params: {}, position: { x: 0, y: 0 } },
        { id: 'g1', type: BlockType.Gain, params: { gain: 2 }, position: { x: 100, y: 0 } },
        { id: 's1', type: BlockType.Scope, params: {}, position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'c1', sourcePort: 0, target: 'g1', targetPort: 0 },
        { id: 'e2', source: 'g1', sourcePort: 0, target: 's1', targetPort: 0 },
      ],
    };
    const result = validateGraph(graph, registry);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects algebraic loop: Gain → Gain → Gain (no integrator)', () => {
    const registry = makeRegistry();
    const graph = {
      blocks: [
        { id: 'g1', type: BlockType.Gain, params: { gain: 2 }, position: { x: 0, y: 0 } },
        { id: 'g2', type: BlockType.Gain, params: { gain: 2 }, position: { x: 100, y: 0 } },
        { id: 'g3', type: BlockType.Gain, params: { gain: 2 }, position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'g1', sourcePort: 0, target: 'g2', targetPort: 0 },
        { id: 'e2', source: 'g2', sourcePort: 0, target: 'g3', targetPort: 0 },
        { id: 'e3', source: 'g3', sourcePort: 0, target: 'g1', targetPort: 0 },
      ],
    };
    const result = validateGraph(graph, registry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Algebraic loop'))).toBe(true);
  });

  it('allows loop broken by Integrator', () => {
    const registry = makeRegistry();
    const graph = {
      blocks: [
        { id: 'g1', type: BlockType.Gain, params: { gain: 2 }, position: { x: 0, y: 0 } },
        { id: 'i1', type: BlockType.Integrator, params: {}, position: { x: 100, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'g1', sourcePort: 0, target: 'i1', targetPort: 0 },
        { id: 'e2', source: 'i1', sourcePort: 0, target: 'g1', targetPort: 0 },
      ],
    };
    const result = validateGraph(graph, registry);
    expect(result.valid).toBe(true);
  });

  it('warns on disconnected inputs', () => {
    const registry = makeRegistry();
    const graph = {
      blocks: [
        { id: 'g1', type: BlockType.Gain, params: { gain: 2 }, position: { x: 0, y: 0 } },
        { id: 's1', type: BlockType.Scope, params: {}, position: { x: 100, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'g1', sourcePort: 0, target: 's1', targetPort: 0 },
      ],
    };
    const result = validateGraph(graph, registry);
    expect(result.warnings.some(w => w.includes('unwired'))).toBe(true);
  });
});