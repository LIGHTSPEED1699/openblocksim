import { useSyncExternalStore } from 'react';
import { useReactFlow, type ConnectionLineComponentProps } from '@xyflow/react';
import { wireGesture } from './edges/wireGesture';
import { nodePortPosition, expandPoints, buildOrthogonalPath } from './edges/geometry';

export function ConnectionPreview(_props: ConnectionLineComponentProps) {
  const gesture = useSyncExternalStore(wireGesture.subscribe, wireGesture.get);
  const rf = useReactFlow();

  if (!gesture.active || !gesture.source) return null;

  const srcNode = rf.getNode(gesture.source.nodeId);
  if (!srcNode) return null;

  const srcPortIndex = parseInt(gesture.source.handleId.split('-').pop() ?? '0', 10) || 0;

  const sourcePort = nodePortPosition(
    srcNode,
    srcPortIndex,
    (srcNode.data as any)?.outputs ?? 1,
    true,
  );

  const cursor = gesture.cursor ?? sourcePort;
  const V = gesture.planted.length > 0
    ? expandPoints(gesture.planted, sourcePort, cursor)
    : [sourcePort, cursor];

  const path = buildOrthogonalPath(V);

  return (
    <g>
      <defs>
        <marker
          id="conn-preview-arrow"
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={8}
          markerHeight={8}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={2}
        markerEnd="url(#conn-preview-arrow)"
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}