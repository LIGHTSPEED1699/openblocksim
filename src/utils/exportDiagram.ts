import type { Node, Edge } from '@xyflow/react';
import { toPng } from 'html-to-image';

export type ExportableNode = Pick<Node, 'id' | 'position'> & {
  data?: {
    type?: string;
    label?: string;
    inputs?: number;
    outputs?: number;
    [key: string]: unknown;
  };
  measured?: { width: number; height: number } | null;
  width?: number | null;
  height?: number | null;
};

export type ExportableEdge = Pick<Edge, 'id' | 'source' | 'target'> & {
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

interface ExportOptions {
  padding?: number;
}

const DEFAULT_W = 80;
const DEFAULT_H = 44;

function nodeSize(node: ExportableNode): { w: number; h: number } {
  const w = node.measured?.width ?? node.width ?? DEFAULT_W;
  const h = node.measured?.height ?? node.height ?? DEFAULT_H;
  return { w, h };
}

function portIndex(handle: string | null | undefined): number {
  if (!handle) return 0;
  const parts = handle.split('-');
  const n = parseInt(parts[parts.length - 1], 10);
  return isNaN(n) ? 0 : n;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function handleY(port: number, count: number, h: number): number {
  const n = Math.max(count, 1);
  return ((port + 1) / (n + 1)) * h;
}

// Render the diagram (node bounds + edges) to a standalone SVG string.
// Grid/background are suppressed; geometry comes from node positions and
// measured sizes so export works headlessly without a live DOM layout.
export function exportDiagramSvg(
  nodes: ExportableNode[],
  edges: ExportableEdge[],
  options: ExportOptions = {}
): string {
  const padding = options.padding ?? 20;
  const sizes = new Map(nodes.map((n) => [n.id, nodeSize(n)]));

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const { w, h } = sizes.get(n.id)!;
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + w);
    maxY = Math.max(maxY, n.position.y + h);
  }
  if (nodes.length === 0) {
    minX = 0; minY = 0; maxX = 0; maxY = 0;
  }

  const viewX = minX - padding;
  const viewY = minY - padding;
  const viewW = maxX - minX + padding * 2;
  const viewH = maxY - minY + padding * 2;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${viewW}" height="${viewH}" viewBox="${viewX} ${viewY} ${viewW} ${viewH}">`
  );

  for (const e of edges) {
    const src = nodes.find((n) => n.id === e.source);
    const tgt = nodes.find((n) => n.id === e.target);
    if (!src || !tgt) continue;
    const sSize = sizes.get(src.id)!;
    const tSize = sizes.get(tgt.id)!;
    const srcOuts = src.data?.outputs ?? 1;
    const tgtIns = tgt.data?.inputs ?? 1;
    const srcFlipped = Boolean((src.data as { flipped?: boolean })?.flipped);
    const tgtFlipped = Boolean((tgt.data as { flipped?: boolean })?.flipped);
    const x1 = srcFlipped ? src.position.x : src.position.x + sSize.w;
    const y1 = src.position.y + handleY(portIndex(e.sourceHandle), srcOuts, sSize.h);
    const x2 = tgtFlipped ? tgt.position.x + tSize.w : tgt.position.x;
    const y2 = tgt.position.y + handleY(portIndex(e.targetHandle), tgtIns, tSize.h);
    parts.push(
      `<line id="${escapeXml(e.id)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1.5" />`
    );
  }

  for (const n of nodes) {
    const { w, h } = sizes.get(n.id)!;
    const label = n.data?.label ?? n.data?.type ?? n.id;
    parts.push(
      `<rect x="${n.position.x}" y="${n.position.y}" width="${w}" height="${h}" rx="4" fill="#ffffff" stroke="#64748b" stroke-width="1" />`,
      `<text x="${n.position.x + w / 2}" y="${n.position.y + h / 2}" text-anchor="middle" dominant-baseline="central" font-family="ui-monospace, monospace" font-size="11" fill="#1e293b">${escapeXml(String(label))}</text>`
    );
  }

  parts.push('</svg>');
  return parts.join('\n');
}

// Rasterize a DOM element (the React Flow canvas) to a PNG data URL and
// download it. React Flow's grid/background/controls decorations are filtered
// out so the export matches the diagram (bdsim-style clean output).
export async function exportDiagramPng(
  element: HTMLElement,
  filename = 'diagram.png'
): Promise<void> {
  const dataUrl = await toPng(element, {
    backgroundColor: 'transparent',
    pixelRatio: 2,
    filter: (node) => {
      if (!(node instanceof Element)) return true;
      const cls = node.classList;
      return !(
        cls?.contains('react-flow__background') ||
        cls?.contains('react-flow__controls') ||
        cls?.contains('react-flow__attribution') ||
        cls?.contains('react-flow__minimap')
      );
    },
  });
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
