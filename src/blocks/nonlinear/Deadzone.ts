import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Deadzone = {
  category: BlockCategory.Nonlinear,
  create: () => ({
    type: BlockType.Deadzone,
    category: BlockCategory.Nonlinear,
    inputs: 1, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      start: { type: 'number', default: -0.5, label: 'Dead Zone Start' },
      end: { type: 'number', default: 0.5, label: 'Dead Zone End' },
    },
    compute: (_dt, inputs, _state, params) => {
      const start = params.start as number;
      const end = params.end as number;
      const val = inputs[0];
      if (val >= start && val <= end) return [[0], []];
      return [[val], []];
    },
  }),
} satisfies BlockFactory;