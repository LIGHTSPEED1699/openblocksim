import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, Params } from '../types';

export const Product = {
  category: BlockCategory.Math,
  create: (params: Params = {}) => {
    const inputCount = Math.max(2, Math.min(4, (params.inputCount as number) ?? 2));
    return {
      type: BlockType.Product,
      category: BlockCategory.Math,
      inputs: inputCount, outputs: 1, isDynamic: false, stateSize: 0,
      stateUpdateMode: 'absolute' as const,
      parameters: {
        inputCount: { type: 'number', default: 2, min: 2, max: 4, step: 1, label: 'Input Count' },
        operators: { type: 'text', default: '*,*', label: 'Operators (* or /, comma-separated)' },
      },
      compute: (_dt, inputs, _state, params) => {
        const opStr = (params.operators as string) ?? '*,*';
        const operators = opStr.split(',').map((s) => s.trim());
        let result = inputs[0] ?? 1;
        for (let i = 1; i < inputs.length; i++) {
          if (operators[i] === '/') {
            result /= inputs[i] || Infinity;
          } else {
            result *= inputs[i];
          }
        }
        return [[result], []];
      },
    };
  },
} satisfies BlockFactory;