import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const TrigFunction = {
  category: BlockCategory.Math,
  create: () => ({
    type: BlockType.TrigFunction,
    category: BlockCategory.Math,
    inputs: 1, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      mode: { type: 'select', default: 'sin', label: 'Function',
        description: 'sin, cos, tan, asin, acos, atan, atan2, sinh, cosh, tanh' },
      secondInput: { type: 'number', default: 1, label: 'Second input (atan2 mode)' },
    },
    compute: (_dt, inputs, _state, params) => {
      const x = inputs[0];
      const mode = params.mode as string;
      let y: number;
      switch (mode) {
        case 'cos': y = Math.cos(x); break;
        case 'tan': y = Math.tan(x); break;
        case 'asin': y = Math.asin(x); break;
        case 'acos': y = Math.acos(x); break;
        case 'atan': y = Math.atan(x); break;
        case 'atan2': y = Math.atan2(x, params.secondInput as number); break;
        case 'sinh': y = Math.sinh(x); break;
        case 'cosh': y = Math.cosh(x); break;
        case 'tanh': y = Math.tanh(x); break;
        default: y = Math.sin(x);
      }
      return [[y], []];
    },
  }),
} satisfies BlockFactory;