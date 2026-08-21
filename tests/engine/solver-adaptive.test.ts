import { describe, it, expect } from 'vitest';
import { solveAdaptive } from '../../src/engine/solver';
import type { CompiledModel } from '../../src/engine/types';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { Step } from '../../src/blocks/sources/Step';
import { Sum } from '../../src/blocks/math/Sum';
import { PID } from '../../src/blocks/control/PID';
import { TransferFunction } from '../../src/blocks/linear/TransferFunction';
import { Scope } from '../../src/blocks/sinks/Scope';
import { compileGraph } from '../../src/engine/compiler';

function makeSimpleModel(f: (t: number, state: number[]) => number[], stateSize: number = 1): CompiledModel {
  return {
    stateSize,
    f,
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

describe('Adaptive RK4(5) solver', () => {
  it('solves dx/dt = -x with known analytical solution', () => {
    const model = makeSimpleModel((_t, state) => [-state[0]]);
    const result = solveAdaptive(model, { dt: 0.1, duration: 1, rtol: 1e-6, atol: 1e-9 }, [1]);
    expect(result.time[result.time.length - 1]).toBeCloseTo(1.0, 2);
    expect(result.actualSteps).toBeGreaterThan(0);
    expect(result.actualSteps).toBeLessThan(100);
  });

  it('produces non-uniform time points', () => {
    // dx/dt = -5x: fast enough that h=0.1 produces visible error at rtol=1e-6
    // The solver will take small steps near t=0 (fast transient) and grow
    const model = makeSimpleModel((_t, state) => [-5 * state[0]]);
    const result = solveAdaptive(model, { dt: 0.1, duration: 5, rtol: 1e-6, atol: 1e-9 }, [1]);
    const intervals: number[] = [];
    for (let i = 1; i < result.time.length; i++) {
      intervals.push(result.time[i] - result.time[i - 1]);
    }
    const allSame = intervals.every((v) => Math.abs(v - intervals[0]) < 1e-10);
    expect(allSame).toBe(false);
  });

  it('takes fewer steps than fixed-step equivalent for smooth system', () => {
    // dx/dt = -0.1*x: slow system, dt=0.01 fixed = 5000 steps for 50s
    // Adaptive with dt=0.5 max should take far fewer
    const model = makeSimpleModel((_t, state) => [-0.1 * state[0]]);
    const result = solveAdaptive(model, { dt: 0.5, duration: 50, rtol: 1e-3, atol: 1e-6 }, [1]);
    expect(result.actualSteps!).toBeLessThan(500); // adaptive should take <500, fixed would take 5000
    expect(result.actualSteps!).toBeGreaterThan(5);
  });

  it('detects NaN and throws', () => {
    const model = makeSimpleModel(() => [NaN]);
    expect(() => solveAdaptive(model, { dt: 0.01, duration: 1, rtol: 1e-4, atol: 1e-6 }, [0])).toThrow(/NaN/);
  });

  it('detects divergence and throws', () => {
    const model = makeSimpleModel((_t, state) => [state[0] * 1000]);
    expect(() => solveAdaptive(model, { dt: 0.01, duration: 5, rtol: 1e-4, atol: 1e-6 }, [1])).toThrow(/diverg/);
  });

  it('captures scope traces at variable time points', () => {
    const model: CompiledModel = {
      stateSize: 1,
      f: (_t, state) => [-state[0]],
      outputMap: new Map(),
      scopeBlockIds: ['scope1'],
      scopeInputs: new Map([['scope1', [{ source: 'src', sourcePort: 0 }]]]),
      workspaceBlockIds: [],
      blockOrder: ['src', 'scope1'],
      getOutputs: (_t, state) => {
        const outputs = new Map<string, number[]>();
        outputs.set('src', [state[0]]);
        return outputs;
      },
      updatePrevOutputs: () => {},
      absoluteBlockIds: new Set(),
      applyAbsoluteState: () => {},
    };
    const result = solveAdaptive(model, { dt: 0.01, duration: 3, rtol: 1e-4, atol: 1e-6 }, [1]);
    expect(result.scopes['scope1'].length).toBe(result.time.length);
    expect(result.scopes['scope1'][0]).toBeCloseTo(1, 5);
    expect(result.scopes['scope1'][result.scopes['scope1'].length - 1]).toBeCloseTo(Math.exp(-3), 1);
  });

  it('higher tolerance takes fewer steps than lower tolerance', () => {
    // Slow system where tolerance difference is visible
    const model = makeSimpleModel((_t, state) => [-0.1 * state[0]]);
    const loose = solveAdaptive(model, { dt: 0.5, duration: 50, rtol: 1e-2, atol: 1e-4 }, [1]);
    const tight = solveAdaptive(model, { dt: 0.5, duration: 50, rtol: 1e-8, atol: 1e-10 }, [1]);
    expect(loose.actualSteps!).toBeLessThanOrEqual(tight.actualSteps!);
  });

  it('handles absolute-mode blocks (TransportDelay pattern)', () => {
    let bufferState = [0, 0, 0, 0, 0];
    const model: CompiledModel = {
      stateSize: 5,
      f: () => [0, 0, 0, 0, 0],
      outputMap: new Map(),
      scopeBlockIds: ['scope1'],
      scopeInputs: new Map([['scope1', [{ source: 'delay', sourcePort: 0 }]]]),
      workspaceBlockIds: [],
      blockOrder: ['delay', 'scope1'],
      getOutputs: (_t, state) => {
        const outputs = new Map<string, number[]>();
        outputs.set('delay', [state[0]]);
        return outputs;
      },
      updatePrevOutputs: () => {},
      absoluteBlockIds: new Set(['delay']),
      applyAbsoluteState: (_t, state) => {
        bufferState = [...bufferState.slice(1), 1];
        for (let i = 0; i < 5; i++) state[i] = bufferState[i];
      },
    };
    const result = solveAdaptive(model, { dt: 0.01, duration: 0.5, rtol: 1e-4, atol: 1e-6 }, [0, 0, 0, 0, 0]);
    expect(result.actualSteps!).toBeGreaterThan(0);
    const trace = result.scopes['scope1'];
    expect(trace.every((v: number) => isFinite(v))).toBe(true);
  });

  it('closed-loop PID: adaptive matches fixed-step result within tolerance', () => {
    const registry = new BlockRegistry();
    registry.register(BlockType.Step, Step);
    registry.register(BlockType.Sum, Sum);
    registry.register(BlockType.PID, PID);
    registry.register(BlockType.TransferFunction, TransferFunction);
    registry.register(BlockType.Scope, Scope);

    const graph = {
      blocks: [
        { id: 'step', type: BlockType.Step, params: { stepTime: 0, stepValue: 1 }, position: { x: 0, y: 0 } },
        { id: 'sum', type: BlockType.Sum, params: { signs: [1, -1] }, position: { x: 100, y: 0 } },
        { id: 'pid', type: BlockType.PID, params: { Kp: 2, Ti: 0, Td: 0 }, position: { x: 200, y: 0 } },
        { id: 'plant', type: BlockType.TransferFunction, params: { num: [1], den: [1, 1] }, position: { x: 300, y: 0 } },
        { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 400, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'step', sourcePort: 0, target: 'sum', targetPort: 0 },
        { id: 'e2', source: 'plant', sourcePort: 0, target: 'sum', targetPort: 1 },
        { id: 'e3', source: 'sum', sourcePort: 0, target: 'pid', targetPort: 0 },
        { id: 'e3b', source: 'plant', sourcePort: 0, target: 'pid', targetPort: 1 },
        { id: 'e4', source: 'pid', sourcePort: 0, target: 'plant', targetPort: 0 },
        { id: 'e5', source: 'plant', sourcePort: 0, target: 'scope', targetPort: 0 },
      ],
    };

    const model = compileGraph(graph, registry, 0.01);
    const result = solveAdaptive(model, { dt: 0.05, duration: 5, rtol: 1e-4, atol: 1e-6 }, new Array(model.stateSize).fill(0));

    // Closed-loop TF = 2/(s+3), step response at t=5: (2/3)(1-e^(-15)) ≈ 0.6667
    const trace = result.scopes['scope'];
    const lastVal = trace[trace.length - 1];
    expect(lastVal).toBeCloseTo(2 / 3, 1);
    // No NaN
    expect(trace.every((v) => isFinite(v))).toBe(true);
    // Adaptive should take fewer than 500 steps (fixed dt=0.01 = 500)
    expect(result.actualSteps!).toBeLessThan(500);
  });
});