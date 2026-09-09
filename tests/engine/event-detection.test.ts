import { describe, it, expect } from 'vitest';
import { solveAdaptive } from '../../src/engine/solver';
import type { CompiledModel, CrossingEvent } from '../../src/engine/types';

function modelWithEvent(): CompiledModel {
  const events: CrossingEvent[] = [{ id: 'e1', sign: (_t, s) => s[0] - 0.5 }];
  return {
    stateSize: 1, f: () => [1], outputMap: new Map(), scopeBlockIds: [],
    scopeInputs: new Map(), workspaceBlockIds: [], blockOrder: [],
    getOutputs: () => new Map(), updatePrevOutputs: () => {},
    absoluteBlockIds: new Set(), applyAbsoluteState: () => {}, events,
  };
}

describe('Event detection in adaptive solver', () => {
  it('reports the exact crossing time, not a step boundary', () => {
    const res = solveAdaptive(modelWithEvent(), { dt: 0.1, duration: 1, rtol: 1e-6, atol: 1e-9 }, [0]);
    expect(res.crossingTimes).toBeDefined();
    expect(res.crossingTimes!.length).toBeGreaterThan(0);
    expect(res.crossingTimes![0]).toBeCloseTo(0.5, 6);
  });

  it('does not report crossings when none occur', () => {
    const events: CrossingEvent[] = [{ id: 'e1', sign: (_t, s) => s[0] - 100 }];
    const model: CompiledModel = { ...modelWithEvent(), events };
    const res = solveAdaptive(model, { dt: 0.1, duration: 1, rtol: 1e-6, atol: 1e-9 }, [0]);
    expect(res.crossingTimes!.length).toBe(0);
  });
});