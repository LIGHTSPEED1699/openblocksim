import type { Node, Edge, XYPosition } from '@xyflow/react';
import type { SerializedGraph, SerializedBlock } from '../engine/types';
import { BlockType, Params } from '../blocks/types';
import { groupMemberIds, type GroupBox } from './groups';

export interface SubsystemConversionResult {
  subsystemJson: string;      // JSON persisted as params.subsystem
  inner: SerializedGraph;     // parsed form of subsystemJson
  subsystemNode: Node;        // RF node that replaces the group
  newNodes: Node[];           // surviving nodes + subsystemNode
  newEdges: Edge[];           // re-wired through subsystem ports + untouched edges
  removedMemberIds: string[];
}

function parseHandle(handle: string | null | undefined, prefix: 'in' | 'out'): number {
  if (!handle) return 0;
  const parts = handle.split('-');
  const i = parts.findIndex((p) => p === prefix);
  const v = parseInt(parts[i + 1] ?? '', 10);
  return isNaN(v) ? 0 : v;
}

type PortedEdge = Edge & { __targetPort: number; __sourcePort: number };

export function subsystemizeGroup(
  group: GroupBox,
  nodes: Node[],
  edges: Edge[],
): SubsystemConversionResult {
  const memberIds = groupMemberIds(group, nodes);
  const memberSet = new Set(memberIds);
  const members = nodes.filter((x) => memberSet.has(x.id));

  // origin: member-bbox top-left (fall back to the group origin when empty)
  let origin: XYPosition = { x: group.x, y: group.y };
  if (members.length > 0) {
    origin = {
      x: Math.min(...members.map((m) => m.position.x)),
      y: Math.min(...members.map((m) => m.position.y)),
    };
  }

  const withPorts = (e: Edge): PortedEdge =>
    ({ ...e, __targetPort: parseHandle(e.targetHandle, 'in'), __sourcePort: parseHandle(e.sourceHandle, 'out') });

  const inbound = edges
    .filter((e) => memberSet.has(e.target) && !memberSet.has(e.source))
    .map(withPorts)
    // stable order: (targetId, targetPort), then id for identical ports
    .sort((a, b) =>
      a.target === b.target
        ? (a.__targetPort - b.__targetPort) || a.id.localeCompare(b.id)
        : a.target.localeCompare(b.target),
    );
  const outbound = edges
    .filter((e) => memberSet.has(e.source) && !memberSet.has(e.target))
    .map(withPorts)
    .sort((a, b) =>
      a.source === b.source
        ? (a.__sourcePort - b.__sourcePort) || a.id.localeCompare(b.id)
        : a.source.localeCompare(b.source),
    );

  const subId = `Subsystem-${Date.now()}`;
  const innerBlocks: SerializedBlock[] = members.map((m) => ({
    id: m.id,
    type: m.data?.type as BlockType,
    params: {} as Params, // params are attached by the store action from store.params
    position: { x: m.position.x - origin.x, y: m.position.y - origin.y },
  }));
  const innerEdges: { id: string; source: string; sourcePort: number; target: string; targetPort: number }[] =
    edges
      .filter((e) => memberSet.has(e.source) && memberSet.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        sourcePort: parseHandle(e.sourceHandle, 'out'),
        target: e.target,
        targetPort: parseHandle(e.targetHandle, 'in'),
      }));

  inbound.forEach((e, k) => {
    innerBlocks.push({
      id: `sys-in-${k}`,
      type: BlockType.Inport,
      params: { port: k },
      position: { x: -60, y: 60 + k * 60 },
    });
    innerEdges.push({
      id: `sys-e-in-${k}`,
      source: `sys-in-${k}`,
      sourcePort: 0,
      target: e.target,
      targetPort: e.__targetPort,
    });
  });
  outbound.forEach((e, m) => {
    innerBlocks.push({
      id: `sys-out-${m}`,
      type: BlockType.Outport,
      params: { port: m },
      position: { x: 400, y: 60 + m * 60 },
    });
    innerEdges.push({
      id: `sys-e-out-${m}`,
      source: e.source,
      sourcePort: e.__sourcePort,
      target: `sys-out-${m}`,
      targetPort: 0,
    });
  });

  const inner: SerializedGraph = { blocks: innerBlocks, edges: innerEdges };
  const subsystemJson = JSON.stringify(inner);

  const subsystemNode: Node = {
    id: subId,
    type: 'Hierarchy',
    position: { x: group.x, y: group.y },
    data: { type: 'Subsystem', inputs: inbound.length, outputs: outbound.length, color: '' },
  };

  const newEdges = edges
    .filter((e) => !(memberSet.has(e.source) && memberSet.has(e.target))) // internal edges live inside now
    .map((e) => {
      if (memberSet.has(e.target) && !memberSet.has(e.source)) {
        const k = inbound.findIndex((p) => p.id === e.id);
        return { ...e, target: subId, targetHandle: `in-${k}` } as Edge;
      }
      if (memberSet.has(e.source) && !memberSet.has(e.target)) {
        const m = outbound.findIndex((p) => p.id === e.id);
        return { ...e, source: subId, sourceHandle: `out-${m}` } as Edge;
      }
      return e;
    });

  const newNodes = [
    ...nodes.filter((x) => !memberSet.has(x.id)),
    subsystemNode,
  ];

  return { subsystemJson, inner, subsystemNode, newNodes, newEdges, removedMemberIds: memberIds };
}
