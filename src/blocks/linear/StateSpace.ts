import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, Params } from '../types';

function to1D(v: number[] | number): number[] {
  return Array.isArray(v) ? v : [v];
}

export const StateSpace = {
  category: BlockCategory.Linear,
  create: (params: Params = {}) => {
    const A = to1D((params.A as number[] | number) ?? [0, 1, -1, -2]);
    const n = Math.max(1, Math.round(Math.sqrt(A.length)));
    const B = to1D((params.B as number[] | number) ?? new Array(n).fill(0).map((_, i) => (i === n - 1 ? 1 : 0)));
    const C = to1D((params.C as number[] | number) ?? new Array(n).fill(0).map((_, i) => (i === 0 ? 1 : 0)));
    const inputs = B.length / n; // columns of B
    const outputs = C.length / n; // rows of C
    return {
      type: BlockType.StateSpace,
      category: BlockCategory.Linear,
      inputs, outputs, outputSize: outputs, isDynamic: true, stateSize: n,
      stateUpdateMode: 'derivative' as const,
      parameters: {
        A: { type: 'array', default: [0, 1, -1, -2], label: 'A matrix (row-major, n x n)' },
        B: { type: 'array', default: [0, 1], label: 'B matrix (row-major, n x m)' },
        C: { type: 'array', default: [1, 0], label: 'C matrix (row-major, p x n)' },
        D: { type: 'array', default: [0], label: 'D matrix (row-major, p x m)' },
      },
      compute: (_dt, inputsArr, state, params: Params) => {
        const a = to1D(params.A as number[] | number);
        const b = to1D(params.B as number[] | number);
        const c = to1D(params.C as number[] | number);
        const d = to1D(params.D as number[] | number);
        const size = state.length;
        const numInputs = b.length / size;
        const numOutputs = c.length / size;

        // state_dot = A*state + B*u
        const stateDot: number[] = new Array(size).fill(0);
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            stateDot[i] += a[i * size + j] * state[j];
          }
          for (let k = 0; k < numInputs; k++) {
            stateDot[i] += b[i * numInputs + k] * (inputsArr[k] ?? 0);
          }
        }

        // y = C*state + D*u
        const output: number[] = new Array(numOutputs).fill(0);
        for (let q = 0; q < numOutputs; q++) {
          for (let j = 0; j < size; j++) {
            output[q] += c[q * size + j] * state[j];
          }
          for (let k = 0; k < numInputs; k++) {
            output[q] += d[q * numInputs + k] * (inputsArr[k] ?? 0);
          }
        }

        return [output, stateDot];
      },
    };
  },
} satisfies BlockFactory;
