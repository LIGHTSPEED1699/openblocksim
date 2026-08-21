import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, BlockState } from '../types';

export const UnitDelay = {
  category: BlockCategory.Discrete,
  create: () => ({
    type: BlockType.UnitDelay,
    category: BlockCategory.Discrete,
    inputs: 1, outputs: 1, isDynamic: true, stateSize: 1,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      initialValue: { type: 'number', default: 0, label: 'Initial Value' },
    },
    compute: (_dt, inputs, state) => {
      const output = state[0];
      const newState: BlockState = [inputs[0]];
      return [[output], newState];
    },
  }),
} satisfies BlockFactory;