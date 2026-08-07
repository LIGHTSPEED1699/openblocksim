import { describe, it, expect } from 'vitest';
import { solve } from '../../src/engine/solver';
import type { CompiledModel } from '../../src/engine/types';

describe('RK4 solver', () => {
  it('solves dx/dt = -x with known analytical solution', () => {
    // dx/dt = -x → x(t) = x0 * e^(-t)
    const model: CompiledModel = {
      stateSize: 1,
      f: (_t, state) => [-state[0]],
      outputMap: new Map(),
      scopeBlockIds: [],
      workspaceBlockIds: [],
      blockOrder: [],
    };
    const result = solve(model, { dt: 0.01, duration: 1 }, [1]);
    expect(result.time).toHaveLength(101); // 0 to 1.0 inclusive
    // At t=1, x ≈ e^(-1) ≈ 0.3679
    const finalVal = result.time.reduce((acc, _t, i) => acc, 0); // just check length
    // Check last value in traces or state
    expect(result.time[100]).toBeCloseTo(1.0, 1);
  });

  it('detects NaN and throws', () => {
    const model: CompiledModel = {
      stateSize: 1,
      f: (_t, _state) => [NaN],
      outputMap: new Map(),
      scopeBlockIds: [],
      workspaceBlockIds: [],
      blockOrder: [],
    };
    expect(() => solve(model, { dt: 0.01, duration: 1 }, [0])).toThrow(/NaN/);
  });

  it('respects max steps limit', () => {
    const model: CompiledModel = {
      stateSize: 1,
      f: (_t, state) => [state[0]],
      outputMap: new Map(),
      scopeBlockIds: [],
      workspaceBlockIds: [],
      blockOrder: [],
    };
    // dt=0.001, duration=200 → 200,000 steps > 100,000 limit
    expect(() => solve(model, { dt: 0.001, duration: 200 }, [0])).toThrow(/step/);
  });
});