import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, BlockState } from '../types';

/**
 * ISA Standard Form PID Controller
 *
 *   u = Kp · [e + (1/Ti)·∫e dt + Td·(−dPV/dt)]
 *
 * - Inputs: [0] = error (SP − PV), [1] = PV (process variable)
 * - Derivative acts on PV (not error) to avoid derivative kick on setpoint changes
 * - Ti in seconds (integral time), Td in seconds (derivative time)
 * - Set Ti = 0 for PD-only, Td = 0 for PI-only
 * - Anti-windup: integral accumulates via RK4 (state[0] = ∫e dt)
 * - state[1] = previous PV for derivative calculation
 */
export const PID = {
  category: BlockCategory.Control,
  create: () => ({
    type: BlockType.PID,
    category: BlockCategory.Control,
    inputs: 2, outputs: 1, isDynamic: true, stateSize: 2,
    stateUpdateMode: 'derivative' as const,
    parameters: {
      Kp: { type: 'number', default: 1, label: 'Proportional Gain (Kp)' },
      Ti: { type: 'number', default: 0, label: 'Integral Time Ti (s)' },
      Td: { type: 'number', default: 0, label: 'Derivative Time Td (s)' },
    },
    compute: (dt, inputs, state, params) => {
      const Kp = params.Kp as number;
      const Ti = params.Ti as number;
      const Td = params.Td as number;
      const error = inputs[0];
      const pv = inputs.length > 1 ? inputs[1] : inputs[0]; // fallback: if no PV, use error
      const integral = state[0];
      const prevPv = state[1];

      // P term
      const pTerm = Kp * error;

      // I term: Kp/Ti * ∫e dt (Ti=0 disables integral)
      const iTerm = Ti > 0 ? (Kp / Ti) * integral : 0;

      // D term: derivative on PV (negative because d(PV)/dt opposes error)
      // dPV/dt = (pv - prevPv) / dt
      const dPv = dt > 0 ? (pv - prevPv) / dt : 0;
      const dTerm = Kp * Td * (-dPv);

      const output = pTerm + iTerm + dTerm;

      // state_dot[0] = error (integral accumulates via RK4)
      // state_dot[1] = dPV/dt (RK4 integrates prevPv → tracks pv trajectory)
      const stateDot: BlockState = [error, dt > 0 ? (pv - prevPv) / dt : 0];

      return [[output], stateDot];
    },
  }),
} satisfies BlockFactory;