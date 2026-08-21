import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const MathFunction = {
  category: BlockCategory.Math,
  create: () => ({
    type: BlockType.MathFunction,
    category: BlockCategory.Math,
    inputs: 1, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      mode: { type: 'select', default: 'exp', label: 'Function',
        description: 'exp, log, log10, square, sqrt, 10^u, 2^u, power' },
      exponent: { type: 'number', default: 2, label: 'Exponent (power mode)' },
    },
    compute: (_dt, inputs, _state, params) => {
      const x = inputs[0];
      const mode = params.mode as string;
      let y: number;
      switch (mode) {
        case 'log': y = Math.log(x); break;
        case 'log10': y = Math.log10(x); break;
        case 'square': y = x * x; break;
        case 'sqrt': y = Math.sqrt(x); break;
        case '10^u': y = Math.pow(10, x); break;
        case '2^u': y = Math.pow(2, x); break;
        case 'power': y = Math.pow(x, params.exponent as number); break;
        default: y = Math.exp(x);
      }
      return [[y], []];
    },
  }),
} satisfies BlockFactory;