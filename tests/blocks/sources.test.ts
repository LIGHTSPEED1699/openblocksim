import { describe, it, expect } from 'vitest';
import { Constant } from '../../src/blocks/sources/Constant';
import { Step } from '../../src/blocks/sources/Step';
import { Ramp } from '../../src/blocks/sources/Ramp';
import { Sine } from '../../src/blocks/sources/Sine';
import { Square } from '../../src/blocks/sources/Square';

describe('Constant block', () => {
  it('outputs its parameter value', () => {
    const block = Constant.create();
    const [out] = block.compute(0.01, [], [], { value: 5 });
    expect(out[0]).toBe(5);
  });
});

describe('Step block', () => {
  it('outputs 0 before step time', () => {
    const block = Step.create();
    const [out] = block.compute(0.01, [], [], { stepTime: 2, stepValue: 5 }, 1);
    expect(out[0]).toBe(0);
  });
  it('outputs step value at and after step time', () => {
    const block = Step.create();
    const [out] = block.compute(0.01, [], [], { stepTime: 2, stepValue: 5 }, 2);
    expect(out[0]).toBe(5);
  });
});

describe('Ramp block', () => {
  it('outputs 0 before start time', () => {
    const block = Ramp.create();
    const [out] = block.compute(0.01, [], [], { startTime: 1, slope: 2 }, 0.5);
    expect(out[0]).toBe(0);
  });
  it('outputs slope*(t-startTime) after start time', () => {
    const block = Ramp.create();
    const [out] = block.compute(0.01, [], [], { startTime: 1, slope: 2 }, 3);
    expect(out[0]).toBe(4);
  });
});

describe('Sine block', () => {
  it('outputs amplitude*sin(2*pi*freq*t + phase)', () => {
    const block = Sine.create();
    const [out] = block.compute(0.01, [], [], { amplitude: 2, frequency: 0.5, phase: 0 }, 0.5);
    expect(out[0]).toBeCloseTo(2, 5);
  });
  it('outputs 0 at t=0 with default phase', () => {
    const block = Sine.create();
    const [out] = block.compute(0.01, [], [], { amplitude: 1, frequency: 1, phase: 0 }, 0);
    expect(out[0]).toBeCloseTo(0, 5);
  });
});

describe('Square block', () => {
  it('outputs amplitude when sin is positive', () => {
    const block = Square.create();
    const [out] = block.compute(0.01, [], [], { amplitude: 3, frequency: 0.5, phase: 0 }, 0.5);
    expect(out[0]).toBe(3);
  });
  it('outputs -amplitude when sin is negative', () => {
    const block = Square.create();
    const [out] = block.compute(0.01, [], [], { amplitude: 3, frequency: 1, phase: 0 }, 0.75);
    expect(out[0]).toBe(-3);
  });
});