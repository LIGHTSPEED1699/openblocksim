import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, BlockState, Params } from '../types';
import { isSampleTime } from './sampleTime';

export const UnitDelay = {
  category: BlockCategory.Discrete,
  create: () => ({
    type: BlockType.UnitDelay,
    category: BlockCategory.Discrete,
    inputs: 1, outputs: 1, isDynamic: true, stateSize: 1,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      initialValue: { type: 'number', default: 0, label: 'Initial Value' },
      sampleTime: { type: 'number', default: 0, min: 0, step: 0.01, label: 'Sample Time (s, 0 = every step)' },
    },
    compute: (_dt, inputs, state, params: Params, t) => {
      const Ts = params.sampleTime as number | undefined;
      if (typeof Ts === 'number' && Ts > 0 && t !== undefined) {
        // ZOH: sample the input only at sample times, otherwise hold.
        if (!isSampleTime(t, Ts)) return [[state[0]], state];
        return [[inputs[0]], [inputs[0]]];
      }
      const output = state[0];
      const newState: BlockState = [inputs[0]];
      return [[output], newState];
    },
  }),
} satisfies BlockFactory;