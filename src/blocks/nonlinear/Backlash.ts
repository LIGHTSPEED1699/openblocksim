import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, BlockState } from '../types';

export const Backlash = {
  category: BlockCategory.Nonlinear,
  create: () => ({
    type: BlockType.Backlash,
    category: BlockCategory.Nonlinear,
    inputs: 1, outputs: 1, isDynamic: true, stateSize: 2,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      deadbandWidth: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Deadband Width' },
    },
    compute: (_dt, inputs, state, params) => {
      const deadband = params.deadbandWidth as number;
      const input = inputs[0];
      const prevOutput = state[0];
      const prevInput = state[1];

      const halfDeadband = deadband / 2;
      let output = prevOutput;

      if (input > prevInput) {
        // Moving up: output follows if input exceeds upper edge of deadband
        const upperEdge = prevOutput + halfDeadband;
        if (input > upperEdge) {
          output = input - halfDeadband;
        }
      } else if (input < prevInput) {
        // Moving down: output follows if input drops below lower edge of deadband
        const lowerEdge = prevOutput - halfDeadband;
        if (input < lowerEdge) {
          output = input + halfDeadband;
        }
      }

      return [[output], [output, input] as BlockState];
    },
  }),
} satisfies BlockFactory;