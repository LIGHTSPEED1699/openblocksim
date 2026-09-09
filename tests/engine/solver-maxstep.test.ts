import { describe, it, expect } from 'vitest';
import { solveAdaptive } from '../../src/engine/solver';
import type { CompiledModel } from '../../src/engine/types';

function decayModel(): CompiledModel {
  // dx/dt = -x, x(0)=1 -> x(t) = e^-t (smooth, stable)
  return {
    stateSize: 1,
    f: (_t, state) => [-state[0]],
    outputMap: new Map(),
    scopeBlockIds: ['scope'],
    scopeInputs: new Map([['scope', [{ source: 'x', sourcePort: 0 }]]]),
    workspaceBlockIds: [],
    blockOrder: ['x'],
    getOutputs: (_t, state) => {
      const o = new Map<string, number[]>();
      o.set('x', [state[0]]);
      return o;
    },
    updatePrevOutputs: () => {},
    absoluteBlockIds: new Set(),
    applyAbsoluteState: () => {},
  };
}

describe('maxStep / output grid decoupling', () => {
  it('outputs on the dt grid even when maxStep > dt', () => {
    const model = decayModel();
    const res = solveAdaptive(
      model,
      { dt: 0.01, duration: 1, solverType: 'adaptive', maxStep: 0.1, rtol: 1e-6, atol: 1e-9 },
      [1]
    );
    // Output grid must equal dt, not maxStep
    expect(res.time[1] - res.time[0]).toBeCloseTo(0.01, 6);
    expect(res.time[2] - res.time[1]).toBeCloseTo(0.01, 6);
    // Number of output points = duration/dt + 1
    expect(res.time.length).toBe(101);
    // Solver took fewer integration steps than output points (maxStep > dt)
    expect(res.actualSteps).toBeLessThan(101);
  });

  it('output values are interpolated correctly (e^-t at t=1 ≈ 0.368)', () => {
    const model = decayModel();
    const res = solveAdaptive(
      model,
      { dt: 0.01, duration: 1, solverType: 'adaptive', maxStep: 0.1, rtol: 1e-6, atol: 1e-9 },
      [1]
    );
    const trace = res.scopes['scope'];
    expect(trace.at(-1)).toBeCloseTo(Math.exp(-1), 2);
  });
});