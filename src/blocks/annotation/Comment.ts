import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Comment = {
  category: BlockCategory.Annotation,
  create: () => ({
    type: BlockType.Comment,
    category: BlockCategory.Annotation,
    inputs: 0, outputs: 0, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      text: { type: 'text', default: 'Double-click to edit', label: 'Text' },
    },
    compute: () => [[], []],
  }),
} satisfies BlockFactory;