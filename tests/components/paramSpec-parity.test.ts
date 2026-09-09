import { describe, it, expect } from 'vitest';
import { getBlockMeta } from '../../src/blocks/meta';
import { BlockType } from '../../src/blocks/types';

describe('BlockMeta drives the parameter panel', () => {
  it('provides a well-formed paramSpec for every block type', () => {
    for (const type of Object.values(BlockType)) {
      const entry = getBlockMeta(type);
      expect(entry, `meta missing ${type}`).toBeDefined();
      const spec = entry.paramSpec ?? {};
      for (const [key, ps] of Object.entries(spec)) {
        expect(['number', 'array', 'select', 'text'], `bad type for ${type}.${key}`).toContain(ps.type);
        expect(typeof ps.label).toBe('string');
        expect(ps.default, `no default for ${type}.${key}`).not.toBeUndefined();
      }
    }
  });
});
