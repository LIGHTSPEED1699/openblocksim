import { addEdge, type Connection, type Edge } from '@xyflow/react';
import { wireGesture } from './wireGesture';
import { isBackwardEdge, nodePortPosition, computeFeedbackRoute } from './geometry';
import { useDiagramStore } from '../../store/diagramStore';

function parsePortIndex(handleId: string | null | undefined): number {
  return parseInt((handleId ?? '').split('-').pop() ?? '0', 10) || 0;
}

/**
 * Shared connection completion path — prevents double-creation race between
 * WireOverlay.completeWire and DiagramCanvas.onConnect.
 *
 * Both callers funnel through this function. The `completed` flag in
 * wireGesture acts as the shared guard: whichever path runs first wins,
 * the other is a no-op.
 */
export function completeConnection(
  connection: Connection,
  getNode: (id: string) => { position: { x: number; y: number }; measured?: { height?: number }; data?: any } | undefined,
): boolean {
  const gesture = wireGesture.get();
  if (!gesture.active || gesture.completed) return false;
  wireGesture.set({ completed: true });

  const edges = useDiagramStore.getState().edges;
  let waypoints = gesture.planted;

  if (waypoints.length === 0) {
    const srcNode = getNode(connection.source!);
    const tgtNode = getNode(connection.target!);
    if (srcNode && tgtNode && isBackwardEdge(srcNode, tgtNode)) {
      const srcPortIdx = parsePortIndex(connection.sourceHandle);
      const tgtPortIdx = parsePortIndex(connection.targetHandle);
      const srcPort = nodePortPosition(srcNode, srcPortIdx, (srcNode.data as any)?.outputs ?? 1, true);
      const tgtPort = nodePortPosition(tgtNode, tgtPortIdx, (tgtNode.data as any)?.inputs ?? 1, false);
      const srcBottom = srcNode.position.y + (srcNode.measured?.height ?? 40);
      const tgtBottom = tgtNode.position.y + (tgtNode.measured?.height ?? 40);
      waypoints = computeFeedbackRoute(srcPort, tgtPort, srcBottom, tgtBottom);
    }
  }

  const newEdge = {
    ...connection,
    id: `e-${connection.source}-${connection.target}-${Date.now()}`,
    type: 'straight' as const,
    data: { waypoints },
  };

  useDiagramStore.getState().setEdges(addEdge(newEdge, edges) as Edge[]);
  wireGesture.set({ active: false, source: null, planted: [], cursor: null, pointerId: null, completed: false });
  return true;
}