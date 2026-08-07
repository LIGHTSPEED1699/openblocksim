import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, BlockState } from '../types';

export const StateSpace = {
  category: BlockCategory.Linear,
  create: () => ({
    type: BlockType.StateSpace,
    category: BlockCategory.Linear,
    inputs: 1, outputs: 1, isDynamic: true, stateSize: 2, // compiler recalculates from sqrt(A.length)
    stateUpdateMode: 'derivative' as const,
    parameters: {
      A: { type: 'array', default: [0, 1, -1, -2], label: 'A matrix (row-major)' },
      B: { type: 'array', default: [0, 1], label: 'B vector' },
      C: { type: 'array', default: [1, 0], label: 'C vector' },
      D: { type: 'array', default: [0], label: 'D value' },
    },
    compute: (_dt, inputs, state, params) => {
      const A = params.A as number[];
      const B = params.B as number[];
      const C = params.C as number[];
      const D = (params.D as number[])[0] ?? 0;
      const n = state.length;

      // state_dot = A*state + B*input
      const stateDot: BlockState = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          stateDot[i] += A[i * n + j] * state[j];
        }
        stateDot[i] += B[i] * inputs[0];
      }

      // output = C*state + D*input
      let output = D * inputs[0];
      for (let i = 0; i < n; i++) {
        output += C[i] * state[i];
      }

      return [[output], stateDot];
    },
  }),
} satisfies BlockFactory;