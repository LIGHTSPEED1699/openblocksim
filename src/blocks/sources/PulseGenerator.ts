import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const PulseGenerator = {
  category: BlockCategory.Source,
  create: () => ({
    type: BlockType.PulseGenerator,
    category: BlockCategory.Source,
    inputs: 0, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      amplitude: { type: 'number', default: 1, label: 'Amplitude' },
      period: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Period (s)' },
      dutyCycle: { type: 'number', default: 50, min: 0, max: 100, step: 1, label: 'Duty Cycle (%)' },
      phaseDelay: { type: 'number', default: 0, label: 'Phase Delay (s)' },
    },
    compute: (_dt, _inputs, _state, params, t = 0) => {
      const amplitude = params.amplitude as number;
      const period = params.period as number;
      const dutyCycle = params.dutyCycle as number;
      const phaseDelay = params.phaseDelay as number;
      if (period <= 0) return [[0], []];
      const phase = ((t - phaseDelay) % period + period) % period;
      const onDuration = period * dutyCycle / 100;
      return [[phase < onDuration ? amplitude : 0], []];
    },
  }),
} satisfies BlockFactory;