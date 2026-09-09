import { describe, it, expect } from 'vitest';
import { BlockType, BlockCategory } from '../../src/blocks/types';
import { Inport } from '../../src/blocks/routing/Inport';
import { Outport } from '../../src/blocks/routing/Outport';
import { Subsystem } from '../../src/blocks/annotation/Subsystem';

describe('Inport/Outport/Subsystem factories', () => {
  it('Inport: 0 inputs, 1 output, port param, no state', () => {
    const blk = Inport.create({ port: 2 });
    expect(blk.type).toBe(BlockType.Inport);
    expect(blk.category).toBe(BlockCategory.Port);
    expect(blk.inputs).toBe(0);
    expect(blk.outputs).toBe(1);
    expect(blk.isDynamic).toBe(false);
    expect(blk.compute(0.01, [], [], { port: 2 })).toEqual([[0], []]);
  });

  it('Outport: 1 input, 0 outputs, no state', () => {
    const blk = Outport.create({ port: 0 });
    expect(blk.type).toBe(BlockType.Outport);
    expect(blk.inputs).toBe(1);
    expect(blk.outputs).toBe(0);
    expect(blk.compute(0.01, [5], [], { port: 0 })).toEqual([[], []]);
  });

  it('Subsystem without inner diagram is a zero-IO shell', () => {
    const blk = Subsystem.create({});
    expect(blk.type).toBe(BlockType.Subsystem);
    expect(blk.category).toBe(BlockCategory.Hierarchy);
    expect(blk.inputs).toBe(0);
    expect(blk.outputs).toBe(0);
  });

  it('Subsystem with an inner diagram reports its IO from the inner ports', () => {
    const inner = {
      blocks: [
        { id: 'ip0', type: BlockType.Inport, params: { port: 0 }, position: { x: 0, y: 0 } },
        { id: 'ip1', type: BlockType.Inport, params: { port: 1 }, position: { x: 0, y: 0 } },
        { id: 'g', type: BlockType.Gain, params: { gain: 1 }, position: { x: 0, y: 0 } },
        { id: 'op0', type: BlockType.Outport, params: { port: 0 }, position: { x: 0, y: 0 } },
      ],
      edges: [
        { id: 'a', source: 'ip0', sourcePort: 0, target: 'g', targetPort: 0 },
        { id: 'b', source: 'g', sourcePort: 0, target: 'op0', targetPort: 0 },
      ],
    };
    const blk = Subsystem.create({ subsystem: JSON.stringify(inner) });
    expect(blk.inputs).toBe(2);
    expect(blk.outputs).toBe(1);
  });
});
