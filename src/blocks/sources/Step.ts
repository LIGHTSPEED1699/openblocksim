import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Step = {
  category: BlockCategory.Source,
  create: () => ({
    type: BlockType.Step,
    category: BlockCategory.Source,
    inputs: 0, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      stepTime: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Step Time' },
      stepValue: { type: 'number', default: 1, label: 'Step Value' },
    },
    compute: (_dt, _inputs, _state, params, t = 0) => {
      const stepTime = params.stepTime as number;
      const stepValue = params.stepValue as number;
      return [[t >= stepTime ? stepValue : 0], []];
    },
  }),
} satisfies BlockFactory;