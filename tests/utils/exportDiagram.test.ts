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
});
