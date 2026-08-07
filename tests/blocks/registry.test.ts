import { describe, it, expect } from 'vitest';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType, BlockCategory } from '../../src/blocks/types';

describe('BlockRegistry', () => {
  it('registers and creates a block by type', () => {
    const registry = new BlockRegistry();
    registry.register(BlockType.Constant, {
      category: BlockCategory.Source,
      create: () => ({
        type: BlockType.Constant,
        category: BlockCategory.Source,
        inputs: 0, outputs: 1, isDynamic: false, stateSize: 0,
        stateUpdateMode: 'absolute',
        parameters: { value: { type: 'number', default: 1, label: 'Value' } },
        compute: (_dt, _inputs, _state, params) => [[params.value as number], []],
      }),
    });

    const block = registry.create(BlockType.Constant, { value: 42 });
    expect(block.type).toBe(BlockType.Constant);
    expect(block.outputs).toBe(1);
    const [outputs] = block.compute(0.01, [], [], { value: 42 });
    expect(outputs[0]).toBe(42);
  });

  it('throws on unknown block type', () => {
    const registry = new BlockRegistry();
    expect(() => registry.create(BlockType.Constant, {})).toThrow('Unknown block type');
  });

  it('lists all registered block types grouped by category', () => {
    const registry = new BlockRegistry();
    registry.register(BlockType.Constant, {
      category: BlockCategory.Source,
      create: () => ({
        type: BlockType.Constant, category: BlockCategory.Source,
        inputs: 0, outputs: 1, isDynamic: false, stateSize: 0,
        stateUpdateMode: 'absolute',
        parameters: {}, compute: () => [[1], []],
      }),
    });
    registry.register(BlockType.Scope, {
      category: BlockCategory.Sink,
      create: () => ({
        type: BlockType.Scope, category: BlockCategory.Sink,
        inputs: 1, outputs: 0, isDynamic: false, stateSize: 0,
        stateUpdateMode: 'absolute',
        parameters: {}, compute: () => [[], []],
      }),
    });

    const grouped = registry.listByCategory();
    expect(grouped[BlockCategory.Source]).toContain(BlockType.Constant);
    expect(grouped[BlockCategory.Sink]).toContain(BlockType.Scope);
  });
});