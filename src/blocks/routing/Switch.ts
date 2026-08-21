import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Switch = {
  category: BlockCategory.Routing,
  create: () => ({
    type: BlockType.Switch,
    category: BlockCategory.Routing,
    inputs: 3, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      threshold: { type: 'number', default: 0, label: 'Threshold' },
      condition: { type: 'select', default: 'u2>=threshold', label: 'Condition', description: 'u2 is the control input (input 2)' },
    },
    compute: (_dt, inputs, _state, p) => {
      const threshold = p.threshold as number;
      const condition = p.condition as string;
      const control = inputs[1];
      const pass = condition === 'u2>threshold' ? control > threshold : control >= threshold;
      return [[pass ? inputs[0] : inputs[2]], []];
    },
  }),
} satisfies BlockFactory;