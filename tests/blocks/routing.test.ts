import { describe, it, expect } from 'vitest';
import { Switch } from '../../src/blocks/routing/Switch';
import { BlockType, BlockCategory } from '../../src/blocks/types';

describe('Switch block', () => {
  it('passes through input1 when control >= threshold (default >=, threshold 0)', () => {
    const block = Switch.create();
    const [out] = block.compute(0.01, [5, 1, 3], [], { threshold: 0, condition: 'u2>=threshold' });
    expect(out[0]).toBe(5);
  });

  it('passes through input3 when control < threshold (default >=, threshold 0)', () => {
    const block = Switch.create();
    const [out] = block.compute(0.01, [5, -1, 3], [], { threshold: 0, condition: 'u2>=threshold' });
    expect(out[0]).toBe(3);
  });

  it('passes through input1 when control > threshold (strict > condition)', () => {
    const block = Switch.create({ condition: 'u2>threshold' });
    const [out] = block.compute(0.01, [10, 0, 20], [], { threshold: 0, condition: 'u2>threshold' });
    expect(out[0]).toBe(20); // 0 > 0 is false → input3
  });

  it('passes through input1 when control strictly greater than threshold', () => {
    const block = Switch.create({ condition: 'u2>threshold' });
    const [out] = block.compute(0.01, [10, 1, 20], [], { threshold: 0, condition: 'u2>threshold' });
    expect(out[0]).toBe(10); // 1 > 0 is true → input1
  });

  it('respects custom threshold', () => {
    const block = Switch.create({ threshold: 5 });
    const [out] = block.compute(0.01, [10, 5, 20], [], { threshold: 5, condition: 'u2>=threshold' });
    expect(out[0]).toBe(10); // 5 >= 5 → input1
  });

  it('passes input3 when control equals threshold with strict > condition', () => {
    const block = Switch.create({ threshold: 5, condition: 'u2>threshold' });
    const [out] = block.compute(0.01, [10, 5, 20], [], { threshold: 5, condition: 'u2>threshold' });
    expect(out[0]).toBe(20); // 5 > 5 is false → input3
  });

  it('has correct metadata', () => {
    const block = Switch.create();
    expect(block.type).toBe(BlockType.Switch);
    expect(block.category).toBe(BlockCategory.Routing);
    expect(block.inputs).toBe(3);
    expect(block.outputs).toBe(1);
    expect(block.isDynamic).toBe(false);
    expect(block.stateSize).toBe(0);
  });

  it('has correct default parameters', () => {
    const block = Switch.create();
    expect(block.parameters.threshold.default).toBe(0);
    expect(block.parameters.threshold.type).toBe('number');
    expect(block.parameters.condition.default).toBe('u2>=threshold');
    expect(block.parameters.condition.type).toBe('select');
  });
});