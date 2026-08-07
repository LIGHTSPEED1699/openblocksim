import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Square = {
  category: BlockCategory.Source,
  create: () => ({
    type: BlockType.Square,
    category: BlockCategory.Source,
    inputs: 0, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      amplitude: { type: 'number', default: 1, label: 'Amplitude' },
      frequency: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Frequency (Hz)' },
      phase: { type: 'number', default: 0, label: 'Phase (rad)' },
    },
    compute: (_dt, _inputs, _state, params, t = 0) => {
      const { amplitude, frequency, phase } = params as Record<string, number>;
      const val = Math.sin(2 * Math.PI * frequency * t + phase);
      return [[val >= 0 ? amplitude : -amplitude], []];
    },
  }),
} satisfies BlockFactory;