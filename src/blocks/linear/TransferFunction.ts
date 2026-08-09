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
      // Reverse num to ascending order (b_0, b_1, ..., b_m) for canonical form
      // Input num is descending: [s^m coeff, ..., s^0 coeff]
      // We need ascending: [b_0, b_1, ..., b_m] = [const, s coeff, ..., s^m coeff]
      const b = [...num].reverse().map((numVal) => numVal / den[0]);

      // Pad b to length n+1 (ascending: b_0, b_1, ..., b_n)
      const bPadded = [...b];
      while (bPadded.length < n + 1) bPadded.push(0);

      // Controllable canonical form (phase-variable):
      // For den = [a0, a1, ..., an] normalized to [1, a1/a0, ..., an/a0]
      // State: x1 = x[0], x2 = x[1], ..., xn = x[n-1]
      // x1_dot = x2, x2_dot = x3, ..., x_{n-1}_dot = xn
      // xn_dot = -(an)*x1 - (a_{n-1})*x2 - ... - (a1)*x_{n-1} + u
      //   (uses the LOWEST order coefficients a1..an, NOT the leading a0=1)
      //
      // y = b0*x1 + b1*x2 + ... + b_{n-1}*xn  (normalized numerator coefficients)
      //   + b_n*u (feedthrough, only if num degree == den degree)

      // Normalized coefficients: a[0]=1 (leading), a[1..n] are the rest
      // For the state equation we need a[n], a[n-1], ..., a[1] (high to low order of monic poly)
      // mapping to state[0], state[1], ..., state[n-1]
      // i.e., the LOWEST order coefficient a[n] multiplies the first state x1
      const stateDot: BlockState = new Array(n).fill(0);
      for (let i = 0; i < n - 1; i++) {
        stateDot[i] = state[i + 1];
      }
      stateDot[n - 1] = 0;
      for (let i = 0; i < n; i++) {
        stateDot[n - 1] -= a[n - i] * state[i]; // a[n]*x1 + a[n-1]*x2 + ... + a[1]*xn
      }
      stateDot[n - 1] += inputs[0];

      // Output: y = sum(b[i] * state[i]) for i=0..n-1
      // b coefficients are the NORMALIZED numerator: num[k]/den[0]
      // These map directly to state variables in phase-variable form
      let output = 0;
      for (let i = 0; i < n; i++) {
        output += bPadded[i] * state[i];
      }
      // Feedthrough if num degree == den degree (b[n] != 0)
      if (num.length === den.length) {
        output += bPadded[n] * inputs[0];
      }

      return [[output], stateDot];
    },
  }),
} satisfies BlockFactory;