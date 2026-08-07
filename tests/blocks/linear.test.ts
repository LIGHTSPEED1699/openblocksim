import { describe, it, expect } from 'vitest';
import { Integrator } from '../../src/blocks/linear/Integrator';
import { Derivative } from '../../src/blocks/linear/Derivative';
import { TransferFunction } from '../../src/blocks/linear/TransferFunction';
import { StateSpace } from '../../src/blocks/linear/StateSpace';
import { TransportDelay } from '../../src/blocks/linear/TransportDelay';

describe('Integrator block', () => {
  it('has stateSize 1 and isDynamic true', () => {
    const block = Integrator.create();
    expect(block.isDynamic).toBe(true);
    expect(block.stateSize).toBe(1);
  });
  it('outputs current state, state_dot is input', () => {
    const block = Integrator.create();
    const [out, stateDot] = block.compute(0.01, [3], [5], {});
    expect(out[0]).toBe(5);
    expect(stateDot[0]).toBe(3);
  });
});

describe('Derivative block', () => {
  it('has stateSize 1 and isDynamic true', () => {
    const block = Derivative.create();
    expect(block.isDynamic).toBe(true);
    expect(block.stateSize).toBe(1);
  });
  it('computes finite difference', () => {
    const block = Derivative.create();
    const [out, newState] = block.compute(0.1, [5], [2], {});
    expect(out[0]).toBeCloseTo(30, 5);
    expect(newState[0]).toBe(5);
  });
});

describe('TransferFunction block', () => {
  it('has stateSize = len(den) - 1', () => {
    const block = TransferFunction.create({ num: [1], den: [1, 2, 1] });
    expect(block.stateSize).toBe(2);
  });
  it('computes first-order TF: 1/(s+1) at zero state', () => {
    const block = TransferFunction.create();
    // num=[1], den=[1,1]: A=[-1], B=[1], C=[1], D=0
    // state=[0], input=1 → output=0, state_dot=1
    const [out, stateDot] = block.compute(0.01, [1], [0], { num: [1], den: [1, 1] });
    expect(out[0]).toBeCloseTo(0, 5);
    expect(stateDot[0]).toBeCloseTo(1, 5);
  });
  it('computes second-order TF: 1/(s^2+2s+1) at zero state', () => {
    const block = TransferFunction.create();
    // A=[[0,1],[-1,-2]], B=[0,1], C=[1,0], D=0
    const [out, stateDot] = block.compute(0.01, [1], [0, 0], { num: [1], den: [1, 2, 1] });
    expect(out[0]).toBeCloseTo(0, 5);
    expect(stateDot[0]).toBeCloseTo(0, 5);
    expect(stateDot[1]).toBeCloseTo(1, 5);
  });
});

describe('StateSpace block', () => {
  it('computes output = C*state + D*input and state_dot = A*state + B*input', () => {
    const A = [0, 1, -2, -3]; // 2x2 row-major
    const B = [0, 1];
    const C = [1, 0];
    const D = [0];
    const block = StateSpace.create({ A, B, C, D });
    expect(block.stateSize).toBe(2);
    // state=[1, 0.5], input=[2]
    // output = 1*1 + 0*0.5 + 0*2 = 1
    // state_dot = [0*1+1*0.5, -2*1-3*0.5+1*2] = [0.5, -1.5]
    const [out, stateDot] = block.compute(0.01, [2], [1, 0.5], { A, B, C, D });
    expect(out[0]).toBeCloseTo(1, 5);
    expect(stateDot[0]).toBeCloseTo(0.5, 5);
    expect(stateDot[1]).toBeCloseTo(-1.5, 5);
  });
});

describe('TransportDelay block', () => {
  it('is dynamic', () => {
    const block = TransportDelay.create({ delayTime: 0.5 });
    expect(block.isDynamic).toBe(true);
  });
  it('returns delayed input value from ring buffer', () => {
    const delayTime = 0.1;
    const dt = 0.01;
    const stateSize = Math.ceil(delayTime / dt); // 10
    const block = TransportDelay.create({ delayTime });
    const state = new Array(stateSize).fill(5);
    const [out] = block.compute(dt, [10], state, { delayTime });
    expect(out[0]).toBeCloseTo(5, 5);
  });
});