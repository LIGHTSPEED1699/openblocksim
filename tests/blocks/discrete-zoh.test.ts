import { describe, it, expect } from 'vitest';
import { UnitDelay } from '../../src/blocks/discrete/UnitDelay';
import { DiscreteIntegrator } from '../../src/blocks/discrete/DiscreteIntegrator';
import { DiscreteTransferFcn } from '../../src/blocks/discrete/DiscreteTransferFcn';
import { Memory } from '../../src/blocks/discrete/Memory';

// ZOH discrete block semantics: with a sampleTime param, the block samples its
// input and updates only at sample times, holding the last output in between.

function runUntil(block: ReturnType<typeof UnitDelay.create>, steps: Array<{ t: number; u: number }>): { outputs: number[]; state: number[] } {
  let state: number[] = new Array(block.stateSize).fill(0);
  const outputs: number[] = [];
  for (const { t, u } of steps) {
    const [out, nextState] = block.compute(0.01, [u], state, { sampleTime: 0.1 }, t);
    outputs.push(out[0]);
    state = nextState;
  }
  return { outputs, state };
}

describe('UnitDelay ZOH sample-time semantics', () => {
  it('holds output between sample times', () => {
    const b = UnitDelay.create();
    let state = [0];
    let out: number[];
    let res = b.compute(0.01, [1.0], state, { sampleTime: 0.1 }, 0);
    out = res[0];
    state = res[1];
    expect(out[0]).toBe(1.0);
    res = b.compute(0.01, [2.0], state, { sampleTime: 0.1 }, 0.05);
    out = res[0];
    state = res[1];
    expect(out[0]).toBe(1.0);
    res = b.compute(0.01, [2.0], state, { sampleTime: 0.1 }, 0.1);
    out = res[0];
    expect(out[0]).toBe(2.0);
  });

  it('samples only on sample times over many steps', () => {
    const { outputs } = runUntil(UnitDelay.create(), [
      { t: 0, u: 1 }, { t: 0.05, u: 2 }, { t: 0.1, u: 3 }, { t: 0.15, u: 4 }, { t: 0.2, u: 5 },
    ]);
    expect(outputs).toEqual([1, 1, 3, 3, 5]);
  });

  it('keeps legacy behavior when no sampleTime is set', () => {
    const block = UnitDelay.create();
    let state = [0];
    const outs: number[] = [];
    for (const u of [1, 2, 3]) {
      const [out, ns] = block.compute(0.1, [u], state, {});
      outs.push(out[0]);
      state = ns;
    }
    expect(outs).toEqual([0, 1, 2]);
  });
});

describe('DiscreteIntegrator ZOH sample-time semantics', () => {
  it('accumulates only at sample times and holds between them', () => {
    const b = DiscreteIntegrator.create();
    let state = [0, 0];
    const p = { method: 'forward-euler', sampleTime: 0.1 };
    // t=0 sample: input 10, accumulator advances by Ts*10 = 1 on apply
    const [, s0] = b.compute(0.01, [10], state, p, 0);
    state = s0;
    // Between samples (t=0.05): hold — no accumulation
    const [outMid, sMid] = b.compute(0.01, [10], state, p, 0.05);
    expect(outMid[0]).toBe(1); // accumulated value visible in the interval
    expect(sMid).toEqual(s0);
    // t=0.1 sample: accumulates again
    const [out, s1] = b.compute(0.01, [10], state, p, 0.1);
    expect(out[0]).toBe(1); // pre-update accumulated output
    expect(s1[0]).toBeCloseTo(2, 10);
  });
});

describe('DiscreteTransferFcn ZOH sample-time semantics', () => {
  it('runs the recurrence only at sample times and holds between', () => {
    const b = DiscreteTransferFcn.create();
    const p = { num: [1], den: [1, -0.5], sampleTime: 0.1 };
    let state = [0]; // y[k-1] = 0
    // t=0 sample: y = 1 + 0.5*0 = 1
    const [o0, s0] = b.compute(0.01, [1], state, p, 0);
    expect(o0[0]).toBeCloseTo(1, 10);
    state = s0;
    // t=0.05: hold output 1, state unchanged
    const [oMid, sMid] = b.compute(0.01, [0], state, p, 0.05);
    expect(oMid[0]).toBeCloseTo(1, 10);
    expect(sMid).toEqual(state);
    // t=0.1 sample: y = 0 + 0.5*1 = 0.5
    const [o1] = b.compute(0.01, [0], state, p, 0.1);
    expect(o1[0]).toBeCloseTo(0.5, 10);
  });
});

describe('Memory ZOH sample-time semantics', () => {
  it('holds output between sample times', () => {
    const b = Memory.create();
    let state = [0];
    let out: number[];
    let res = b.compute(0.01, [5], state, { sampleTime: 0.1 }, 0);
    out = res[0];
    state = res[1];
    expect(out[0]).toBe(5);
    res = b.compute(0.01, [9], state, { sampleTime: 0.1 }, 0.05);
    out = res[0];
    state = res[1];
    expect(out[0]).toBe(5);
    res = b.compute(0.01, [9], state, { sampleTime: 0.1 }, 0.1);
    out = res[0];
    expect(out[0]).toBe(9);
  });
});
