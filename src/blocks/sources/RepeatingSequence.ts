import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const RepeatingSequence = {
  category: BlockCategory.Source,
  create: () => ({
    type: BlockType.RepeatingSequence,
    category: BlockCategory.Source,
    inputs: 0, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      timeValues: { type: 'array', default: [0, 1, 2, 3], label: 'Time Values' },
      outputValues: { type: 'array', default: [0, 1, 0, 1], label: 'Output Values' },
    },
    compute: (_dt, _inputs, _state, params, t = 0) => {
      const timeValues = (params.timeValues as number[]) ?? [0, 1, 2, 3];
      const outputValues = (params.outputValues as number[]) ?? [0, 1, 0, 1];
      if (timeValues.length < 2 || outputValues.length < 2) return [[0], []];
      const period = timeValues[timeValues.length - 1] - timeValues[0];
      if (period <= 0) return [[outputValues[0]], []];
      // Wrap time into one period
      const tMod = ((t - timeValues[0]) % period + period) % period + timeValues[0];
      // Linear interpolation
      for (let i = 0; i < timeValues.length - 1; i++) {
        if (tMod >= timeValues[i] && tMod <= timeValues[i + 1]) {
          const fraction = (tMod - timeValues[i]) / (timeValues[i + 1] - timeValues[i]);
          const val = outputValues[i] + fraction * (outputValues[i + 1] - outputValues[i]);
          return [[val], []];
        }
      }
      return [[outputValues[outputValues.length - 1]], []];
    },
  }),
} satisfies BlockFactory;