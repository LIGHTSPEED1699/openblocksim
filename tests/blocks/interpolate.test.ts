import { describe, it, expect } from 'vitest';
import { Interpolate } from '../../src/blocks/math/Interpolate';
import { BlockCategory } from '../../src/blocks/types';

describe('Interpolate block', () => {
  it('is a static 1-input math block by default', () => {
    const b = Interpolate.create();
    expect(b.category).toBe(BlockCategory.Math);
    expect(b.inputs).toBe(1);
    expect(b.outputs).toBe(1);
    expect(b.isDynamic).toBe(false);
  });

  it('linearly interpolates a 1D table', () => {
    const b = Interpolate.create();
    // breakpoints [0,1,2] → table [0,10,20]; input 0.5 → 5
    const [out] = b.compute(0, [0.5], [], { breakpoints: [0, 1, 2], table: [0, 10, 20] });
    expect(out[0]).toBe(5);
  });

  it('interpolates within interior intervals', () => {
    const b = Interpolate.create();
    const [out] = b.compute(0, [1.5], [], { breakpoints: [0, 1, 2], table: [0, 10, 20] });
    expect(out[0]).toBe(15);
  });

  it('clamps outside the breakpoint range', () => {
    const b = Interpolate.create();
    const [lo] = b.compute(0, [-3], [], { breakpoints: [0, 1, 2], table: [0, 10, 20] });
    expect(lo[0]).toBe(0);
    const [hi] = b.compute(0, [5], [], { breakpoints: [0, 1, 2], table: [0, 10, 20] });
    expect(hi[0]).toBe(20);
  });

  it('exact breakpoints return the table value', () => {
    const b = Interpolate.create();
    const [out] = b.compute(0, [1], [], { breakpoints: [0, 1, 2], table: [0, 10, 20] });
    expect(out[0]).toBe(10);
  });

  it('supports a 2D table with bilinear interpolation', () => {
    const b = Interpolate.create({ breakpoints2: [0, 1, 2] });
    expect(b.inputs).toBe(2);
    // 3x3 grid rows over breakpoints [0,1,2], cols over [0,1,2]
    // value(x,y) = 10*x + 2*y:  u=0.5, v=0.5 -> 5 + 1 = 6
    const table = [0, 2, 4, 10, 12, 14, 20, 22, 24]; // row-major over x then y
    const [out] = b.compute(0, [0.5, 0.5], [], { breakpoints: [0, 1, 2], breakpoints2: [0, 1, 2], table });
    expect(out[0]).toBeCloseTo(6, 6);
  });
});
