import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Integrator = {
  category: BlockCategory.Linear,
  create: () => ({
    type: BlockType.Integrator,
    category: BlockCategory.Linear,
    inputs: 1, outputs: 1, isDynamic: true, stateSize: 1,
    stateUpdateMode: 'derivative' as const,
    parameters: {
      initialValue: { type: 'number', default: 0, label: 'Initial Value' },
    },
    compute: (_dt, inputs, state) => [[state[0]], [inputs[0]]],
  }),
} satisfies BlockFactory;