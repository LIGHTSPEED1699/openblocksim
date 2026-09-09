import { describe, it, expect } from 'vitest';
import { Pow } from '../../src/blocks/math/Pow';
import { Clip } from '../../src/blocks/math/Clip';
import { BlockCategory } from '../../src/blocks/types';

describe('Pow block', () => {
  it('is a static math block', () => {
    const b = Pow.create();
    expect(b.category).toBe(BlockCategory.Math);
    expect(b.inputs).toBe(1);
    expect(b.outputs).toBe(1);
  });

  it('computes u^p', () => {
    const b = Pow.create();
    const [out] = b.compute(0, [3], [], { exponent: 2 });
    expect(out[0]).toBe(9);
  });

  it('handles fractional and negative exponents', () => {
    const b = Pow.create();
    const [sqrt] = b.compute(0, [9], [], { exponent: 0.5 });
    expect(sqrt[0]).toBeCloseTo(3, 8);
    const [inv] = b.compute(0, [2], [], { exponent: -1 });
    expect(inv[0]).toBeCloseTo(0.5, 8);
  });
});

describe('Clip block', () => {
  it('is a static math block with min/max params', () => {
    const b = Clip.create();
    expect(b.category).toBe(BlockCategory.Math);
    expect(b.inputs).toBe(1);
    expect(b.outputs).toBe(1);
  });

  it('saturates to [min,max]', () => {
    const b = Clip.create();
    const p = { min: -1, max: 1 };
    const [hi] = b.compute(0, [5], [], p);
    expect(hi[0]).toBe(1);
    const [lo] = b.compute(0, [-5], [], p);
    expect(lo[0]).toBe(-1);
    const [mid] = b.compute(0, [0.5], [], p);
    expect(mid[0]).toBe(0.5);
  });
});
