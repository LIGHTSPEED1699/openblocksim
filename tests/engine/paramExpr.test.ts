import { describe, it, expect } from 'vitest';
import { EXPR_PREFIX, isExpressionValue, compileExpression } from '../../src/engine/paramExpr';

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
