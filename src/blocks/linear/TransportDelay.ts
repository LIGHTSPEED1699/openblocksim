import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, BlockState } from '../types';

export const TransportDelay = {
  category: BlockCategory.Linear,
  create: () => ({
    type: BlockType.TransportDelay,
    category: BlockCategory.Linear,
    inputs: 1, outputs: 1, isDynamic: true,
    stateSize: 10, // default; compiler sets ceil(delayTime/dt)
    stateUpdateMode: 'absolute' as const, // ring buffer — absolute state update, not RK4 derivative
    parameters: {
      delayTime: { type: 'number', default: 0.1, min: 0, step: 0.01, label: 'Delay Time (s)' },
    },
    compute: (_dt, inputs, state, _params) => {
      // Shift-register approach: state[0] is oldest, state[bufSize-1] is most recent
      // Output = state[0] (oldest value = delayed by bufSize * dt)
      const output = state[0];

      // Return absolute new state: shift buffer, append current input
      // The compiler/solver applies this directly instead of integrating a derivative
      const newState: BlockState = state.slice(1);
      newState.push(inputs[0]);

      return [[output], newState];
    },
  }),
} satisfies BlockFactory;