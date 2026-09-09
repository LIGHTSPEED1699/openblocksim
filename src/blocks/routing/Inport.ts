import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, Params } from '../types';

export const Inport = {
  category: BlockCategory.Port,
  create: (_params?: Params) => ({
    type: BlockType.Inport,
    category: BlockCategory.Port,
    inputs: 0, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: { port: { type: 'number', default: 0, min: 0, label: 'Port #' } },
    compute: () => [[0], []],
  }),
} satisfies BlockFactory;
