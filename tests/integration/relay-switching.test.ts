import { describe, it, expect } from 'vitest';
import { compileGraph } from '../../src/engine/compiler';
import { solveAdaptive } from '../../src/engine/solver';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { Ramp } from '../../src/blocks/sources/Ramp';
import { Relay } from '../../src/blocks/control/Relay';
import { Scope } from '../../src/blocks/sinks/Scope';

function makeRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(BlockType.Ramp, Ramp);
  r.register(BlockType.Relay, Relay);
  r.register(BlockType.Scope, Scope);
  return r;
}

const relayRampGraph = {
  blocks: [
    { id: 'ramp', type: BlockType.Ramp, params: { slope: 1, startTime: 0 }, position: { x: 0, y: 0 } },
    { id: 'relay', type: BlockType.Relay, params: { switchOn: 0.5, switchOff: -0.5, onValue: 1, offValue: -1 }, position: { x: 100, y: 0 } },
    { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 200, y: 0 } },
  ],
  edges: [
    { id: 'e1', source: 'ramp', sourcePort: 0, target: 'relay', targetPort: 0 },
    { id: 'e2', source: 'relay', sourcePort: 0, target: 'scope', targetPort: 0 },
  ],
};

describe('Relay switching time (integration)', () => {
  it('Relay switches at t=0.5 under adaptive solver', () => {
    const registry = makeRegistry();
    const model = compileGraph(relayRampGraph, registry, 0.01);
    const res = solveAdaptive(model, { dt: 0.01, duration: 1, rtol: 1e-6, atol: 1e-9 }, new Array(model.stateSize).fill(0));

    expect(res.crossingTimes).toBeDefined();
    expect(res.crossingTimes!.length).toBeGreaterThan(0);
    expect(res.crossingTimes![0]).toBeCloseTo(0.5, 4);

    // The relay output trace should show the switch: before 0.5 it is off (-1), after it is on (1)
    const relayTrace = res.scopes['scope'];
    expect(relayTrace).toBeDefined();
    const idx = res.time.findIndex((t) => t >= 0.5);
    expect(idx).toBeGreaterThan(0);
    expect(relayTrace[idx]).toBe(1);
  });
});