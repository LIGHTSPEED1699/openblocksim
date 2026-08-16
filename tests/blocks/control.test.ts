import { describe, it, expect } from 'vitest';
import { PID } from '../../src/blocks/control/PID';
import { Relay } from '../../src/blocks/control/Relay';

describe('PID block (ISA standard form)', () => {
  it('has stateSize 2, isDynamic true, 2 inputs', () => {
    const block = PID.create();
    expect(block.isDynamic).toBe(true);
    expect(block.stateSize).toBe(2);
    expect(block.inputs).toBe(2);
    expect(block.outputs).toBe(1);
  });

  it('proportional-only: u = Kp * error (Ti=0, Td=0)', () => {
    const block = PID.create();
    // inputs: [error, pv]
    const [out] = block.compute(0.01, [5, 5], [0, 0], { Kp: 2, Ti: 0, Td: 0 });
    expect(out[0]).toBeCloseTo(10, 5);
  });

  it('integral term: u = Kp * [e + (1/Ti) * ∫e]', () => {
    const block = PID.create();
    // state[0] = integral = 3, error = 5, Ti = 2
    // u = Kp * [error + (1/Ti) * integral] = 1 * [5 + 0.5 * 3] = 6.5
    const [out] = block.compute(0.01, [5, 5], [3, 0], { Kp: 1, Ti: 2, Td: 0 });
    expect(out[0]).toBeCloseTo(6.5, 5);
  });

  it('derivative on PV: filtered derivative opposes PV change', () => {
    const block = PID.create();
    // error = 5, pv = 3, filteredPv = 2 (state[1]), Td = 0.5, N = 10
    // D term = Kp * N * (filteredPv - pv) = 1 * 10 * (2 - 3) = -10
    // P term = Kp * error = 5
    // u = 5 + 0 + (-10) = -5
    const [out] = block.compute(0.1, [5, 3], [0, 2], { Kp: 1, Ti: 0, Td: 0.5 });
    expect(out[0]).toBeCloseTo(-5, 5);
  });

  it('derivative opposes PV increase (no derivative kick on setpoint change)', () => {
    const block = PID.create();
    // Setpoint step: error jumps from 0 to 1, PV unchanged (still 0)
    // dPV/dt = 0 → D term = 0, no derivative kick
    const [out] = block.compute(0.1, [1, 0], [0, 0], { Kp: 1, Ti: 0, Td: 1 });
    expect(out[0]).toBeCloseTo(1, 5); // pure P, no D kick
  });

  it('derivative kicks when PV changes (correct behavior)', () => {
    const block = PID.create();
    // PV rising: pv=1, prevPv=0, dt=0.1 → dPV/dt = 10
    // D term = Kp * Td * (-10) = 1 * 1 * (-10) = -10
    // P term = Kp * error = 1 * 0.5 = 0.5
    // u = 0.5 + 0 + (-10) = -9.5
    const [out] = block.compute(0.1, [0.5, 1], [0, 0], { Kp: 1, Ti: 0, Td: 1 });
    expect(out[0]).toBeCloseTo(-9.5, 5);
  });

  it('state_dot[0] = error, state_dot[1] = (pv - filteredPv) / tau_d', () => {
    const block = PID.create();
    // Td=0 → tau_d = 0.1 (fallback), pv=3, filteredPv=2
    // stateDot[1] = (3 - 2) / 0.1 = 10
    const [, stateDot] = block.compute(0.1, [5, 3], [0, 2], { Kp: 1, Ti: 0, Td: 0 });
    expect(stateDot[0]).toBe(5);           // error
    expect(stateDot[1]).toBeCloseTo(10, 5); // (3-2)/0.1 = 10
  });

  it('Ti=0 disables integral (no division by zero)', () => {
    const block = PID.create();
    const [out] = block.compute(0.01, [5, 5], [100, 0], { Kp: 1, Ti: 0, Td: 0 });
    expect(out[0]).toBeCloseTo(5, 5); // pure P, integral ignored
  });

  it('falls back to error as PV when only 1 input provided', () => {
    const block = PID.create();
    // Single input: error=5, no PV → pv defaults to error=5
    // D term = Kp * N * (filteredPv - pv) = 1 * 10 * (2 - 5) = -30
    // P term = 5
    // u = 5 + 0 + (-30) = -25
    const [out] = block.compute(0.1, [5], [0, 2], { Kp: 1, Ti: 0, Td: 0.5 });
    expect(out[0]).toBeCloseTo(-25, 5);
  });
});

describe('Relay block', () => {
  it('has stateSize 1 and isDynamic true', () => {
    const block = Relay.create();
    expect(block.isDynamic).toBe(true);
    expect(block.stateSize).toBe(1);
  });
  it('turns on when input exceeds switchOn threshold', () => {
    const block = Relay.create();
    const [out, newState] = block.compute(0.01, [1], [-1], { onValue: 1, offValue: -1, switchOn: 0.5, switchOff: -0.5 });
    expect(out[0]).toBe(1);
    expect(newState[0]).toBe(1);
  });
  it('stays off when input is between thresholds', () => {
    const block = Relay.create();
    const [out, newState] = block.compute(0.01, [0], [-1], { onValue: 1, offValue: -1, switchOn: 0.5, switchOff: -0.5 });
    expect(out[0]).toBe(-1);
    expect(newState[0]).toBe(-1);
  });
  it('turns off when input drops below switchOff threshold', () => {
    const block = Relay.create();
    const [out, newState] = block.compute(0.01, [-1], [1], { onValue: 1, offValue: -1, switchOn: 0.5, switchOff: -0.5 });
    expect(out[0]).toBe(-1);
    expect(newState[0]).toBe(-1);
  });
  it('stays on when input is between thresholds', () => {
    const block = Relay.create();
    const [out, newState] = block.compute(0.01, [0], [1], { onValue: 1, offValue: -1, switchOn: 0.5, switchOff: -0.5 });
    expect(out[0]).toBe(1);
    expect(newState[0]).toBe(1);
  });
  it('snaps on from uninitialized (zero) state when input exceeds switchOn', () => {
    // The solver zero-initializes block state, so a freshly started relay
    // begins at 0 — neither onValue nor offValue. It must still turn on when
    // the input crosses the switch-on threshold.
    const block = Relay.create();
    const [out, newState] = block.compute(0.01, [1], [0], { onValue: 1, offValue: -1, switchOn: 0.5, switchOff: -0.5 });
    expect(out[0]).toBe(1);
    expect(newState[0]).toBe(1);
  });
  it('defaults to off from uninitialized (zero) state when input is below switchOn', () => {
    const block = Relay.create();
    const [out, newState] = block.compute(0.01, [0], [0], { onValue: 1, offValue: -1, switchOn: 0.5, switchOff: -0.5 });
    expect(out[0]).toBe(-1);
    expect(newState[0]).toBe(-1);
  });
});