import { describe, it, expect } from 'vitest';
import { solveBDF } from '../../src/engine/solver';
import type { CompiledModel } from '../../src/engine/types';

function stiffModel(): CompiledModel {
  // x' = -1000x + 1000, x(0)=0 -> x(t) -> 1 (stiff, eigenvalue -1000)
  return {
    stateSize: 1,
    f: (_t, state) => [-1000 * state[0] + 1000],
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

describe('BDF solver', () => {
  it('solves a stiff system without step underflow', () => {
    const model = stiffModel();
    const res = solveBDF(model, { dt: 0.01, duration: 1, solverType: 'bdf' }, [0]);
    expect(res.time.length).toBeGreaterThan(10);
    const trace = res.scopes['scope'];
    expect(trace.at(-1)).toBeCloseTo(1, 2);
  });

  it('produces stats', () => {
    const model = stiffModel();
    const res = solveBDF(model, { dt: 0.01, duration: 1, solverType: 'bdf' }, [0]);
    expect(res.actualSteps).toBeGreaterThan(0);
    expect(res.stats).toBeDefined();
  });
});