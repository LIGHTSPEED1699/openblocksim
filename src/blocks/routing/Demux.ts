import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, Params } from '../types';

export const Demux = {
  category: BlockCategory.Routing,
  create: (params: Params = {}) => {
    const outputCount = Math.max(1, Math.min(8, (params.outputCount as number) ?? 2));
    return {
      type: BlockType.Demux,
      category: BlockCategory.Routing,
      inputs: 1, outputs: outputCount, isDynamic: false, stateSize: 0,
      stateUpdateMode: 'absolute' as const,
      parameters: {
        outputCount: { type: 'number', default: 2, min: 1, max: 8, step: 1, label: 'Output Count' },
      },
      compute: (_dt, inputs, _state, params: Params) => {
        // Split the input bus (a vector carried on the single input) into its
        // component signals. A scalar input is replicated across outputs.
        const n = Math.max(1, Math.round((params.outputCount as number) ?? 2));
        const bus = inputs[0];
        const parts = Array.isArray(bus) ? bus : new Array(n).fill(bus);
        const out: number[] = [];
        for (let i = 0; i < n; i++) out.push((parts as number[])[i] ?? 0);
        return [out, []];
      },
    };
  },
} satisfies BlockFactory;
