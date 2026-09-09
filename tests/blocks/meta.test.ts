import { describe, it, expect } from 'vitest';
import { getBlockMeta } from '../../src/blocks/meta';
import { BlockType } from '../../src/blocks/types';

describe('BlockMeta registry', () => {
  it('returns metadata for every registered block', () => {
    const m = getBlockMeta(BlockType.Integrator);
    expect(m).toBeDefined();
    expect(m.category).toBeTruthy();
    expect(m.math).toBeTruthy();
  });

  it('exposes an eventG hook on discontinuous blocks', () => {
    const m = getBlockMeta(BlockType.Relay);
    expect(typeof m.eventG).toBe('function');
  });

  it('has metadata for all block types', () => {
    for (const type of Object.values(BlockType)) {
      const m = getBlockMeta(type);
      expect(m).toBeDefined();
      expect(m.category).toBeTruthy();
    }
  });
});