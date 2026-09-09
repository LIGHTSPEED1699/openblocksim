import { describe, it, expect } from 'vitest';
import { EXPR_PREFIX, isExpressionValue, compileExpression, resolveExpressionParams } from '../../src/engine/paramExpr';

describe('isExpressionValue', () => {
  it('detects "="-prefixed strings only', () => {
    expect(EXPR_PREFIX).toBe('=');
    expect(isExpressionValue('=Kp*2')).toBe(true);
    expect(isExpressionValue('=')).toBe(true);
    expect(isExpressionValue('Kp*2')).toBe(false);
    expect(isExpressionValue(5)).toBe(false);
    expect(isExpressionValue([1, 2])).toBe(false);
  });
});

describe('compileExpression', () => {
  it('evaluates against a numeric scope with Math and pi/e available', () => {
    const fn = compileExpression('2*Kp + Math.sqrt(Ti) + pi');
    expect(fn({ Kp: 3, Ti: 4 })).toBeCloseTo(6 + 2 + Math.PI, 10);
  });

  it('supports array results and array scope values', () => {
    const fn = compileExpression('den.map((c) => c * gain)');
    expect(fn({ den: [1, 1], gain: 2 })).toEqual([2, 2]);
  });

  it('wraps unknown-name evaluation failures with the original cause', () => {
    const fn = compileExpression('Kp * 2');
    expect(() => fn({})).toThrow(/could not be evaluated/);
    try {
      fn({});
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('Expression "=Kp * 2" could not be evaluated');
      expect(msg).toContain('Kp is not defined');
    }
  });

  it('wraps syntax errors when the evaluator is called', () => {
    const fn = compileExpression('2 *');
    expect(() => fn({})).toThrow(/could not be evaluated.*Unexpected (end of input|token)/);
  });

  it('fails when a scope key is not a valid identifier (no usable argument)', () => {
    const fn = compileExpression('x + 1');
    // '2x' is filtered out of the argument list → 'x' is unresolvable inside the body.
    expect(() => fn({ '2x': 1 })).toThrow(/could not be evaluated.*x is not defined/);
  });
});

describe('resolveExpressionParams', () => {
  const numberKeys = (k: string) => ['stepTime', 'stepValue', 'gain', 'Kp', 'Ti', 'Td', 'a', 'b'].includes(k);

  it('resolves an expression that references an earlier plain param', () => {
    const input = { stepTime: 1, stepValue: '=2*stepTime' };
    const out = resolveExpressionParams('step', input, numberKeys);
    expect(out).toEqual({ stepTime: 1, stepValue: 2 });
    expect(input.stepValue).toBe('=2*stepTime'); // returns a new object; input untouched
  });

  it('resolves expressions referencing other expressions regardless of key order', () => {
    const out = resolveExpressionParams('pid', { Td: '=Ti/4', Ti: '=2*Kp', Kp: 4 }, numberKeys);
    expect(out).toEqual({ Td: 2, Ti: 8, Kp: 4 });
  });

  it('leaves plain strings (text params) untouched', () => {
    const out = resolveExpressionParams('c', { text: '=not an expression for us' }, () => false);
    expect(out).toEqual({ text: '=not an expression for us' });
  });

  it('throws with block and param names for an unresolvable expression', () => {
    expect(() =>
      resolveExpressionParams('g1', { gain: '=Kp*2' }, numberKeys),
    ).toThrow(/Cannot resolve expression parameter "gain" on block "g1" \(=Kp\*2\)/);
  });

  it('throws for a circular pair of expressions', () => {
    expect(() =>
      resolveExpressionParams('x', { a: '=b+1', b: '=a+1' }, numberKeys),
    ).toThrow(/Cannot resolve expression parameter/);
  });
});
