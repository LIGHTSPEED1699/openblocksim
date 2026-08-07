import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Product = {
  category: BlockCategory.Math,
  create: () => ({
    type: BlockType.Product,
    category: BlockCategory.Math,
    inputs: 2, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {},
    compute: (_dt, inputs) => [[inputs[0] * inputs[1]], []],
  }),
} satisfies BlockFactory;