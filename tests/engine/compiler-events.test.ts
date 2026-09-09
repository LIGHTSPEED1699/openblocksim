import { describe, it, expect } from 'vitest';
import { compileGraph } from '../../src/engine/compiler';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { Constant } from '../../src/blocks/sources/Constant';
import { Ramp } from '../../src/blocks/sources/Ramp';
import { Relay } from '../../src/blocks/control/Relay';
import { Saturation } from '../../src/blocks/nonlinear/Saturation';
import { Deadzone } from '../../src/blocks/nonlinear/Deadzone';
import { Switch } from '../../src/blocks/routing/Switch';
import { Scope } from '../../src/blocks/sinks/Scope';

function makeRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(BlockType.Constant, Constant);
  r.register(BlockType.Ramp, Ramp);
  r.register(BlockType.Relay, Relay);
  r.register(BlockType.Saturation, Saturation);
  r.register(BlockType.Deadzone, Deadzone);
  r.register(BlockType.Switch, Switch);
  r.register(BlockType.Scope, Scope);
  return r;
}

describe('Compiler crossing events', () => {
  it('registers a crossing event for a Relay block', () => {
    const registry = makeRegistry();
    const graph = {
      blocks: [
        { id: 'ramp', type: BlockType.Ramp, params: { slope: 1 }, position: { x: 0, y: 0 } },
        { id: 'relay', type: BlockType.Relay, params: { switchOn: 0.5, switchOff: -0.5, onValue: 1, offValue: -1 }, position: { x: 100, y: 0 } },
        { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'ramp', sourcePort: 0, target: 'relay', targetPort: 0 },
        { id: 'e2', source: 'relay', sourcePort: 0, target: 'scope', targetPort: 0 },
      ],
    };
    const model = compileGraph(graph, registry, 0.01);
    expect(model.events).toBeDefined();
    expect(model.events!.length).toBeGreaterThan(0);
  });

  it('registers a crossing event for a Saturation block', () => {
    const registry = makeRegistry();
    const graph = {
      blocks: [
        { id: 'ramp', type: BlockType.Ramp, params: { slope: 2 }, position: { x: 0, y: 0 } },
        { id: 'sat', type: BlockType.Saturation, params: { lowerLimit: -1, upperLimit: 1 }, position: { x: 100, y: 0 } },
        { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'ramp', sourcePort: 0, target: 'sat', targetPort: 0 },
        { id: 'e2', source: 'sat', sourcePort: 0, target: 'scope', targetPort: 0 },
      ],
    };
    const model = compileGraph(graph, registry, 0.01);
    expect(model.events!.length).toBeGreaterThan(0);
  });
});