import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Sum = {
  category: BlockCategory.Math,
  create: () => ({
    type: BlockType.Sum,
    category: BlockCategory.Math,
    inputs: 2, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      signs: { type: 'array', default: [1, 1], label: 'Signs (1 or -1)' },
    },
    compute: (_dt, inputs, _state, params) => {
      const signs = params.signs as number[];
      const result = inputs.reduce((sum, val, i) => sum + val * (signs[i] ?? 1), 0);
      return [[result], []];
    },
  }),
} satisfies BlockFactory;