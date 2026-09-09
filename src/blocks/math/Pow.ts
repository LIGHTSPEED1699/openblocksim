import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Pow = {
  category: BlockCategory.Math,
  create: () => ({
    type: BlockType.Pow,
    category: BlockCategory.Math,
    inputs: 1, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      exponent: { type: 'number', default: 2, label: 'Exponent' },
    },
    compute: (_dt, inputs, _state, params) => {
      return [[Math.pow(inputs[0], params.exponent as number)], []];
    },
  }),
} satisfies BlockFactory;
