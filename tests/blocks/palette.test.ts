import { describe, it, expect } from 'vitest';
import { getPaletteGroups, PALETTE_CATEGORY_ORDER, CATEGORY_LABEL } from '../../src/blocks/palette';
import { listBlockTypes } from '../../src/blocks/meta';
import { BlockType, BlockCategory } from '../../src/blocks/types';

describe('getPaletteGroups', () => {
  it('covers every block type exactly once across the 9 groups', () => {
    const groups = getPaletteGroups();
    expect(groups.map((g) => g.label)).toEqual([
      'Sources', 'Sinks', 'Math', 'Linear', 'Discrete', 'Nonlinear', 'Control', 'Routing', 'Annotation',
    ]);
    const seen = groups.flatMap((g) => g.entries).map((e) => e.type);
    expect(seen.length).toBe(Object.values(BlockType).length);
    expect(new Set(seen).size).toBe(seen.length); // no duplicates
    for (const type of Object.values(BlockType)) {
      expect(seen).toContain(type);
    }
  });

  it('puts Pow and Clip in the Math group (currently missing from the palette)', () => {
    const math = getPaletteGroups().find((g) => g.label === 'Math')!;
    const types = math.entries.map((e) => e.type);
    expect(types).toContain(BlockType.Pow);
    expect(types).toContain(BlockType.Clip);
  });

  it('assigns the Source group label "Sources" and preserves meta declaration order', () => {
    const groups = getPaletteGroups();
    expect(groups[0].label).toBe(CATEGORY_LABEL[BlockCategory.Source]);
    const metaOrder = listBlockTypes();
    const flat = groups.flatMap((g) => g.entries.map((e) => e.type));
    // Palette order is a stable sub-sequence of meta order within each category;
    // assert the first three entries match the first three meta types' group membership.
    expect(flat.slice(0, 10)).toEqual(metaOrder.slice(0, 10));
  });

  it('labels categories with the plural only for Source/Sink', () => {
    expect(PALETTE_CATEGORY_ORDER).toHaveLength(9);
    expect(CATEGORY_LABEL[BlockCategory.Source]).toBe('Sources');
    expect(CATEGORY_LABEL[BlockCategory.Sink]).toBe('Sinks');
    expect(CATEGORY_LABEL[BlockCategory.Math]).toBe('Math');
  });
});
