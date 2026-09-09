import { describe, it, expect } from 'vitest';
import { solve, solveAdaptive, solveBDF } from '../../src/engine/solver';
import type { CompiledModel } from '../../src/engine/types';

function model(): CompiledModel {
  // x' = 1 - x, x(0)=0 -> x(t) -> 1 (smooth, integrates easily)
  return {
    stateSize: 1,
    f: (_t, state) => [1 - state[0]],
    outputMap: new Map(),
    scopeBlockIds: [],
    scopeInputs: new Map(),
    workspaceBlockIds: [],
    blockOrder: [],
    getOutputs: () => new Map(),
    updatePrevOutputs: () => {},
    absoluteBlockIds: new Set(),
    applyAbsoluteState: () => {},
  };
}

describe('Solver diagnostic report', () => {
  it('fixed-step solve reports solver statistics', () => {
    const res = solve(model(), { dt: 0.1, duration: 1 }, [0]);
    expect(res.stats).toBeDefined();
    expect(res.stats!.acceptedSteps).toBeGreaterThan(0);
    expect(res.stats!.minStep).toBeGreaterThan(0);
    expect(res.stats!.maxStep).toBeGreaterThan(0);
    expect(res.stats!.rhsEvals).toBeGreaterThan(0);
  });

  it('adaptive solver reports solver statistics', () => {
    const res = solveAdaptive(model(), { dt: 0.01, duration: 1, rtol: 1e-4, atol: 1e-6 }, [0]);
    expect(res.stats).toBeDefined();
    expect(res.stats!.acceptedSteps).toBeGreaterThan(0);
    expect(res.stats!.rejectedSteps).toBeGreaterThanOrEqual(0);
    expect(res.stats!.rhsEvals).toBeGreaterThan(0);
    expect(res.stats!.maxStep).toBeGreaterThan(0);
    expect(res.stats!.wallMs).toBeGreaterThanOrEqual(0);
  });

  it('BDF solver reports rhs evaluation counts', () => {
    const res = solveBDF(model(), { dt: 0.1, duration: 1, solverType: 'bdf' }, [0]);
    expect(res.stats).toBeDefined();
    expect(res.stats!.acceptedSteps).toBeGreaterThan(0);
    expect(res.stats!.rhsEvals).toBeGreaterThan(0);
  });
});
