import type { Node, Edge } from '@xyflow/react';
import type { Params } from '../blocks/types';

/** Maximum number of undo entries kept in memory per session (R-F1: bounded). */
export const HISTORY_LIMIT = 100;

/** A node's model content. React Flow transient fields (selected, dragging,
 *  measured, dimensions, …) are deliberately excluded so selection clicks and
 *  drag bookkeeping never create history entries or leak back on undo. */
export interface NodeModel {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

/** An edge's model content. Wire waypoints live inside `edge.data.waypoints`,
 *  so they round-trip through history for free (Feature H needs nothing extra). */
export interface EdgeModel {
  id: string;
  type?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: Record<string, unknown>;
}

/** Snapshot of everything undo/redo touches: the diagram model, nothing else. */
export interface DiagramDoc {
  nodes: NodeModel[];
  edges: EdgeModel[];
  params: Record<string, Params>;
}

export interface HistoryEntry {
  before: DiagramDoc;
  after: DiagramDoc;
  /** Optional coalescing key: consecutive mutations with the same key collapse into one entry. */
  key?: string;
}

export function snapshotDoc(nodes: Node[], edges: Edge[], params: Record<string, Params>): DiagramDoc {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: n.position.x, y: n.position.y },
      data: n.data,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      type: e.type,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      data: e.data,
    })),
    params,
  };
}

/** Structural equality over the normalized document. */
export function sameDoc(a: DiagramDoc, b: DiagramDoc): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Append `entry`, trimming the oldest entries once `limit` is exceeded. */
export function pushEntry(past: HistoryEntry[], entry: HistoryEntry, limit: number = HISTORY_LIMIT): HistoryEntry[] {
  const next = [...past, entry];
  return next.length > limit ? next.slice(next.length - limit) : next;
}
