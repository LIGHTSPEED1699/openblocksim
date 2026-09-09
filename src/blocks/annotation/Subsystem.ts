import { BlockType, BlockCategory, Params } from '../types';
import type { BlockFactory } from '../types';
import { parseInnerGraph, subsystemPortCounts } from '../../engine/subsystems';

export const Subsystem = {
  category: BlockCategory.Hierarchy,
  create: (params: Params = {}) => {
    let inputs = 0;
    let outputs = 0;
    const raw = params.subsystem;
    if (typeof raw === 'string' && raw.length > 0) {
      try {
        const io = subsystemPortCounts(parseInnerGraph(params));
        inputs = io.inputs;
        outputs = io.outputs;
      } catch {
        // malformed inner diagram → zero-IO shell; the real error surfaces at run time
      }
    }
    return {
      type: BlockType.Subsystem,
      category: BlockCategory.Hierarchy,
      inputs, outputs, isDynamic: false, stateSize: 0,
      stateUpdateMode: 'absolute' as const,
      parameters: {},
      compute: () => [[], []],
    };
  },
} satisfies BlockFactory;
