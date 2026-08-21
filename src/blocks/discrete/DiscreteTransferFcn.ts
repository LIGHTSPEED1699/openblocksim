import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, BlockState } from '../types';

export const DiscreteTransferFcn = {
  category: BlockCategory.Discrete,
  create: () => ({
    type: BlockType.DiscreteTransferFcn,
    category: BlockCategory.Discrete,
    inputs: 1, outputs: 1, isDynamic: true,
    stateSize: 4, // default; compiler recalculates from num/den
    stateUpdateMode: 'absolute' as const,
    parameters: {
      num: { type: 'array', default: [1], label: 'Numerator coefficients (descending z)' },
      den: { type: 'array', default: [1, -0.5], label: 'Denominator coefficients (descending z)' },
    },
    compute: (_dt, inputs, state, params) => {
      const num = (params.num as number[]) ?? [1];
      const den = (params.den as number[]) ?? [1, -0.5];
      const n = den.length - 1; // number of past outputs
      const m = num.length - 1; // number of past inputs
      const stateLen = Math.max(n, m, 1);

      // Normalize by den[0]
      const b = num.map((v) => v / den[0]);
      const a = den.map((v) => v / den[0]);

      // state[0..n-1] = y[k-1], y[k-2], ...; state[n..n+m-1] = u[k-1], u[k-2], ...
      const prevOutputs = state.slice(0, n);
      const prevInputs = state.slice(n, n + m);

      // y[k] = b[0]*u[k] + sum(b[i]*u[k-i]) - sum(a[i]*y[k-i])
      let y = b[0] * inputs[0];
      for (let i = 1; i <= m; i++) {
        y += b[i] * (prevInputs[i - 1] ?? 0);
      }
      for (let i = 1; i <= n; i++) {
        y -= a[i] * (prevOutputs[i - 1] ?? 0);
      }

      // Shift state: new y[k] → front, shift old outputs; same for inputs
      const newOutputs = [y, ...prevOutputs].slice(0, n);
      const newInputs = [inputs[0], ...prevInputs].slice(0, m);
      const newState: BlockState = [...newOutputs, ...newInputs];

      // Pad to stateLen if needed
      while (newState.length < stateLen) newState.push(0);

      return [[y], newState];
    },
  }),
} satisfies BlockFactory;