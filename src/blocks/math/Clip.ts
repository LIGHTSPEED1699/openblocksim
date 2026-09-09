import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Clip = {
  category: BlockCategory.Math,
  create: () => ({
    type: BlockType.Clip,
    category: BlockCategory.Math,
    inputs: 1, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      min: { type: 'number', default: -1, label: 'Lower Limit' },
      max: { type: 'number', default: 1, label: 'Upper Limit' },
    },
    compute: (_dt, inputs, _state, params) => {
      const min = params.min as number;
      const max = params.max as number;
      const v = inputs[0];
      return [[v < min ? min : v > max ? max : v], []];
    },
  }),
} satisfies BlockFactory;
