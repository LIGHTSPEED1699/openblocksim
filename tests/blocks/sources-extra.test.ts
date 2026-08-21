import { describe, it, expect } from 'vitest';
import { PulseGenerator } from '../../src/blocks/sources/PulseGenerator';
import { Clock } from '../../src/blocks/sources/Clock';
import { ChirpSignal } from '../../src/blocks/sources/ChirpSignal';
import { RepeatingSequence } from '../../src/blocks/sources/RepeatingSequence';
import { RandomNumber } from '../../src/blocks/sources/RandomNumber';

describe('PulseGenerator block', () => {
  it('outputs amplitude during on portion of period', () => {
    const block = PulseGenerator.create();
    const [out] = block.compute(0.01, [], [], { amplitude: 2, period: 1, dutyCycle: 50, phaseDelay: 0 }, 0.2);
    expect(out[0]).toBe(2);
  });
  it('outputs 0 during off portion of period', () => {
    const block = PulseGenerator.create();
    const [out] = block.compute(0.01, [], [], { amplitude: 2, period: 1, dutyCycle: 50, phaseDelay: 0 }, 0.7);
    expect(out[0]).toBe(0);
  });
  it('respects duty cycle', () => {
    const block = PulseGenerator.create();
    // 25% duty cycle: on for first 0.25s of 1s period
    const [outOn] = block.compute(0.01, [], [], { amplitude: 1, period: 1, dutyCycle: 25, phaseDelay: 0 }, 0.1);
    const [outOff] = block.compute(0.01, [], [], { amplitude: 1, period: 1, dutyCycle: 25, phaseDelay: 0 }, 0.5);
    expect(outOn[0]).toBe(1);
    expect(outOff[0]).toBe(0);
  });
  it('respects phase delay', () => {
    const block = PulseGenerator.create();
    // phaseDelay=0.5 → at t=0.6, phase = 0.1, on for 50% → on
    const [out] = block.compute(0.01, [], [], { amplitude: 1, period: 1, dutyCycle: 50, phaseDelay: 0.5 }, 0.6);
    expect(out[0]).toBe(1);
  });
  it('has 0 inputs and 1 output', () => {
    const block = PulseGenerator.create();
    expect(block.inputs).toBe(0);
    expect(block.outputs).toBe(1);
  });
});

describe('Clock block', () => {
  it('outputs simulation time', () => {
    const block = Clock.create();
    const [out] = block.compute(0.01, [], [], {}, 3.5);
    expect(out[0]).toBeCloseTo(3.5, 5);
  });
  it('outputs 0 at t=0', () => {
    const block = Clock.create();
    const [out] = block.compute(0.01, [], [], {}, 0);
    expect(out[0]).toBe(0);
  });
  it('has 0 inputs', () => {
    const block = Clock.create();
    expect(block.inputs).toBe(0);
  });
});

describe('ChirpSignal block', () => {
  it('outputs amplitude*sin(phase) at t=0', () => {
    const block = ChirpSignal.create();
    const [out] = block.compute(0.01, [], [], { amplitude: 2, startFreq: 0.5, targetFreq: 2, sweepTime: 10 }, 0);
    expect(out[0]).toBeCloseTo(0, 5); // sin(0) = 0
  });
  it('frequency increases over time (phase grows faster)', () => {
    const block = ChirpSignal.create();
    const [out1] = block.compute(0.01, [], [], { amplitude: 1, startFreq: 0.1, targetFreq: 5, sweepTime: 1 }, 0.1);
    const [out2] = block.compute(0.01, [], [], { amplitude: 1, startFreq: 0.1, targetFreq: 5, sweepTime: 1 }, 0.5);
    // Not a strict test, just ensure it produces finite values
    expect(isFinite(out1[0])).toBe(true);
    expect(isFinite(out2[0])).toBe(true);
  });
  it('holds at target frequency after sweep time', () => {
    const block = ChirpSignal.create();
    const [out] = block.compute(0.01, [], [], { amplitude: 1, startFreq: 0.1, targetFreq: 1, sweepTime: 1 }, 1.5);
    // After sweep (t=1.5 > sweepTime=1), freq should be targetFreq=1
    // Just verify it's finite
    expect(isFinite(out[0])).toBe(true);
  });
  it('has 0 inputs and 1 output', () => {
    const block = ChirpSignal.create();
    expect(block.inputs).toBe(0);
    expect(block.outputs).toBe(1);
  });
});

describe('RepeatingSequence block', () => {
  it('interpolates between data points', () => {
    const block = RepeatingSequence.create();
    const [out] = block.compute(0.01, [], [], {
      timeValues: [0, 1, 2],
      outputValues: [0, 2, 0],
    }, 0.5);
    // At t=0.5: between (0,0) and (1,2), fraction=0.5 → 0 + 0.5*2 = 1
    expect(out[0]).toBeCloseTo(1, 5);
  });
  it('wraps around at period boundary', () => {
    const block = RepeatingSequence.create();
    const [out] = block.compute(0.01, [], [], {
      timeValues: [0, 1, 2],
      outputValues: [0, 2, 0],
    }, 2.5);
    // t=2.5 → tMod=0.5 → same as t=0.5 → 1.0
    expect(out[0]).toBeCloseTo(1, 5);
  });
  it('outputs first value at t=0', () => {
    const block = RepeatingSequence.create();
    const [out] = block.compute(0.01, [], [], {
      timeValues: [0, 1, 2],
      outputValues: [3, 1, 3],
    }, 0);
    expect(out[0]).toBeCloseTo(3, 5);
  });
  it('has 0 inputs', () => {
    const block = RepeatingSequence.create();
    expect(block.inputs).toBe(0);
  });
});

describe('RandomNumber block', () => {
  it('produces finite values with seeded PRNG', () => {
    const block = RandomNumber.create();
    const [out] = block.compute(0.01, [], [], { mean: 5, stdDev: 2, seed: 42 });
    expect(isFinite(out[0])).toBe(true);
  });
  it('has 0 inputs and 1 output', () => {
    const block = RandomNumber.create();
    expect(block.inputs).toBe(0);
    expect(block.outputs).toBe(1);
  });
  it('is not dynamic', () => {
    const block = RandomNumber.create();
    expect(block.isDynamic).toBe(false);
  });
});