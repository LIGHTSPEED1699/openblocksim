import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const StopSimulation = {
  category: BlockCategory.Sink,
  create: () => ({
    type: BlockType.StopSimulation,
    category: BlockCategory.Sink,
    inputs: 1, outputs: 0, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {},
    // ponytail: StopSimulation is a flag-only sink. The solver checks
    // scopeInputs for StopSimulation blocks after each step and halts
    // if the input is nonzero. No state needed — the check is external.
    compute: () => [[], []],
  }),
} satisfies BlockFactory;