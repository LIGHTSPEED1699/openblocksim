import { describe, it, expect } from 'vitest';
import { UnitDelay } from '../../src/blocks/discrete/UnitDelay';
import { DiscreteIntegrator } from '../../src/blocks/discrete/DiscreteIntegrator';
import { DiscreteTransferFcn } from '../../src/blocks/discrete/DiscreteTransferFcn';
import { Memory } from '../../src/blocks/discrete/Memory';
import { BlockCategory } from '../../src/blocks/types';

describe('UnitDelay block', () => {
  it('is dynamic with stateSize 1', () => {
    const block = UnitDelay.create();
    expect(block.isDynamic).toBe(true);
    expect(block.stateSize).toBe(1);
    expect(block.stateUpdateMode).toBe('absolute');
    expect(block.category).toBe(BlockCategory.Discrete);
  });

  it('outputs previous state, stores current input', () => {
    const block = UnitDelay.create();
    const [out, newState] = block.compute(0.1, [7], [3], {});
    expect(out[0]).toBe(3);
    expect(newState[0]).toBe(7);
  });

  it('implements z^-1 behavior over multiple steps', () => {
    const block = UnitDelay.create();
    let state = [0]; // initial
    const inputs = [1, 2, 3, 4, 5];
    const outputs: number[] = [];
    for (const u of inputs) {
      const [out, newState] = block.compute(0.1, [u], state, {});
      outputs.push(out[0]);
      state = newState;
    }
    expect(outputs).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('DiscreteIntegrator block', () => {
  it('is dynamic with stateSize 2', () => {
    const block = DiscreteIntegrator.create();
    expect(block.isDynamic).toBe(true);
    expect(block.stateSize).toBe(2);
    expect(block.stateUpdateMode).toBe('absolute');
    expect(block.category).toBe(BlockCategory.Discrete);
  });

  it('forward-euler: output = accumulated, newState = accumulated + dt*input', () => {
    const block = DiscreteIntegrator.create();
    const [out, newState] = block.compute(0.1, [5], [2, 0], { method: 'forward-euler' });
    expect(out[0]).toBe(2); // output = current accumulated
    expect(newState[0]).toBeCloseTo(2 + 0.1 * 5, 10); // 2.5
    expect(newState[1]).toBe(5); // current input stored as prevInput
  });

  it('backward-euler: output = new accumulated value', () => {
    const block = DiscreteIntegrator.create();
    const [out, newState] = block.compute(0.1, [5], [2, 0], { method: 'backward-euler' });
    expect(out[0]).toBeCloseTo(2 + 0.1 * 5, 10); // output = new value
    expect(newState[0]).toBeCloseTo(2.5, 10);
    expect(newState[1]).toBe(5);
  });

  it('trapezoidal: uses average of current and previous input', () => {
    const block = DiscreteIntegrator.create();
    // state = [accumulated=2, prevInput=4]
    const [out, newState] = block.compute(0.1, [6], [2, 4], { method: 'trapezoidal' });
    // newAccumulated = 2 + 0.1 * (6 + 4) / 2 = 2 + 0.5 = 2.5
    expect(out[0]).toBeCloseTo(2.5, 10);
    expect(newState[0]).toBeCloseTo(2.5, 10);
    expect(newState[1]).toBe(6);
  });

  it('forward-euler integrates constant input over multiple steps', () => {
    const block = DiscreteIntegrator.create();
    let state = [0, 0];
    const dt = 0.1;
    const u = 10;
    for (let i = 0; i < 10; i++) {
      const [out, newState] = block.compute(dt, [u], state, { method: 'forward-euler' });
      state = newState;
      // output at step k is the accumulated value before update
      // step 0: out=0, step 1: out=1, ... step k: out=k
      expect(out[0]).toBeCloseTo(i * dt * u, 10);
    }
    // After 10 steps, accumulated = 10 * 0.1 * 10 = 10
    expect(state[0]).toBeCloseTo(10, 10);
  });

  it('trapezoidal integrates constant input correctly', () => {
    const block = DiscreteIntegrator.create();
    let state = [0, 0];
    const dt = 0.1;
    const u = 10;
    for (let i = 0; i < 10; i++) {
      const [, newState] = block.compute(dt, [u], state, { method: 'trapezoidal' });
      state = newState;
    }
    // Trapezoidal with constant input: first step uses (u+0)/2, rest use (u+u)/2 = u
    // After 10 steps: step0 = dt*u/2 = 0.5, steps 1-9 = 9 * dt * u = 9
    // total = 0.5 + 9 = 9.5
    expect(state[0]).toBeCloseTo(9.5, 10);
  });
});

describe('DiscreteTransferFcn block', () => {
  it('is dynamic with absolute state update', () => {
    const block = DiscreteTransferFcn.create();
    expect(block.isDynamic).toBe(true);
    expect(block.stateUpdateMode).toBe('absolute');
    expect(block.category).toBe(BlockCategory.Discrete);
  });

  it('computes first-order: y[k] = 0.5*y[k-1] + u[k] (default den=[1,-0.5], num=[1])', () => {
    const block = DiscreteTransferFcn.create();
    // H(z) = 1 / (1 - 0.5*z^-1) → y[k] = u[k] + 0.5*y[k-1]
    // state[0] = y[k-1] = 0, input = 1
    const [out, newState] = block.compute(0.1, [1], [0], { num: [1], den: [1, -0.5] });
    // y[k] = 1*1 - (-0.5)*0 = 1
    expect(out[0]).toBeCloseTo(1, 10);
    // newState[0] = y[k] = 1
    expect(newState[0]).toBeCloseTo(1, 10);
  });

  it('propagates previous output in next step', () => {
    const block = DiscreteTransferFcn.create();
    let state = [0]; // y[k-1] = 0
    const [out1, state1] = block.compute(0.1, [1], state, { num: [1], den: [1, -0.5] });
    expect(out1[0]).toBeCloseTo(1, 10);
    const [out2, state2] = block.compute(0.1, [0], state1, { num: [1], den: [1, -0.5] });
    // y[k] = 0 + 0.5*1 = 0.5
    expect(out2[0]).toBeCloseTo(0.5, 10);
    expect(state2[0]).toBeCloseTo(0.5, 10);
  });

  it('handles numerator with past input terms', () => {
    // H(z) = (z + 1) / z = 1 + z^-1 → y[k] = u[k] + u[k-1]
    const block = DiscreteTransferFcn.create();
    // state = [u[k-1]] (n=0 for den=[1], m=1 for num=[1,1])
    // stateLen = max(0, 1, 1) = 1, state[0] = u[k-1]
    const [out, newState] = block.compute(0.1, [3], [5], { num: [1, 1], den: [1] });
    // y[k] = 1*3 + 1*5 = 8
    expect(out[0]).toBeCloseTo(8, 10);
    // newState: newInputs = [3], no outputs to store
    expect(newState[0]).toBe(3);
  });

  it('normalizes by den[0]', () => {
    // Same system as default but scaled: den=[2,-1], num=[2]
    // Normalized: a=[1, -0.5], b=[1] → same as default
    const block = DiscreteTransferFcn.create();
    const [out] = block.compute(0.1, [1], [0], { num: [2], den: [2, -1] });
    expect(out[0]).toBeCloseTo(1, 10);
  });

  it('second-order system step response', () => {
    // H(z) = 1 / (1 - 0.5*z^-1 + 0.06*z^-2)
    // y[k] = u[k] + 0.5*y[k-1] - 0.06*y[k-2]
    const block = DiscreteTransferFcn.create();
    let state = [0, 0]; // y[k-1]=0, y[k-2]=0
    const [out1, state1] = block.compute(1, [1], state, { num: [1], den: [1, -0.5, 0.06] });
    expect(out1[0]).toBeCloseTo(1, 10);
    expect(state1[0]).toBeCloseTo(1, 10);
    const [out2, state2] = block.compute(1, [1], state1, { num: [1], den: [1, -0.5, 0.06] });
    // y[k] = 1 + 0.5*1 - 0.06*0 = 1.5
    expect(out2[0]).toBeCloseTo(1.5, 10);
    expect(state2[0]).toBeCloseTo(1.5, 10);
    expect(state2[1]).toBeCloseTo(1, 10);
  });
});

describe('Memory block', () => {
  it('is dynamic with stateSize 1', () => {
    const block = Memory.create();
    expect(block.isDynamic).toBe(true);
    expect(block.stateSize).toBe(1);
    expect(block.stateUpdateMode).toBe('absolute');
    expect(block.category).toBe(BlockCategory.Discrete);
  });

  it('outputs previous state, stores current input', () => {
    const block = Memory.create();
    const [out, newState] = block.compute(0.01, [42], [7], {});
    expect(out[0]).toBe(7);
    expect(newState[0]).toBe(42);
  });

  it('behaves identically to UnitDelay', () => {
    const memBlock = Memory.create();
    const udBlock = UnitDelay.create();
    let memState = [0];
    let udState = [0];
    const inputs = [3, 1, 4, 1, 5, 9];
    for (const u of inputs) {
      const [memOut, memNew] = memBlock.compute(0.1, [u], memState, {});
      const [udOut, udNew] = udBlock.compute(0.1, [u], udState, {});
      expect(memOut[0]).toBe(udOut[0]);
      expect(memNew[0]).toBe(udNew[0]);
      memState = memNew;
      udState = udNew;
    }
  });
});