export const EXPR_PREFIX = '=';

export function isExpressionValue(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(EXPR_PREFIX);
}

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
// Names injected by the evaluator itself — scope keys colliding with them are skipped.
const RESERVED = new Set(['Math', 'pi', 'e']);

export function compileExpression(
  body: string,
): (scope: Record<string, number | number[] | string>) => number | number[] {
  const evaluator = (scope: Record<string, number | number[] | string>): number | number[] => {
    const usableKeys = Object.keys(scope).filter(
      (k) => IDENTIFIER_RE.test(k) && !RESERVED.has(k),
    );
    try {
      const fn = new Function(
        ...usableKeys,
        'Math',
        'pi',
        'e',
        `"use strict"; return (${body});`,
      ) as (
        ...args: Array<number | number[] | string | Math | number>
      ) => number | number[];
      return fn(
        ...usableKeys.map((k) => scope[k]),
        Math,
        Math.PI,
        Math.E,
      ) as number | number[];
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`Expression "=${body}" could not be evaluated: ${detail}`);
    }
  };
  return evaluator;
}
