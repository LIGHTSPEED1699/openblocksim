import { describe, it, expect } from 'vitest';
import { validateGraph } from '../../src/engine/validate';
import { compileGraph } from '../../src/engine/compiler';
import { solve } from '../../src/engine/solver';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { Step } from '../../src/blocks/sources/Step';
import { Scope } from '../../src/blocks/sinks/Scope';
import { Sum } from '../../src/blocks/math/Sum';
import { TransferFunction } from '../../src/blocks/linear/TransferFunction';
import { PID } from '../../src/blocks/control/PID';
import type { SerializedGraph } from '../../src/engine/types';

function createRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(BlockType.Step, Step);
  r.register(BlockType.Scope, Scope);
  r.register(BlockType.Sum, Sum);
  r.register(BlockType.TransferFunction, TransferFunction);
  r.register(BlockType.PID, PID);
  return r;
}

// Process: G(s) = 0.25(1-s) / (s(2s+1)) — drum level process with RHP zero
function makeModel(pidParams: Record<string, number>): SerializedGraph {
  return {
    blocks: [
      { id: 'Step', type: BlockType.Step, params: { stepTime: 2, stepValue: 5 }, position: { x: 190, y: 105 } },
      { id: 'TF', type: BlockType.TransferFunction, params: { num: [-0.25, 0.25], den: [2, 1, 0] }, position: { x: 569, y: 124 } },
      { id: 'Scope-Out', type: BlockType.Scope, params: {}, position: { x: 710, y: 124 } },
      { id: 'Scope-PID', type: BlockType.Scope, params: {}, position: { x: 599, y: 51 } },
      { id: 'Sum', type: BlockType.Sum, params: { signs: [1, -1] }, position: { x: 329, y: 111 } },
      { id: 'PID', type: BlockType.PID, params: pidParams, position: { x: 452, y: 124 } },
    ],
    edges: [
      { id: 'e1', source: 'TF', sourcePort: 0, target: 'Scope-Out', targetPort: 0 },
      { id: 'e2', source: 'Step', sourcePort: 0, target: 'Sum', targetPort: 0 },
      { id: 'e3', source: 'Sum', sourcePort: 0, target: 'PID', targetPort: 0 },
      { id: 'e4', source: 'TF', sourcePort: 0, target: 'Sum', targetPort: 1 },
      { id: 'e5', source: 'PID', sourcePort: 0, target: 'TF', targetPort: 0 },
      { id: 'e6', source: 'PID', sourcePort: 0, target: 'Scope-PID', targetPort: 0 },
      { id: 'e7', source: 'TF', sourcePort: 0, target: 'PID', targetPort: 1 },
    ],
  };
}

function runSim(graph: SerializedGraph, dt = 0.01, duration = 30) {
  const registry = createRegistry();
  const validation = validateGraph(graph, registry);
  expect(validation.valid).toBe(true);
  const model = compileGraph(graph, registry, dt);
  const initialState = new Array(model.stateSize).fill(0);
  return solve(model, { dt, duration }, initialState);
}

describe('PID filtered derivative — drum level process', () => {
  it('model validates without algebraic loop errors', () => {
    const registry = createRegistry();
    const result = validateGraph(makeModel({ Kp: 1, Ti: 0.4, Td: 4.4 }), registry);
    expect(result.errors).toEqual([]);
  });

  it('IMC tuning (Kp=0.667, Ti=2.0, Td=0) produces stable response near setpoint', () => {
    const result = runSim(makeModel({ Kp: 0.667, Ti: 2.0, Td: 0 }));
    const tfTrace = result.scopes['Scope-Out'];
    expect(tfTrace).toBeDefined();

    const lastValue = tfTrace[tfTrace.length - 1];
    console.log('IMC tuning final output:', lastValue.toFixed(4));
    console.log('IMC last 5:', tfTrace.slice(-5).map(v => v.toFixed(4)));

    // Should settle near setpoint (5.0)
    expect(Math.abs(lastValue - 5.0)).toBeLessThan(1.0);
  });

  it('aggressive tuning (Kp=1, Ti=0.4, Td=4.4) diverges but solver catches it', () => {
    // These parameters are unstable for this process — the solver should
    // either throw a divergence error or produce large values.
    // The key assertion: the solver doesn't produce NaN silently.
    let threw = false;
    let errorMsg = '';
    let result;
    try {
      result = runSim(makeModel({ Kp: 1, Ti: 0.4, Td: 4.4 }));
    } catch (e) {
      threw = true;
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    if (threw) {
      console.log('Solver caught divergence:', errorMsg);
      expect(errorMsg).toContain('diverg');
    } else if (result) {
      // If it didn't throw, values should be finite (no NaN)
      const tfTrace = result.scopes['Scope-Out'];
      const lastValue = tfTrace[tfTrace.length - 1];
      console.log('Aggressive tuning final output:', lastValue.toFixed(4));
      expect(Number.isFinite(lastValue)).toBe(true);
    }
  });

  it('PI-only with stable tuning (Kp=0.5, Ti=5.0, Td=0) is stable', () => {
    const result = runSim(makeModel({ Kp: 0.5, Ti: 5.0, Td: 0 }));
    const tfTrace = result.scopes['Scope-Out'];
    const lastValue = tfTrace[tfTrace.length - 1];
    console.log('PI stable tuning final:', lastValue.toFixed(4));
    expect(Math.abs(lastValue - 5.0)).toBeLessThan(2.0);
  });
});