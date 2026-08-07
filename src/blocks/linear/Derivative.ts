import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Derivative = {
  category: BlockCategory.Linear,
  create: () => ({
    type: BlockType.Derivative,
    category: BlockCategory.Linear,
    inputs: 1, outputs: 1, isDynamic: true, stateSize: 1,
    stateUpdateMode: 'derivative' as const,
    parameters: {
      initialValue: { type: 'number', default: 0, label: 'Initial Previous Input' },
    },
    compute: (dt, inputs, state) => {
      if (dt === 0) return [[0], [inputs[0]]];
      const derivative = (inputs[0] - state[0]) / dt;
      return [[derivative], [inputs[0]]];
    },
  }),
} satisfies BlockFactory;