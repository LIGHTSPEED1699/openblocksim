import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const UnaryMinus = {
  category: BlockCategory.Math,
  create: () => ({
    type: BlockType.UnaryMinus,
    category: BlockCategory.Math,
    inputs: 1, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {},
    compute: (_dt, inputs, _state, _params) => {
      return [[-inputs[0]], []];
    },
  }),
} satisfies BlockFactory;