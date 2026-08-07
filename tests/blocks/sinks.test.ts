import { describe, it, expect } from 'vitest';
import { Scope } from '../../src/blocks/sinks/Scope';
import { ToWorkspace } from '../../src/blocks/sinks/ToWorkspace';

describe('Scope block', () => {
  it('has 1 input, 0 outputs, not dynamic', () => {
    const block = Scope.create();
    expect(block.inputs).toBe(1);
    expect(block.outputs).toBe(0);
    expect(block.isDynamic).toBe(false);
  });
  it('produces no output', () => {
    const block = Scope.create();
    const [out] = block.compute(0.01, [42], [], {});
    expect(out).toHaveLength(0);
  });
});

describe('ToWorkspace block', () => {
  it('has 1 input, 0 outputs, not dynamic', () => {
    const block = ToWorkspace.create();
    expect(block.inputs).toBe(1);
    expect(block.outputs).toBe(0);
    expect(block.isDynamic).toBe(false);
  });
  it('produces no output', () => {
    const block = ToWorkspace.create();
    const [out] = block.compute(0.01, [99], [], {});
    expect(out).toHaveLength(0);
  });
});