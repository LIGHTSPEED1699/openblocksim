import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Integrator = {
  category: BlockCategory.Linear,
  create: () => {
    return {
      type: BlockType.Integrator,
      category: BlockCategory.Linear,
      inputs: 1, outputs: 1, isDynamic: true, stateSize: 1,
      stateUpdateMode: 'derivative' as const,
      parameters: {
        initialValue: { type: 'number', default: 0, label: 'Initial Value' },
        upperLimit: { type: 'number', default: Infinity, label: 'Upper Limit (Infinity=none)' },
        lowerLimit: { type: 'number', default: -Infinity, label: 'Lower Limit (-Infinity=none)' },
      },
      compute: (_dt, inputs, state, params) => {
        const upper = (params.upperLimit as number) ?? Infinity;
        const lower = (params.lowerLimit as number) ?? -Infinity;
        // Clamp output to saturation limits
        const output = Math.max(lower, Math.min(upper, state[0]));
        // Clamp state_dot: if at limit and input would push beyond, zero the derivative
        let stateDot = inputs[0];
        if (output >= upper && inputs[0] > 0) stateDot = 0;
        if (output <= lower && inputs[0] < 0) stateDot = 0;
        return [[output], [stateDot]];
      },
    };
  },
} satisfies BlockFactory;