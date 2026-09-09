import { describe, it, expect } from 'vitest';
import { solveAdaptive } from '../../src/engine/solver';
import type { CompiledModel } from '../../src/engine/types';

function stiffModel(): CompiledModel {
  // x' = -1e6 x + 1e6, x(0)=0 -> x -> 1 (very stiff, eigenvalue -1e6)
  // Adaptive RK4(5) will underflow trying to resolve the fast transient
  return {
    stateSize: 1,
    f: (_t, state) => [-1e6 * state[0] + 1e6],
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

describe('Stiff solver underflow message', () => {
  it('suggests BDF on step underflow', () => {
    expect(() =>
      solveAdaptive(stiffModel(), { dt: 0.01, duration: 1, rtol: 1e-4, atol: 1e-6, solverType: 'adaptive' }, [0])
    ).toThrow(/BDF|stiff/);
  });
});