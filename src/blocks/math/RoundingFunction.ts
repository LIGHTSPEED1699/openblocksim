import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const RoundingFunction = {
  category: BlockCategory.Math,
  create: () => ({
    type: BlockType.RoundingFunction,
    category: BlockCategory.Math,
    inputs: 1, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      mode: { type: 'select', default: 'round', label: 'Rounding mode',
        description: 'round, floor, ceil, or fix (truncate toward zero)' },
    },
    compute: (_dt, inputs, _state, params) => {
      const x = inputs[0];
      const mode = params.mode as string;
      let y: number;
      switch (mode) {
        case 'floor': y = Math.floor(x); break;
        case 'ceil': y = Math.ceil(x); break;
        case 'fix': y = Math.sign(x) * Math.floor(Math.abs(x)); break;
        default: y = Math.round(x);
      }
      return [[y], []];
    },
  }),
} satisfies BlockFactory;