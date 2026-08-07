import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Ramp = {
  category: BlockCategory.Source,
  create: () => ({
    type: BlockType.Ramp,
    category: BlockCategory.Source,
    inputs: 0, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      startTime: { type: 'number', default: 0, min: 0, step: 0.1, label: 'Start Time' },
      slope: { type: 'number', default: 1, label: 'Slope' },
    },
    compute: (_dt, _inputs, _state, params, t = 0) => {
      const startTime = params.startTime as number;
      const slope = params.slope as number;
      return [[t <= startTime ? 0 : slope * (t - startTime)], []];
    },
  }),
} satisfies BlockFactory;