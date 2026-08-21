import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, BlockState } from '../types';

export const RateLimiter = {
  category: BlockCategory.Nonlinear,
  create: () => ({
    type: BlockType.RateLimiter,
    category: BlockCategory.Nonlinear,
    inputs: 1, outputs: 1, isDynamic: true, stateSize: 1,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      risingSlew: { type: 'number', default: 1, label: 'Rising Slew Rate (units/s)' },
      fallingSlew: { type: 'number', default: -1, label: 'Falling Slew Rate (units/s)' },
    },
    compute: (dt, inputs, state, params) => {
      const risingSlew = params.risingSlew as number;
      const fallingSlew = params.fallingSlew as number;
      const prevOutput = state[0];
      const input = inputs[0];

      const maxChange = risingSlew * dt;
      const minChange = fallingSlew * dt;
      const delta = input - prevOutput;

      let output: number;
      if (delta > maxChange) {
        output = prevOutput + maxChange;
      } else if (delta < minChange) {
        output = prevOutput + minChange;
      } else {
        output = input;
      }

      return [[output], [output] as BlockState];
    },
  }),
} satisfies BlockFactory;