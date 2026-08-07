import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, BlockState } from '../types';

export const PID = {
  category: BlockCategory.Control,
  create: () => ({
    type: BlockType.PID,
    category: BlockCategory.Control,
    inputs: 1, outputs: 1, isDynamic: true, stateSize: 2,
    stateUpdateMode: 'derivative' as const,
    parameters: {
      Kp: { type: 'number', default: 1, label: 'Proportional Gain (Kp)' },
      Ki: { type: 'number', default: 0, label: 'Integral Gain (Ki)' },
      Kd: { type: 'number', default: 0, label: 'Derivative Gain (Kd)' },
    },
    compute: (dt, inputs, state, params) => {
      const Kp = params.Kp as number;
      const Ki = params.Ki as number;
      const Kd = params.Kd as number;
      const error = inputs[0];
      const integral = state[0];
      const prevError = state[1];

      const derivative = dt > 0 ? (error - prevError) / dt : 0;
      const output = Kp * error + Ki * integral + Kd * derivative;

      // state_dot[0] = error (integral accumulates)
      // state_dot[1] = (error - prevError) / dt (tracks error derivative)
      const stateDot: BlockState = [error, dt > 0 ? (error - prevError) / dt : 0];

      return [[output], stateDot];
    },
  }),
} satisfies BlockFactory;