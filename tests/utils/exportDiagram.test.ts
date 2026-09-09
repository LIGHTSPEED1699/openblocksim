import { describe, it, expect } from 'vitest';
import { exportDiagramSvg } from '../../src/utils/exportDiagram';
import type { Node, Edge } from '@xyflow/react';

const mockNodes = [
  { id: 'src', position: { x: 0, y: 0 }, data: { type: 'Constant', inputs: 0, outputs: 1 }, measured: { width: 80, height: 40 } },
  { id: 'gain', position: { x: 200, y: 60 }, data: { type: 'Gain', inputs: 1, outputs: 1 }, measured: { width: 80, height: 40 } },
] as Node[];

const mockEdges = [
  { id: 'e1', source: 'src', target: 'gain', sourceHandle: 'out-0', targetHandle: 'in-0' },
] as Edge[];

describe('exportDiagram', () => {
  it('produces an SVG string', async () => {
    const svg = await exportDiagramSvg(mockNodes, mockEdges);
    expect(svg).toContain('<svg');
  });

  it('includes every node and edge in the diagram', async () => {
    const svg = await exportDiagramSvg(mockNodes, mockEdges);
    expect(svg).toContain('Constant');
    expect(svg).toContain('Gain');
    expect(svg).toContain('e1');
  });

  it('renders an empty diagram as a valid svg', async () => {
    const svg = await exportDiagramSvg([], []);
    expect(svg).toContain('<svg');
  });

  it('draws flipped-source edge from the left edge', () => {
    const svg = exportDiagramSvg(
      [
        { id: 'src', position: { x: 0, y: 0 }, data: { type: 'Gain', inputs: 1, outputs: 1, flipped: true }, measured: { width: 80, height: 40 } },
        { id: 'tgt', position: { x: 200, y: 0 }, data: { type: 'Gain', inputs: 1, outputs: 1 }, measured: { width: 80, height: 40 } },
      ] as Node[],
      [{ id: 'e1', source: 'src', target: 'tgt', sourceHandle: 'out-0', targetHandle: 'in-0' }] as Edge[],
    );
    // source flipped → x1 = 0 (not 0 + 80); target unflipped → x2 = 200.
    expect(svg).toContain('x1="0"');
    expect(svg).toContain('x2="200"');
  });

  it('draws flipped-target edge ending at the right edge', () => {
    const svg = exportDiagramSvg(
      [
        { id: 'src', position: { x: 0, y: 0 }, data: { type: 'Gain', inputs: 1, outputs: 1 }, measured: { width: 80, height: 40 } },
        { id: 'tgt', position: { x: 200, y: 0 }, data: { type: 'Gain', inputs: 1, outputs: 1, flipped: true }, measured: { width: 80, height: 40 } },
      ] as Node[],
      [{ id: 'e1', source: 'src', target: 'tgt', sourceHandle: 'out-0', targetHandle: 'in-0' }] as Edge[],
    );
    // source unflipped → x1 = 0 + 80; target flipped → x2 = 200 + 80.
    expect(svg).toContain('x1="80"');
    expect(svg).toContain('x2="280"');
  });
});
