import { describe, it, expect } from 'vitest';
import { Terminator } from '../../src/blocks/sinks/Terminator';
import { Display } from '../../src/blocks/sinks/Display';
import { StopSimulation } from '../../src/blocks/sinks/StopSimulation';

describe('Terminator block', () => {
  it('has 1 input, 0 outputs, not dynamic', () => {
    const block = Terminator.create();
    expect(block.inputs).toBe(1);
    expect(block.outputs).toBe(0);
    expect(block.isDynamic).toBe(false);
  });
  it('produces empty output and state', () => {
    const block = Terminator.create();
    const [out, state] = block.compute(0.01, [5], [], {});
    expect(out).toEqual([]);
    expect(state).toEqual([]);
  });
});

describe('Display block', () => {
  it('has 1 input, 0 outputs, not dynamic', () => {
    const block = Display.create();
    expect(block.inputs).toBe(1);
    expect(block.outputs).toBe(0);
    expect(block.isDynamic).toBe(false);
  });
  it('produces empty output and state', () => {
    const block = Display.create();
    const [out, state] = block.compute(0.01, [42], [], {});
    expect(out).toEqual([]);
    expect(state).toEqual([]);
  });
});

describe('StopSimulation block', () => {
  it('has 1 input, 0 outputs, not dynamic', () => {
    const block = StopSimulation.create();
    expect(block.inputs).toBe(1);
    expect(block.outputs).toBe(0);
    expect(block.isDynamic).toBe(false);
  });
  it('produces empty output and state', () => {
    const block = StopSimulation.create();
    const [out, state] = block.compute(0.01, [1], [], {});
    expect(out).toEqual([]);
    expect(state).toEqual([]);
  });
});