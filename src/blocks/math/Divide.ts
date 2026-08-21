import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Divide = {
  category: BlockCategory.Math,
  create: () => ({
    type: BlockType.Divide,
    category: BlockCategory.Math,
    inputs: 2, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {},
    compute: (_dt, inputs, _state, _params) => {
      return [[inputs[1] === 0 ? Infinity : inputs[0] / inputs[1]], []];
    },
  }),
} satisfies BlockFactory;