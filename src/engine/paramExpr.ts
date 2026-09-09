export const EXPR_PREFIX = '=';

export function isExpressionValue(value: unknown): value is string {
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

export function resolveExpressionParams(
  blockId: string,
  params: Record<string, number | number[] | string>,
  isNumberParam: (key: string) => boolean,
): Record<string, number | number[] | string> {
  const out: Record<string, number | number[] | string> = {};
  const pending: { key: string; body: string; lastErr: unknown }[] = [];

  // Pass 1: copy through non-expression values and collect expression params.
  for (const [key, value] of Object.entries(params)) {
    if (isNumberParam(key) && isExpressionValue(value)) {
      pending.push({ key, body: value.slice(EXPR_PREFIX.length), lastErr: undefined });
    } else {
      out[key] = value;
    }
  }

  // Passes 2..N: evaluate expressions against the growing scope until fixed point.
  for (let pass = 0; pass < 5 && pending.length > 0; pass++) {
    const stillPending: typeof pending = [];
    for (const item of pending) {
      const evaluator = compileExpression(item.body);
      try {
        const value = evaluator(out);
        if (value === undefined || (typeof value === 'number' && Number.isNaN(value))) {
          throw new TypeError('expression produced NaN/undefined');
        }
        out[item.key] = value;
      } catch (err) {
        item.lastErr = err;
        stillPending.push(item);
      }
    }
    if (stillPending.length === pending.length) break; // no progress this pass
    pending.splice(0, pending.length, ...stillPending);
  }

  if (pending.length > 0) {
    const first = pending[0];
    const detail = first.lastErr instanceof Error ? first.lastErr.message : String(first.lastErr);
    throw new Error(
      `Cannot resolve expression parameter "${first.key}" on block "${blockId}" (=${first.body}): ${detail}`,
    );
  }
  return out;
}
