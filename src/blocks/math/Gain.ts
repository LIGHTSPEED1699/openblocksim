import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Gain = {
  category: BlockCategory.Math,
  create: () => ({
    type: BlockType.Gain,
    category: BlockCategory.Math,
    inputs: 1, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: { gain: { type: 'number', default: 1, label: 'Gain' } },
    compute: (_dt, inputs, _state, params) => {
      return [[inputs[0] * (params.gain as number)], []];
    },
  }),
} satisfies BlockFactory;