import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

export const Relay = {
  category: BlockCategory.Control,
  create: () => ({
    type: BlockType.Relay,
    category: BlockCategory.Control,
    inputs: 1, outputs: 1, isDynamic: true, stateSize: 1,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      onValue: { type: 'number', default: 1, label: 'On Value' },
      offValue: { type: 'number', default: -1, label: 'Off Value' },
      switchOn: { type: 'number', default: 0.5, label: 'Switch On Threshold' },
      switchOff: { type: 'number', default: -0.5, label: 'Switch Off Threshold' },
    },
    compute: (_dt, inputs, state, params) => {
      const onValue = params.onValue as number;
      const offValue = params.offValue as number;
      const switchOn = params.switchOn as number;
      const switchOff = params.switchOff as number;
      const input = inputs[0];
      const currentState = state[0];

      // Hysteresis logic
      let newState: number;
      if (currentState === offValue && input >= switchOn) {
        newState = onValue;
      } else if (currentState === onValue && input <= switchOff) {
        newState = offValue;
      } else if (currentState !== onValue && currentState !== offValue) {
        // Uninitialized state: the solver zero-initializes block state, so the
        // relay starts at 0 (neither onValue nor offValue). Snap to a defined
        // state based on the input so the relay can begin switching. Above the
        // switch-on threshold → on; otherwise default to off (the relay sits
        // in the off state until the input rises past switchOn).
        newState = input >= switchOn ? onValue : offValue;
      } else {
        newState = currentState;
      }

      // Return absolute new state — solver applies directly, no RK4 integration
      return [[newState], [newState]];
    },
  }),
} satisfies BlockFactory;