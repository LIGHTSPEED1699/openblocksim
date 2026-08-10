import { BlockType, BlockCategory } from '../types';
import type { BlockFactory, BlockState } from '../types';

/**
 * ISA Standard Form PID Controller with Filtered Derivative
 *
 *   u = Kp · [e + (1/Ti)·∫e dt + Td·(−dPV_f/dt)]
 *
 * - Inputs: [0] = error (SP − PV), [1] = PV (process variable)
 * - Derivative acts on PV (not error) to avoid derivative kick on setpoint changes
 * - Ti in seconds (integral time), Td in seconds (derivative time)
 * - Set Ti = 0 for PD-only, Td = 0 for PI-only
 *
 * Filtered derivative implementation:
 *   The derivative term uses a first-order high-pass filter instead of a
 *   finite difference. The filter transfer function is:
 *
 *     D(s) = Kp · Td · s / (1 + τ_d · s)
 *
 *   where τ_d = Td / N (N = derivative filter divisor, typically 5-10).
 *
 *   This is implemented as:
 *     state[0] = integral of error (∫e dt, integrated via RK4)
 *     state[1] = filtered PV (first-order lag of PV)
 *
 *     stateDot[0] = error
 *     stateDot[1] = (pv - state[1]) / τ_d
 *
 *     D term = Kp · N · (pv - state[1])
 *
 *   This avoids the 1/dt amplification of finite-difference derivatives
 *   and works correctly under RK4 integration (state[1] is a proper
 *   state variable with a real ODE, not a tracking heuristic).
 *
 *   When Td = 0, the derivative term is disabled (N is set to 1, τ_d = 0,
 *   state[1] tracks pv instantly, making D = 0).
 */
const DERIVATIVE_FILTER_N = 10; // standard filter divisor

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
    compute: (_dt, inputs, state, params) => {
      const Kp = params.Kp as number;
      const Ti = params.Ti as number;
      const Td = params.Td as number;
      const error = inputs[0];
      const pv = inputs.length > 1 ? inputs[1] : inputs[0];
      const integral = state[0];
      const filteredPv = state[1];

      // P term
      const pTerm = Kp * error;

      // I term: Kp/Ti * ∫e dt (Ti=0 disables integral)
      const iTerm = Ti > 0 ? (Kp / Ti) * integral : 0;

      // D term: filtered derivative on PV (negative — opposes PV change)
      // D = -Kp * N * (pv - filteredPv) = Kp * N * (filteredPv - pv)
      // When PV rises (pv > filteredPv), D is negative → reduces output → opposes change
      const dTerm = Td > 0 ? Kp * DERIVATIVE_FILTER_N * (filteredPv - pv) : 0;

      const output = pTerm + iTerm + dTerm;

      // stateDot[0] = error (integral accumulates via RK4)
      // stateDot[1] = (pv - filteredPv) / tau_d — first-order lag tracking PV
      // When Td = 0, tau_d is irrelevant (dTerm = 0), but we still track pv
      // to avoid stale state. Use tau_d = Td/N, fallback to small value if Td=0.
      const tauD = Td > 0 ? Td / DERIVATIVE_FILTER_N : 0.1;
      const stateDot: BlockState = [error, (pv - filteredPv) / tauD];

      return [[output], stateDot];
    },
  }),
} satisfies BlockFactory;