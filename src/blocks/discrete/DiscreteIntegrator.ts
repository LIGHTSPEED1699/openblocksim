import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const DiscreteIntegrator = {
  category: BlockCategory.Discrete,
  create: () => ({
    type: BlockType.DiscreteIntegrator,
    category: BlockCategory.Discrete,
    inputs: 1, outputs: 1, isDynamic: true, stateSize: 2,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      method: { type: 'select', default: 'forward-euler', label: 'Integration Method',
        description: 'forward-euler, backward-euler, or trapezoidal' },
      initialValue: { type: 'number', default: 0, label: 'Initial Value' },
    },
    compute: (dt, inputs, state, params) => {
      const method = params.method as string;
      const accumulated = state[0];
      const prevInput = state[1];
      let output: number;
      let newAccumulated: number;
      if (method === 'forward-euler') {
        output = accumulated;
        newAccumulated = accumulated + dt * inputs[0];
      } else if (method === 'backward-euler') {
        newAccumulated = accumulated + dt * inputs[0];
        output = newAccumulated;
      } else { // trapezoidal
        newAccumulated = accumulated + dt * (inputs[0] + prevInput) / 2;
        output = newAccumulated;
      }
      return [[output], [newAccumulated, inputs[0]]];
    },
  }),
} satisfies BlockFactory;