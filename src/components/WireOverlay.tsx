import { useEffect, useCallback } from 'react';
import { useReactFlow, type Connection } from '@xyflow/react';
import { wireGesture } from './edges/wireGesture';
import { completeConnection } from './edges/completeConnection';

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

export function WireOverlay({ onComplete, onCancel }: Props) {
  const rf = useReactFlow();

  const completeWire = useCallback(
    (targetNodeId: string, targetHandleId: string) => {
      const gesture = wireGesture.get();
      if (!gesture.active || !gesture.source) return;

      const connection: Connection = {
        source: gesture.source.nodeId,
        target: targetNodeId,
        sourceHandle: gesture.source.handleId,
        targetHandle: targetHandleId,
      };

      const created = completeConnection(connection, rf.getNode);
      if (created) onComplete();
    },
    [rf, onComplete],
  );

  const cancelWire = useCallback(() => {
    const gesture = wireGesture.get();
    if (!gesture.active || gesture.completed) return;
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