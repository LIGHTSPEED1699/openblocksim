import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Bias = {
  category: BlockCategory.Math,
  create: () => ({
    type: BlockType.Bias,
    category: BlockCategory.Math,
    inputs: 1, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: { bias: { type: 'number', default: 0, label: 'Bias' } },
    compute: (_dt, inputs, _state, params) => {
      return [[inputs[0] + (params.bias as number)], []];
    },
  }),
} satisfies BlockFactory;