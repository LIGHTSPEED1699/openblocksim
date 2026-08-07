import { BlockType, BlockCategory, Block, BlockFactory, Params } from './types';

export class BlockRegistry {
  private factories = new Map<BlockType, BlockFactory>();

  register(type: BlockType, factory: BlockFactory): void {
    this.factories.set(type, factory);
  }

  create(type: BlockType, params: Params = {}): Block {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`Unknown block type: ${type}`);
    }
    return factory.create(params);
  }

  listByCategory(): Record<BlockCategory, BlockType[]> {
    const grouped = {} as Record<BlockCategory, BlockType[]>;
    for (const [type, factory] of this.factories) {
      if (!grouped[factory.category]) {
        grouped[factory.category] = [];
      }
      grouped[factory.category].push(type);
    }
    return grouped;
  }

  has(type: BlockType): boolean {
    return this.factories.has(type);
  }
}