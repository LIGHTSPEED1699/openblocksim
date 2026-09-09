import { describe, it, expect } from 'vitest';
import { StateSpace } from '../../src/blocks/linear/StateSpace';
import { Mux } from '../../src/blocks/routing/Mux';
import { Demux } from '../../src/blocks/routing/Demux';
import { BlockCategory } from '../../src/blocks/types';

describe('MIMO StateSpace block', () => {
  it('reports outputSize = rows of C for a 2-output MIMO system', () => {
    // x' = A x + B u, y = C x + D u
    // A 2x2, B 2x1, C 2x2, D 2x1 (flattened row-major, repo convention)
    const block = StateSpace.create({
      A: [0, 1, -2, -3],
      B: [0, 1],
      C: [1, 0, 0, 1],
      D: [0, 0],
    });
    expect(block.outputs).toBe(2);
    expect(block.outputSize).toBe(2);
  });

  it('computes 2 outputs from 2 state elements', () => {
    const block = StateSpace.create({
      A: [0, 1, -2, -3],
      B: [0, 1],
      C: [1, 0, 0, 1],
      D: [0, 0],
    });
    // state = [1, 2] → y = [1, 2]
    const [out, stateDot] = block.compute(0.01, [0], [1, 2], { A: [0, 1, -2, -3], B: [0, 1], C: [1, 0, 0, 1], D: [0, 0] });
    expect(out).toHaveLength(2);
    expect(out[0]).toBeCloseTo(1, 8);
    expect(out[1]).toBeCloseTo(2, 8);
    expect(stateDot).toHaveLength(2);
  });

  it('supports 2 inputs through the B and D matrices', () => {
    // B = [[1,0],[0,1]] (2x2), D = [[0,0],[0,0]] — each input drives one state
    const A = [0, 0, 0, 0];
    const B = [1, 0, 0, 1]; // 2 rows x 2 inputs, row-major
    const C = [1, 0, 0, 1];
    const D = [0, 0, 0, 0];
    const block = StateSpace.create({ A, B, C, D });
    expect(block.inputs).toBe(2);
    expect(block.outputs).toBe(2);
    const [out, stateDot] = block.compute(0.01, [3, 4], [5, 6], { A, B, C, D });
    // state_dot = A x + B u = [3, 4]; y = C x = [5, 6]
    expect(stateDot[0]).toBeCloseTo(3, 8);
    expect(stateDot[1]).toBeCloseTo(4, 8);
    expect(out[0]).toBeCloseTo(5, 8);
    expect(out[1]).toBeCloseTo(6, 8);
  });

  it('keeps SISO behavior as a special case', () => {
    const block = StateSpace.create();
    expect(block.inputs).toBe(1);
    expect(block.outputs).toBe(1);
  });
});

describe('Mux block', () => {
  it('is a routing block', () => {
    const m = Mux.create();
    expect(m.category).toBe(BlockCategory.Routing);
    expect(m.inputs).toBe(2);
    expect(m.outputs).toBe(1);
  });

  it('combines two signals into a bus', () => {
    const m = Mux.create();
    const [out] = m.compute(0, [1, 2], [], {});
    expect(out[0]).toEqual([1, 2]);
  });
});

describe('Demux block', () => {
  it('splits a bus into its component signals', () => {
    const d = Demux.create({ outputCount: 2 });
    expect(d.inputs).toBe(1);
    expect(d.outputs).toBe(2);
    const [out] = d.compute(0, [[1, 2] as unknown as number], [], { outputCount: 2 });
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(2);
  });
});
