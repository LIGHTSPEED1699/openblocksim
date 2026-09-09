import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, Params } from '../types';
import { isSampleTime } from './sampleTime';

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
      sampleTime: { type: 'number', default: 0, min: 0, step: 0.01, label: 'Sample Time (s, 0 = every step)' },
    },
    compute: (dt, inputs, state, params: Params, t) => {
      const method = params.method as string;
      const accumulated = state[0];
      const prevInput = state[1];
      const Ts = params.sampleTime as number | undefined;
      const zoh = typeof Ts === 'number' && Ts > 0 && t !== undefined;
      if (zoh && !isSampleTime(t, Ts)) {
        // ZOH: between sample times hold the last accumulated value.
        return [[accumulated], state];
      }
      const step = zoh ? Ts : dt;
      let output: number;
      let newAccumulated: number;
      if (method === 'forward-euler') {
        output = accumulated;
        newAccumulated = accumulated + step * inputs[0];
      } else if (method === 'backward-euler') {
        newAccumulated = accumulated + step * inputs[0];
        output = newAccumulated;
      } else { // trapezoidal
        newAccumulated = accumulated + step * (inputs[0] + prevInput) / 2;
        output = newAccumulated;
      }
      return [[output], [newAccumulated, inputs[0]]];
    },
  }),
} satisfies BlockFactory;