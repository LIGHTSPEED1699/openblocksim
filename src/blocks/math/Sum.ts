import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, Params } from '../types';

export const Sum = {
  category: BlockCategory.Math,
  create: (params: Params = {}) => {
    const inputCount = Math.max(2, Math.min(8, (params.inputCount as number) ?? 2));
    return {
      type: BlockType.Sum,
      category: BlockCategory.Math,
      inputs: inputCount, outputs: 1, isDynamic: false, stateSize: 0,
      stateUpdateMode: 'absolute' as const,
      parameters: {
        inputCount: { type: 'number', default: 2, min: 2, max: 8, step: 1, label: 'Input Count' },
        signs: { type: 'array', default: [1, 1], label: 'Signs (1 or -1)' },
      },
      compute: (_dt, inputs, _state, params) => {
        const signs = params.signs as number[];
        const result = inputs.reduce((sum, val, i) => sum + val * (signs[i] ?? 1), 0);
        return [[result], []];
      },
    };
  },
} satisfies BlockFactory;