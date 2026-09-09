import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, Params } from '../types';

export const Outport = {
  category: BlockCategory.Port,
  create: (_params?: Params) => ({
    type: BlockType.Outport,
    category: BlockCategory.Port,
    inputs: 1, outputs: 0, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: { port: { type: 'number', default: 0, min: 0, label: 'Port #' } },
    compute: () => [[], []],
  }),
} satisfies BlockFactory;
