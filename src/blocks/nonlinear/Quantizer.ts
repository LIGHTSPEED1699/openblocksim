import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Quantizer = {
  category: BlockCategory.Nonlinear,
  create: () => ({
    type: BlockType.Quantizer,
    category: BlockCategory.Nonlinear,
    inputs: 1, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      quantum: { type: 'number', default: 0.5, min: 0, step: 0.1, label: 'Quantization Interval' },
    },
    compute: (_dt, inputs, _state, params) => {
      const quantum = params.quantum as number;
      const val = inputs[0];
      return [[Math.round(val / quantum) * quantum], []];
    },
  }),
} satisfies BlockFactory;