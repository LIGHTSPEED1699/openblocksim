import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Saturation = {
  category: BlockCategory.Nonlinear,
  create: () => ({
    type: BlockType.Saturation,
    category: BlockCategory.Nonlinear,
    inputs: 1, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      lowerLimit: { type: 'number', default: -1, label: 'Lower Limit' },
      upperLimit: { type: 'number', default: 1, label: 'Upper Limit' },
    },
    compute: (_dt, inputs, _state, params) => {
      const lower = params.lowerLimit as number;
      const upper = params.upperLimit as number;
      const val = inputs[0];
      return [[Math.max(lower, Math.min(upper, val))], []];
    },
  }),
} satisfies BlockFactory;