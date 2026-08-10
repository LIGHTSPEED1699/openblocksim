import { useEffect, useCallback, useRef } from 'react';
import { useReactFlow, addEdge, type Connection } from '@xyflow/react';
import { wireGesture } from './edges/wireGesture';
import { isBackwardEdge, nodePortPosition, computeFeedbackRoute } from './edges/geometry';
import { useDiagramStore } from '../store/diagramStore';

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

export function WireOverlay({ onComplete, onCancel }: Props) {
  const rf = useReactFlow();
  const completedRef = useRef(false);

  const parsePortIndex = (handleId: string) =>
    parseInt(handleId.split('-').pop() ?? '0', 10) || 0;

  const completeWire = useCallback(
    (targetNodeId: string, targetHandleId: string) => {
      if (completedRef.current) return;
      const gesture = wireGesture.get();
      if (!gesture.active || !gesture.source) return;
      completedRef.current = true;

      const connection: Connection = {
        source: gesture.source.nodeId,
        target: targetNodeId,
        sourceHandle: gesture.source.handleId,
        targetHandle: targetHandleId,
      };

      const edges = useDiagramStore.getState().edges;
      let waypoints = gesture.planted;

      if (waypoints.length === 0) {
        const srcNode = rf.getNode(connection.source!);
        const tgtNode = rf.getNode(connection.target!);
        if (srcNode && tgtNode && isBackwardEdge(srcNode, tgtNode)) {
          const srcPortIdx = parsePortIndex(connection.sourceHandle!);
          const tgtPortIdx = parsePortIndex(connection.targetHandle!);
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

      useDiagramStore.getState().setEdges(addEdge(newEdge, edges) as any);
      wireGesture.reset();
      onComplete();
    },
    [rf, onComplete],
  );

  const cancelWire = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    wireGesture.reset();
    onCancel();
  }, [onCancel]);

  const onPointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      const overlay = e.currentTarget as HTMLElement;
      overlay.setPointerCapture(e.pointerId);
      wireGesture.set({ pointerId: e.pointerId });
    },
    [],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const gesture = wireGesture.get();
      if (!gesture.active) return;
      const flowPos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });

      const overlay = e.currentTarget as HTMLElement;
      const prevPE = overlay.style.pointerEvents;
      overlay.style.pointerEvents = 'none';
      const el = document.elementFromPoint(e.clientX, e.clientY);
      overlay.style.pointerEvents = prevPE;

      if (el) {
        const handleEl = (el as HTMLElement).closest?.('[data-handleid]') as HTMLElement | null;
        if (handleEl) {
          const nodeId = handleEl.closest?.('[data-id]')?.getAttribute('data-id');
          const handleId = handleEl.getAttribute('data-handleid');
          if (nodeId && handleId && nodeId !== gesture.source?.nodeId) {
            completeWire(nodeId, handleId);
            return;
          }
        }
      }

      wireGesture.set({ planted: [...gesture.planted, flowPos] });
    },
    [rf, completeWire],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!wireGesture.get().active) return;
      const flowPos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      wireGesture.set({ cursor: flowPos });
    },
    [rf],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelWire();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancelWire]);

  useEffect(() => {
    return () => {
      if (!completedRef.current) {
        wireGesture.reset();
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1000,
        pointerEvents: 'all',
        cursor: 'crosshair',
      }}
      onPointerDownCapture={onPointerDownCapture}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onDoubleClick={cancelWire}
    />
  );
}