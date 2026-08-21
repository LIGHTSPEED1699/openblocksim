import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const MinMax = {
  category: BlockCategory.Math,
  create: () => ({
    type: BlockType.MinMax,
    category: BlockCategory.Math,
    inputs: 2, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      mode: { type: 'select', default: 'min', label: 'Mode',
        description: 'min or max' },
    },
    compute: (_dt, inputs, _state, params) => {
      const mode = params.mode as string;
      return [[mode === 'max' ? Math.max(inputs[0], inputs[1]) : Math.min(inputs[0], inputs[1])], []];
    },
  }),
} satisfies BlockFactory;