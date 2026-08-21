import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Sine = {
  category: BlockCategory.Source,
  create: () => ({
    type: BlockType.Sine,
    category: BlockCategory.Source,
    inputs: 0, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      amplitude: { type: 'number', default: 1, label: 'Amplitude' },
      frequency: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Frequency (Hz)' },
      phase: { type: 'number', default: 0, label: 'Phase (rad)' },
      bias: { type: 'number', default: 0, label: 'Bias (DC offset)' },
    },
    compute: (_dt, _inputs, _state, params, t = 0) => {
      const amplitude = params.amplitude as number;
      const frequency = params.frequency as number;
      const phase = params.phase as number;
      const bias = (params.bias as number) ?? 0;
      return [[amplitude * Math.sin(2 * Math.PI * frequency * t + phase) + bias], []];
    },
  }),
} satisfies BlockFactory;