import { describe, it, expect } from 'vitest';
import { Sum } from '../../src/blocks/math/Sum';
import { Gain } from '../../src/blocks/math/Gain';
import { Product } from '../../src/blocks/math/Product';

describe('Sum block', () => {
  it('adds two inputs with default positive signs', () => {
    const block = Sum.create();
    const [out] = block.compute(0.01, [3, 4], [], { signs: [1, 1] });
    expect(out[0]).toBe(7);
  });
  it('subtracts second input when sign is -1', () => {
    const block = Sum.create({ signs: [1, -1] });
    const [out] = block.compute(0.01, [10, 3], [], { signs: [1, -1] });
    expect(out[0]).toBe(7);
  });
});

describe('Gain block', () => {
  it('multiplies input by gain', () => {
    const block = Gain.create({ gain: 5 });
    const [out] = block.compute(0.01, [3], [], { gain: 5 });
    expect(out[0]).toBe(15);
  });
  it('handles negative gain', () => {
    const block = Gain.create();
    const [out] = block.compute(0.01, [4], [], { gain: -2 });
    expect(out[0]).toBe(-8);
  });
  it('handles zero gain', () => {
    const block = Gain.create();
    const [out] = block.compute(0.01, [99], [], { gain: 0 });
    expect(out[0]).toBe(0);
  });
});

describe('Product block', () => {
  it('multiplies two inputs', () => {
    const block = Product.create();
    const [out] = block.compute(0.01, [3, 4], [], {});
    expect(out[0]).toBe(12);
  });
  it('handles negative inputs', () => {
    const block = Product.create();
    const [out] = block.compute(0.01, [-3, 4], [], {});
    expect(out[0]).toBe(-12);
  });
});