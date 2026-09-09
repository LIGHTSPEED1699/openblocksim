import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, Params } from '../types';

export const Mux = {
  category: BlockCategory.Routing,
  create: (params: Params = {}) => {
    const inputCount = Math.max(2, Math.min(8, (params.inputCount as number) ?? 2));
    return {
      type: BlockType.Mux,
      category: BlockCategory.Routing,
      inputs: inputCount, outputs: 1, isDynamic: false, stateSize: 0,
      stateUpdateMode: 'absolute' as const,
      parameters: {
        inputCount: { type: 'number', default: 2, min: 2, max: 8, step: 1, label: 'Input Count' },
      },
      compute: (_dt, inputs, _state, _params: Params) => {
        // Combine scalar inputs into a vector bus carried on the single output.
        return [[[...inputs] as unknown as number], []];
      },
    };
  },
} satisfies BlockFactory;
