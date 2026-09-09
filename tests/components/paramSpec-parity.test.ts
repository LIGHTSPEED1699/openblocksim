import { describe, it, expect } from 'vitest';
import { PARAM_SPECS } from '../../src/components/ParameterPanel';
import { getBlockMeta } from '../../src/blocks/meta';
import { BlockType } from '../../src/blocks/types';

describe('PARAM_SPECS ↔ BlockMeta parity', () => {
  it('matches meta.paramSpec for every block type (pre-migration lock)', () => {
    for (const type of Object.values(BlockType)) {
      expect(PARAM_SPECS[type], `PARAM_SPECS missing ${type}`).toBeDefined();
      expect(getBlockMeta(type).paramSpec ?? {}, `paramSpec mismatch for ${type}`).toEqual(PARAM_SPECS[type]);
    }
  });
});
