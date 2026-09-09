import { BlockCategory, BlockType } from './types';
import { getBlockMeta, listBlockTypes } from './meta';

export interface PaletteEntry {
  type: BlockType;
  math?: string;
  doc?: string;
}

export interface PaletteGroup {
  category: BlockCategory;
  label: string;
  entries: PaletteEntry[];
}

export const CATEGORY_LABEL: Record<BlockCategory, string> = {
  [BlockCategory.Source]: 'Sources',
  [BlockCategory.Sink]: 'Sinks',
  [BlockCategory.Math]: 'Math',
  [BlockCategory.Linear]: 'Linear',
  [BlockCategory.Discrete]: 'Discrete',
  [BlockCategory.Nonlinear]: 'Nonlinear',
  [BlockCategory.Control]: 'Control',
  [BlockCategory.Routing]: 'Routing',
  [BlockCategory.Annotation]: 'Annotation',
};

/** Existing palette header order (BlockLibrary BLOCK_GROUPS order). */
export const PALETTE_CATEGORY_ORDER: BlockCategory[] = [
  BlockCategory.Source,
  BlockCategory.Sink,
  BlockCategory.Math,
  BlockCategory.Linear,
  BlockCategory.Discrete,
  BlockCategory.Nonlinear,
  BlockCategory.Control,
  BlockCategory.Routing,
  BlockCategory.Annotation,
];

export function getPaletteGroups(): PaletteGroup[] {
  const groups = new Map<BlockCategory, PaletteGroup>(
    PALETTE_CATEGORY_ORDER.map((category) => [
      category,
      { category, label: CATEGORY_LABEL[category], entries: [] },
    ]),
  );
  for (const type of listBlockTypes()) {
    const entry = getBlockMeta(type);
    const group = groups.get(entry.category as BlockCategory) ?? groups.get(BlockCategory.Math)!;
    group.entries.push({ type, math: entry.math, doc: entry.doc });
  }
  return PALETTE_CATEGORY_ORDER.map((c) => groups.get(c)!);
}
