import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, Params } from '../types';

// Linear interpolation between adjacent breakpoints, clamping outside range.
function interp1d(bp: number[], values: number[], u: number): number {
  if (u <= bp[0]) return values[0];
  const last = bp.length - 1;
  if (u >= bp[last]) return values[last];
  let i = 0;
  while (i < last - 1 && u > bp[i + 1]) i++;
  const span = bp[i + 1] - bp[i];
  const t = span === 0 ? 0 : (u - bp[i]) / span;
  return values[i] + t * (values[i + 1] - values[i]);
}

// Clamp an index into a table row/column search (bp ascending, u clamped above).
function findInterval(bp: number[], u: number): number {
  let i = 0;
  const last = bp.length - 1;
  if (u <= bp[0]) return 0;
  if (u >= bp[last]) return last - 1;
  while (i < last - 1 && u > bp[i + 1]) i++;
  return i;
}

// Bilinear interpolation over a row-major 2D table (rows = breakpoints on u0,
// columns = breakpoints2 on u1).
function interp2d(bp0: number[], bp1: number[], table: number[], u0: number, u1: number): number {
  const nCols = bp1.length;
  const i = findInterval(bp0, u0);
  const j = findInterval(bp1, u1);
  const t0 = bp0[i + 1] === bp0[i] ? 0 : (u0 - bp0[i]) / (bp0[i + 1] - bp0[i]);
  const t1 = bp1[j + 1] === bp1[j] ? 0 : (u1 - bp1[j]) / (bp1[j + 1] - bp1[j]);
  const c00 = table[i * nCols + j];
  const c10 = table[(i + 1) * nCols + j];
  const c01 = table[i * nCols + j + 1];
  const c11 = table[(i + 1) * nCols + j + 1];
  return c00 + (c10 - c00) * t0 + (c01 - c00) * t1 + (c00 - c10 - c01 + c11) * t0 * t1;
}

export const Interpolate = {
  category: BlockCategory.Math,
  create: (params: Params = {}) => {
    const is2D = ((params.breakpoints2 as number[] | undefined)?.length ?? 0) > 0;
    return {
      type: BlockType.Interpolate,
      category: BlockCategory.Math,
      inputs: is2D ? 2 : 1, outputs: 1, isDynamic: false, stateSize: 0,
      stateUpdateMode: 'absolute' as const,
      parameters: {
        breakpoints: { type: 'array', default: [0, 1, 2], label: 'Breakpoints (1st dim)' },
        breakpoints2: { type: 'array', default: [], label: 'Breakpoints (2nd dim, empty = 1D)' },
        table: { type: 'array', default: [0, 10, 20], label: 'Table values' },
      },
      compute: (_dt, inputs, _state, params: Params) => {
        const bp = (params.breakpoints as number[]) ?? [0, 1, 2];
        const bp2 = (params.breakpoints2 as number[]) ?? [];
        const table = (params.table as number[]) ?? bp.map((_, i) => i);
        if (bp2.length > 0 && table.length === bp.length * bp2.length) {
          return [[interp2d(bp, bp2, table, inputs[0] ?? 0, inputs[1] ?? 0)], []];
        }
        return [[interp1d(bp, table, inputs[0] ?? 0)], []];
      },
    };
  },
} satisfies BlockFactory;
