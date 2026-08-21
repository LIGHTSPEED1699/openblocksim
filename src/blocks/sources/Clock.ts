import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Clock = {
  category: BlockCategory.Source,
  create: () => ({
    type: BlockType.Clock,
    category: BlockCategory.Source,
    inputs: 0, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {},
    compute: (_dt, _inputs, _state, _params, t = 0) => [[t], []],
  }),
} satisfies BlockFactory;