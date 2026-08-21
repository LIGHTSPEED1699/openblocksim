import { describe, it, expect } from 'vitest';
import { Sum } from '../../src/blocks/math/Sum';
import { Gain } from '../../src/blocks/math/Gain';
import { Product } from '../../src/blocks/math/Product';
import { Abs } from '../../src/blocks/math/Abs';
import { Sign } from '../../src/blocks/math/Sign';
import { Bias } from '../../src/blocks/math/Bias';
import { UnaryMinus } from '../../src/blocks/math/UnaryMinus';
import { Divide } from '../../src/blocks/math/Divide';
import { MinMax } from '../../src/blocks/math/MinMax';
import { RoundingFunction } from '../../src/blocks/math/RoundingFunction';
import { MathFunction } from '../../src/blocks/math/MathFunction';
import { TrigFunction } from '../../src/blocks/math/TrigFunction';

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

describe('Abs block', () => {
  it('returns absolute value of positive input', () => {
    const block = Abs.create();
    const [out] = block.compute(0.01, [5], [], {});
    expect(out[0]).toBe(5);
  });
  it('returns absolute value of negative input', () => {
    const block = Abs.create();
    const [out] = block.compute(0.01, [-7], [], {});
    expect(out[0]).toBe(7);
  });
  it('returns 0 for 0 input', () => {
    const block = Abs.create();
    const [out] = block.compute(0.01, [0], [], {});
    expect(out[0]).toBe(0);
  });
});

describe('Sign block', () => {
  it('returns 1 for positive input', () => {
    const block = Sign.create();
    const [out] = block.compute(0.01, [42], [], {});
    expect(out[0]).toBe(1);
  });
  it('returns -1 for negative input', () => {
    const block = Sign.create();
    const [out] = block.compute(0.01, [-3.14], [], {});
    expect(out[0]).toBe(-1);
  });
  it('returns 0 for zero input', () => {
    const block = Sign.create();
    const [out] = block.compute(0.01, [0], [], {});
    expect(out[0]).toBe(0);
  });
});

describe('Bias block', () => {
  it('adds bias to input', () => {
    const block = Bias.create({ bias: 5 });
    const [out] = block.compute(0.01, [3], [], { bias: 5 });
    expect(out[0]).toBe(8);
  });
  it('handles negative bias', () => {
    const block = Bias.create({ bias: -10 });
    const [out] = block.compute(0.01, [7], [], { bias: -10 });
    expect(out[0]).toBe(-3);
  });
  it('defaults bias to 0', () => {
    const block = Bias.create();
    const [out] = block.compute(0.01, [99], [], { bias: 0 });
    expect(out[0]).toBe(99);
  });
});

describe('UnaryMinus block', () => {
  it('negates positive input', () => {
    const block = UnaryMinus.create();
    const [out] = block.compute(0.01, [5], [], {});
    expect(out[0]).toBe(-5);
  });
  it('negates negative input', () => {
    const block = UnaryMinus.create();
    const [out] = block.compute(0.01, [-3], [], {});
    expect(out[0]).toBe(3);
  });
  it('negates zero', () => {
    const block = UnaryMinus.create();
    const [out] = block.compute(0.01, [0], [], {});
    expect(out[0]).toBe(-0);
  });
});

describe('Divide block', () => {
  it('divides first input by second', () => {
    const block = Divide.create();
    const [out] = block.compute(0.01, [12, 4], [], {});
    expect(out[0]).toBe(3);
  });
  it('handles negative division', () => {
    const block = Divide.create();
    const [out] = block.compute(0.01, [-12, 4], [], {});
    expect(out[0]).toBe(-3);
  });
  it('returns Infinity for divide by zero', () => {
    const block = Divide.create();
    const [out] = block.compute(0.01, [5, 0], [], {});
    expect(out[0]).toBe(Infinity);
  });
});

describe('MinMax block', () => {
  it('returns minimum in min mode', () => {
    const block = MinMax.create({ mode: 'min' });
    const [out] = block.compute(0.01, [3, 7], [], { mode: 'min' });
    expect(out[0]).toBe(3);
  });
  it('returns maximum in max mode', () => {
    const block = MinMax.create({ mode: 'max' });
    const [out] = block.compute(0.01, [3, 7], [], { mode: 'max' });
    expect(out[0]).toBe(7);
  });
  it('handles negative values in min mode', () => {
    const block = MinMax.create();
    const [out] = block.compute(0.01, [-5, 2], [], { mode: 'min' });
    expect(out[0]).toBe(-5);
  });
});

describe('RoundingFunction block', () => {
  it('rounds with default round mode', () => {
    const block = RoundingFunction.create();
    const [out] = block.compute(0.01, [3.6], [], { mode: 'round' });
    expect(out[0]).toBe(4);
  });
  it('floors with floor mode', () => {
    const block = RoundingFunction.create({ mode: 'floor' });
    const [out] = block.compute(0.01, [3.9], [], { mode: 'floor' });
    expect(out[0]).toBe(3);
  });
  it('ceils with ceil mode', () => {
    const block = RoundingFunction.create({ mode: 'ceil' });
    const [out] = block.compute(0.01, [3.1], [], { mode: 'ceil' });
    expect(out[0]).toBe(4);
  });
  it('truncates toward zero with fix mode (positive)', () => {
    const block = RoundingFunction.create({ mode: 'fix' });
    const [out] = block.compute(0.01, [3.7], [], { mode: 'fix' });
    expect(out[0]).toBe(3);
  });
  it('truncates toward zero with fix mode (negative)', () => {
    const block = RoundingFunction.create({ mode: 'fix' });
    const [out] = block.compute(0.01, [-3.7], [], { mode: 'fix' });
    expect(out[0]).toBe(-3);
  });
});

describe('MathFunction block', () => {
  it('computes exp by default', () => {
    const block = MathFunction.create();
    const [out] = block.compute(0.01, [0], [], { mode: 'exp' });
    expect(out[0]).toBeCloseTo(1);
  });
  it('computes log', () => {
    const block = MathFunction.create({ mode: 'log' });
    const [out] = block.compute(0.01, [Math.E], [], { mode: 'log' });
    expect(out[0]).toBeCloseTo(1);
  });
  it('computes log10', () => {
    const block = MathFunction.create({ mode: 'log10' });
    const [out] = block.compute(0.01, [1000], [], { mode: 'log10' });
    expect(out[0]).toBeCloseTo(3);
  });
  it('computes square', () => {
    const block = MathFunction.create({ mode: 'square' });
    const [out] = block.compute(0.01, [4], [], { mode: 'square' });
    expect(out[0]).toBe(16);
  });
  it('computes sqrt', () => {
    const block = MathFunction.create({ mode: 'sqrt' });
    const [out] = block.compute(0.01, [9], [], { mode: 'sqrt' });
    expect(out[0]).toBe(3);
  });
  it('computes 10^u', () => {
    const block = MathFunction.create({ mode: '10^u' });
    const [out] = block.compute(0.01, [2], [], { mode: '10^u' });
    expect(out[0]).toBe(100);
  });
  it('computes 2^u', () => {
    const block = MathFunction.create({ mode: '2^u' });
    const [out] = block.compute(0.01, [3], [], { mode: '2^u' });
    expect(out[0]).toBe(8);
  });
  it('computes power with exponent param', () => {
    const block = MathFunction.create({ mode: 'power', exponent: 3 });
    const [out] = block.compute(0.01, [2], [], { mode: 'power', exponent: 3 });
    expect(out[0]).toBe(8);
  });
});

describe('TrigFunction block', () => {
  it('computes sin by default', () => {
    const block = TrigFunction.create();
    const [out] = block.compute(0.01, [0], [], { mode: 'sin' });
    expect(out[0]).toBeCloseTo(0);
  });
  it('computes cos', () => {
    const block = TrigFunction.create({ mode: 'cos' });
    const [out] = block.compute(0.01, [0], [], { mode: 'cos' });
    expect(out[0]).toBeCloseTo(1);
  });
  it('computes tan', () => {
    const block = TrigFunction.create({ mode: 'tan' });
    const [out] = block.compute(0.01, [Math.PI / 4], [], { mode: 'tan' });
    expect(out[0]).toBeCloseTo(1, 5);
  });
  it('computes asin', () => {
    const block = TrigFunction.create({ mode: 'asin' });
    const [out] = block.compute(0.01, [1], [], { mode: 'asin' });
    expect(out[0]).toBeCloseTo(Math.PI / 2);
  });
  it('computes acos', () => {
    const block = TrigFunction.create({ mode: 'acos' });
    const [out] = block.compute(0.01, [0], [], { mode: 'acos' });
    expect(out[0]).toBeCloseTo(Math.PI / 2);
  });
  it('computes atan', () => {
    const block = TrigFunction.create({ mode: 'atan' });
    const [out] = block.compute(0.01, [0], [], { mode: 'atan' });
    expect(out[0]).toBeCloseTo(0);
  });
  it('computes atan2 with secondInput param', () => {
    const block = TrigFunction.create({ mode: 'atan2', secondInput: 1 });
    const [out] = block.compute(0.01, [1], [], { mode: 'atan2', secondInput: 1 });
    expect(out[0]).toBeCloseTo(Math.PI / 4);
  });
  it('computes sinh', () => {
    const block = TrigFunction.create({ mode: 'sinh' });
    const [out] = block.compute(0.01, [0], [], { mode: 'sinh' });
    expect(out[0]).toBeCloseTo(0);
  });
  it('computes cosh', () => {
    const block = TrigFunction.create({ mode: 'cosh' });
    const [out] = block.compute(0.01, [0], [], { mode: 'cosh' });
    expect(out[0]).toBeCloseTo(1);
  });
  it('computes tanh', () => {
    const block = TrigFunction.create({ mode: 'tanh' });
    const [out] = block.compute(0.01, [0], [], { mode: 'tanh' });
    expect(out[0]).toBeCloseTo(0);
  });
});