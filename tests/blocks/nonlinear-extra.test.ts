import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../../src/blocks/nonlinear/RateLimiter';
import { Quantizer } from '../../src/blocks/nonlinear/Quantizer';
import { Backlash } from '../../src/blocks/nonlinear/Backlash';

describe('RateLimiter block', () => {
  it('is dynamic with stateSize 1', () => {
    const block = RateLimiter.create();
    expect(block.isDynamic).toBe(true);
    expect(block.stateSize).toBe(1);
  });
  it('limits rising rate to risingSlew*dt', () => {
    const dt = 0.1;
    const block = RateLimiter.create();
    // prevOutput=0, input=5, risingSlew=1 → max change = 0.1
    // delta=5 > 0.1 → output = 0 + 0.1 = 0.1
    const [out, newState] = block.compute(dt, [5], [0], { risingSlew: 1, fallingSlew: -1 });
    expect(out[0]).toBeCloseTo(0.1, 5);
    expect(newState[0]).toBeCloseTo(0.1, 5);
  });
  it('limits falling rate to fallingSlew*dt', () => {
    const dt = 0.1;
    const block = RateLimiter.create();
    // prevOutput=5, input=0, fallingSlew=-1 → min change = -0.1
    // delta=-5 < -0.1 → output = 5 + (-0.1) = 4.9
    const [out] = block.compute(dt, [0], [5], { risingSlew: 1, fallingSlew: -1 });
    expect(out[0]).toBeCloseTo(4.9, 5);
  });
  it('passes signal through when within rate limits', () => {
    const dt = 0.1;
    const block = RateLimiter.create();
    // prevOutput=1, input=1.05, risingSlew=1 → max change = 0.1
    // delta=0.05 < 0.1 → output = input = 1.05
    const [out] = block.compute(dt, [1.05], [1], { risingSlew: 1, fallingSlew: -1 });
    expect(out[0]).toBeCloseTo(1.05, 5);
  });
});

describe('Quantizer block', () => {
  it('quantizes to nearest quantum level', () => {
    const block = Quantizer.create();
    const [out] = block.compute(0.01, [1.3], [], { quantum: 0.5 });
    expect(out[0]).toBeCloseTo(1.5, 5);
  });
  it('quantizes negative values correctly', () => {
    const block = Quantizer.create();
    const [out] = block.compute(0.01, [-1.2], [], { quantum: 0.5 });
    expect(out[0]).toBeCloseTo(-1.0, 5);
  });
  it('quantum=1 rounds to integer', () => {
    const block = Quantizer.create();
    const [out] = block.compute(0.01, [3.7], [], { quantum: 1 });
    expect(out[0]).toBeCloseTo(4, 5);
  });
  it('is static (not dynamic)', () => {
    const block = Quantizer.create();
    expect(block.isDynamic).toBe(false);
  });
});

describe('Backlash block', () => {
  it('is dynamic with stateSize 2', () => {
    const block = Backlash.create();
    expect(block.isDynamic).toBe(true);
    expect(block.stateSize).toBe(2);
  });
  it('output does not change when input moves within deadband', () => {
    const block = Backlash.create();
    // prevOutput=0, prevInput=0, deadbandWidth=1 (half=0.5)
    // input=0.3 (moving up but within deadband) → output stays 0
    const [out, newState] = block.compute(0.01, [0.3], [0, 0], { deadbandWidth: 1 });
    expect(out[0]).toBeCloseTo(0, 5);
    expect(newState[0]).toBeCloseTo(0, 5);
    expect(newState[1]).toBeCloseTo(0.3, 5);
  });
  it('output follows when input exceeds deadband going up', () => {
    const block = Backlash.create();
    // prevOutput=0, prevInput=0, deadbandWidth=1 (half=0.5)
    // input=1.0 (moving up, exceeds upperEdge=0.5) → output = 1.0 - 0.5 = 0.5
    const [out] = block.compute(0.01, [1.0], [0, 0], { deadbandWidth: 1 });
    expect(out[0]).toBeCloseTo(0.5, 5);
  });
  it('output follows when input exceeds deadband going down', () => {
    const block = Backlash.create();
    // prevOutput=0, prevInput=0, deadbandWidth=1 (half=0.5)
    // input=-1.0 (moving down, exceeds lowerEdge=-0.5) → output = -1.0 + 0.5 = -0.5
    const [out] = block.compute(0.01, [-1.0], [0, 0], { deadbandWidth: 1 });
    expect(out[0]).toBeCloseTo(-0.5, 5);
  });
  it('output tracks input after initial engagement', () => {
    const block = Backlash.create();
    // prevOutput=0.5, prevInput=1.0, deadbandWidth=1
    // input=1.5 (moving up, upperEdge=0.5+0.5=1.0, input=1.5 > 1.0)
    // output = 1.5 - 0.5 = 1.0
    const [out] = block.compute(0.01, [1.5], [0.5, 1.0], { deadbandWidth: 1 });
    expect(out[0]).toBeCloseTo(1.0, 5);
  });
});