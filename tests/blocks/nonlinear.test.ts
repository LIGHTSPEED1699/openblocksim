import { describe, it, expect } from 'vitest';
import { Saturation } from '../../src/blocks/nonlinear/Saturation';
import { Deadzone } from '../../src/blocks/nonlinear/Deadzone';

describe('Saturation block', () => {
  it('passes input through when within limits', () => {
    const block = Saturation.create();
    const [out] = block.compute(0.01, [0.5], [], { lowerLimit: -1, upperLimit: 1 });
    expect(out[0]).toBe(0.5);
  });
  it('clamps to upper limit', () => {
    const block = Saturation.create();
    const [out] = block.compute(0.01, [5], [], { lowerLimit: -1, upperLimit: 1 });
    expect(out[0]).toBe(1);
  });
  it('clamps to lower limit', () => {
    const block = Saturation.create();
    const [out] = block.compute(0.01, [-5], [], { lowerLimit: -1, upperLimit: 1 });
    expect(out[0]).toBe(-1);
  });
});

describe('Deadzone block', () => {
  it('outputs 0 when input is within dead zone', () => {
    const block = Deadzone.create();
    const [out] = block.compute(0.01, [0.3], [], { start: -0.5, end: 0.5 });
    expect(out[0]).toBe(0);
  });
  it('passes input through when above dead zone', () => {
    const block = Deadzone.create();
    const [out] = block.compute(0.01, [2], [], { start: -0.5, end: 0.5 });
    expect(out[0]).toBe(2);
  });
  it('passes input through when below dead zone', () => {
    const block = Deadzone.create();
    const [out] = block.compute(0.01, [-2], [], { start: -0.5, end: 0.5 });
    expect(out[0]).toBe(-2);
  });
});