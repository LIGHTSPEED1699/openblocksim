import { describe, it, expect } from 'vitest';
import { compileGraph } from '../../src/engine/compiler';
import { solve, solveAdaptive } from '../../src/engine/solver';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { Ramp } from '../../src/blocks/sources/Ramp';
import { Constant } from '../../src/blocks/sources/Constant';
import { UnitDelay } from '../../src/blocks/discrete/UnitDelay';
import { DiscreteTransferFcn } from '../../src/blocks/discrete/DiscreteTransferFcn';
import { Scope } from '../../src/blocks/sinks/Scope';

function makeRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(BlockType.Ramp, Ramp);
  r.register(BlockType.Constant, Constant);
  r.register(BlockType.UnitDelay, UnitDelay);
  r.register(BlockType.DiscreteTransferFcn, DiscreteTransferFcn);
  r.register(BlockType.Scope, Scope);
  return r;
}

// Ramp(t) → UnitDelay(sampleTime 0.1) → Scope
function discreteSamplerGraph(sampleTime = 0.1) {
  return {
    blocks: [
      { id: 'ramp', type: BlockType.Ramp, params: { slope: 1 }, position: { x: 0, y: 0 } },
      { id: 'ud', type: BlockType.UnitDelay, params: { sampleTime }, position: { x: 100, y: 0 } },
      { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'ramp', sourcePort: 0, target: 'ud', targetPort: 0 },
      { id: 'e2', source: 'ud', sourcePort: 0, target: 'scope', targetPort: 0 },
    ],
  };
}

// DiscreteTransferFcn H(z) = 1/(1 - 0.5 z^-1) sampling a constant input.
function discreteFirGraph() {
  return {
    blocks: [
      { id: 'c', type: BlockType.Constant, params: { value: 1 }, position: { x: 0, y: 0 } },
      { id: 'dtf', type: BlockType.DiscreteTransferFcn, params: { num: [1], den: [1, -0.5], sampleTime: 0.1 }, position: { x: 100, y: 0 } },
      { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'c', sourcePort: 0, target: 'dtf', targetPort: 0 },
      { id: 'e2', source: 'dtf', sourcePort: 0, target: 'scope', targetPort: 0 },
    ],
  };
}

describe('Sample-boundary scheduling', () => {
  it('registers periodic sample-time events for discrete blocks with sampleTime', () => {
    const model = compileGraph(discreteSamplerGraph(0.1), makeRegistry(), 0.01);
    expect(model.events).toBeDefined();
    expect(model.events!.length).toBeGreaterThan(0);
  });

  it('does not register sample events when sampleTime is 0 (continuous default)', () => {
    const model = compileGraph(discreteSamplerGraph(0), makeRegistry(), 0.01);
    expect(model.events!.length).toBe(0);
  });

  it('reports sample times in crossingTimes under the adaptive solver', () => {
    const model = compileGraph(discreteSamplerGraph(0.1), makeRegistry(), 0.01);
    const res = solveAdaptive(model, { dt: 0.01, duration: 0.5, rtol: 1e-4, atol: 1e-6 }, new Array(model.stateSize).fill(0));
    expect(res.crossingTimes).toBeDefined();
    expect(res.crossingTimes!.some((t) => Math.abs(t - 0.1) < 0.01)).toBe(true);
  });

  it('updates a discrete block exactly at its sample time and holds between', () => {
    // Ramp slope 1, sample time 0.1: output steps 0.0, 0.1, 0.2, ... with no
    // change at sub-sample grid points.
    const model = compileGraph(discreteSamplerGraph(0.1), makeRegistry(), 0.01);
    const res = solve(model, { dt: 0.01, duration: 0.5 }, new Array(model.stateSize).fill(0));
    const trace = res.scopes['scope'];
    const idx = (t: number) => Math.round(t / 0.01);
    expect(trace[idx(0.05)]).toBeCloseTo(0, 6);  // holds 0 between 0 and 0.1
    expect(trace[idx(0.09)]).toBeCloseTo(0, 6);
    expect(trace[idx(0.1)]).toBeCloseTo(0.1, 6); // sampled at t=0.1
    expect(trace[idx(0.15)]).toBeCloseTo(0.1, 6); // holds 0.1
    expect(trace[idx(0.19)]).toBeCloseTo(0.1, 6);
    expect(trace[idx(0.2)]).toBeCloseTo(0.2, 6);
  });

  it('runs a discrete transfer function recurrence only at sample times', () => {
    // y[k] = 1 + 0.5*y[k-1], y[-1]=0. Output is held flat between sample
    // times and advances only at t = 0.1, 0.2, ... (one sample late start,
    // matching the engine's update-then-capture ordering for absolute blocks).
    const model = compileGraph(discreteFirGraph(), makeRegistry(), 0.01);
    const res = solve(model, { dt: 0.01, duration: 0.5 }, new Array(model.stateSize).fill(0));
    const trace = res.scopes['scope'];
    const idx = (t: number) => Math.round(t / 0.01);
    expect(trace[idx(0.05)]).toBeCloseTo(0, 5);
    expect(trace[idx(0.09)]).toBeCloseTo(0, 5);
    expect(trace[idx(0.11)]).toBeCloseTo(1, 5);  // y=1 held after the 0.1 sample
    expect(trace[idx(0.15)]).toBeCloseTo(1, 5);
    expect(trace[idx(0.19)]).toBeCloseTo(1, 5);
    expect(trace[idx(0.21)]).toBeCloseTo(1.5, 5); // y=1.5 held after the 0.2 sample
    expect(trace[idx(0.25)]).toBeCloseTo(1.5, 5);
  });
});
