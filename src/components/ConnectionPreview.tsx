import { useSyncExternalStore } from 'react';
import { useReactFlow, type ConnectionLineComponentProps } from '@xyflow/react';
import { wireGesture } from './edges/wireGesture';
import { nodePortPosition, expandPoints, buildOrthogonalPath } from './edges/geometry';
import { useDiagramStore } from '../store/diagramStore';

const PREVIEW_COLOR_LIGHT = '#1e293b';
const PREVIEW_COLOR_DARK = '#94a3b8';
const PREVIEW_STROKE_WIDTH = 1.5;
const PREVIEW_MARKER_SIZE = 5;

export function ConnectionPreview(_props: ConnectionLineComponentProps) {
  const gesture = useSyncExternalStore(wireGesture.subscribe, wireGesture.get);
  const rf = useReactFlow();
  const theme = useDiagramStore((s) => s.theme);

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
  const color = theme === 'dark' ? PREVIEW_COLOR_DARK : PREVIEW_COLOR_LIGHT;

  return (
    <g>
      <defs>
        <marker
          id="conn-preview-arrow"
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={PREVIEW_MARKER_SIZE}
          markerHeight={PREVIEW_MARKER_SIZE}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={PREVIEW_STROKE_WIDTH}
        markerEnd="url(#conn-preview-arrow)"
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}