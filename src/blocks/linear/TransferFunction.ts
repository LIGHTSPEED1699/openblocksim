import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, BlockState } from '../types';

export const TransferFunction = {
  category: BlockCategory.Linear,
  create: () => ({
    type: BlockType.TransferFunction,
    category: BlockCategory.Linear,
    inputs: 1, outputs: 1, isDynamic: true,
    stateSize: 2, // default for [1,1] den; compiler recalculates from den.length - 1
    stateUpdateMode: 'derivative' as const,
    parameters: {
      num: { type: 'array', default: [1], label: 'Numerator coefficients' },
      den: { type: 'array', default: [1, 1], label: 'Denominator coefficients' },
    },
    compute: (_dt, inputs, state, params) => {
      const num = (params.num as number[]) ?? [1];
      const den = (params.den as number[]) ?? [1, 1];
      const n = den.length - 1;
      // Normalize by den[0]
      const a = den.map((d) => d / den[0]);
      const b = num.map((numVal) => numVal / den[0]);

      // Pad b to length n+1
      const bPadded = [...b];
      while (bPadded.length < n + 1) bPadded.push(0);

      // Controllable canonical form:
      // state_dot[0..n-2] = state[1..n-1] (shift)
      // state_dot[n-1] = -a[0]*state[0] - a[1]*state[1] - ... - a[n-1]*state[n-1] + input
      const stateDot: BlockState = new Array(n).fill(0);
      for (let i = 0; i < n - 1; i++) {
        stateDot[i] = state[i + 1];
      }
      stateDot[n - 1] = 0;
      for (let i = 0; i < n; i++) {
        stateDot[n - 1] -= a[i] * state[i];
      }
      stateDot[n - 1] += inputs[0];

      // Output: y = sum(b[i] * state[i]) for i=0..n-1
      // Add feedthrough if num degree == den degree (b[n] != 0)
      let output = 0;
      for (let i = 0; i < n; i++) {
        output += bPadded[i] * state[i];
      }
      if (num.length === den.length) {
        output += bPadded[n] * inputs[0];
      }

      return [[output], stateDot];
    },
  }),
} satisfies BlockFactory;