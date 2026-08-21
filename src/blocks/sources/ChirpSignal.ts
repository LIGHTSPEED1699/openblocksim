import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const ChirpSignal = {
  category: BlockCategory.Source,
  create: () => ({
    type: BlockType.ChirpSignal,
    category: BlockCategory.Source,
    inputs: 0, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      amplitude: { type: 'number', default: 1, label: 'Amplitude' },
      startFreq: { type: 'number', default: 0.1, min: 0, step: 0.1, label: 'Start Frequency (Hz)' },
      targetFreq: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Target Frequency (Hz)' },
      sweepTime: { type: 'number', default: 10, min: 0, step: 0.1, label: 'Sweep Time (s)' },
    },
    compute: (_dt, _inputs, _state, params, t = 0) => {
      const amplitude = params.amplitude as number;
      const startFreq = params.startFreq as number;
      const targetFreq = params.targetFreq as number;
      const sweepTime = params.sweepTime as number;
      // Linear chirp: instantaneous frequency varies linearly
      // freq(t) = startFreq + (targetFreq - startFreq) * min(t/sweepTime, 1)
      // Phase = integral of 2*pi*freq(t) dt = 2*pi * [startFreq*t + (targetFreq-startFreq)/(2*sweepTime) * t^2] for t < sweepTime
      // After sweep: phase = 2*pi * [startFreq*sweepTime + (targetFreq-startFreq)*sweepTime/2 + targetFreq*(t-sweepTime)]
      let phase: number;
      if (sweepTime <= 0 || t >= sweepTime) {
        const sweepEnd = sweepTime <= 0 ? 0 : sweepTime;
        const sweepPhase = 2 * Math.PI * (startFreq * sweepEnd + (targetFreq - startFreq) * sweepEnd / 2);
        phase = sweepPhase + 2 * Math.PI * targetFreq * (t - sweepEnd);
      } else {
        phase = 2 * Math.PI * (startFreq * t + (targetFreq - startFreq) / (2 * sweepTime) * t * t);
      }
      return [[amplitude * Math.sin(phase)], []];
    },
  }),
} satisfies BlockFactory;