import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const ToWorkspace = {
  category: BlockCategory.Sink,
  create: () => ({
    type: BlockType.ToWorkspace,
    category: BlockCategory.Sink,
    inputs: 1, outputs: 0, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {},
    compute: () => [[], []],
  }),
} satisfies BlockFactory;