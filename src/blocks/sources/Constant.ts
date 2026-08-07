import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Constant = {
  category: BlockCategory.Source,
  create: () => ({
    type: BlockType.Constant,
    category: BlockCategory.Source,
    inputs: 0, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: { value: { type: 'number', default: 1, label: 'Value' } },
    compute: (_dt, _inputs, _state, params) => [[params.value as number], []],
  }),
} satisfies BlockFactory;