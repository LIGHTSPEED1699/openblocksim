import { describe, it, expect } from 'vitest';
import { solveAdaptive } from '../../src/engine/solver';
import type { CompiledModel } from '../../src/engine/types';

// x' = -1e12 x + 1e12 — so stiff that the explicit adaptive step can never
// advance; the solver keeps grinding at a tiny step and must report the stall.
function stiffModel(): CompiledModel {
  return {
    stateSize: 1,
    f: (_t, state) => [-1e12 * state[0] + 1e12],
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

describe('Stall detection', () => {
  it('detects a stalled adaptive loop and suggests BDF', () => {
    expect(() =>
      solveAdaptive(stiffModel(), { dt: 0.01, duration: 1, rtol: 1e-4, atol: 1e-6, solverType: 'adaptive' }, [0])
    ).toThrow(/BDF/);
  });

  it('stall message tells the user the loop is stuck', () => {
    expect(() =>
      solveAdaptive(stiffModel(), { dt: 0.01, duration: 1, rtol: 1e-4, atol: 1e-6, solverType: 'adaptive' }, [0])
    ).toThrow(/stall|stuck|underflow/i);
  });
});
