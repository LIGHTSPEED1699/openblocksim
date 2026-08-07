import { describe, it, expect } from 'vitest';
import { PID } from '../../src/blocks/control/PID';
import { Relay } from '../../src/blocks/control/Relay';

describe('PID block', () => {
  it('has stateSize 2 and isDynamic true', () => {
    const block = PID.create();
    expect(block.isDynamic).toBe(true);
    expect(block.stateSize).toBe(2);
  });
  it('proportional-only output = Kp * error', () => {
    const block = PID.create();
    const [out] = block.compute(0.01, [5], [0, 0], { Kp: 2, Ki: 0, Kd: 0 });
    expect(out[0]).toBeCloseTo(10, 5);
  });
  it('includes integral term from state', () => {
    const block = PID.create();
    const [out] = block.compute(0.01, [5], [3, 0], { Kp: 1, Ki: 2, Kd: 0 });
    // output = Kp*input + Ki*state[0] + Kd*(input-state[1])/dt
    // = 1*5 + 2*3 + 0 = 11
    expect(out[0]).toBeCloseTo(11, 5);
  });
  it('includes derivative term', () => {
    const block = PID.create();
    const [out] = block.compute(0.1, [5], [0, 2], { Kp: 1, Ki: 0, Kd: 0.5 });
    // output = 1*5 + 0 + 0.5*(5-2)/0.1 = 5 + 15 = 20
    expect(out[0]).toBeCloseTo(20, 5);
  });
  it('state_dot[0] = input (integral), state_dot[1] = (input - state[1]) / dt', () => {
    const block = PID.create();
    const [, stateDot] = block.compute(0.1, [5], [0, 2], { Kp: 1, Ki: 0, Kd: 0 });
    expect(stateDot[0]).toBe(5);
    expect(stateDot[1]).toBeCloseTo(30, 5); // (5-2)/0.1
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
});