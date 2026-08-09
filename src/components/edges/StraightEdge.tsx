import {
  BaseEdge,
  useReactFlow,
  type EdgeProps,
  type XYPosition,
} from '@xyflow/react';
import { useCallback, useRef } from 'react';
import {
  expandPoints,
  buildOrthogonalPath,
  hitTestSegment,
  insertWaypoint,
  translateSegment,
  removeWaypoint,
} from './geometry';
import { useDiagramStore } from '../../store/diagramStore';

export interface StraightEdgeData {
  waypoints?: XYPosition[];
  [key: string]: unknown;
}

const HIT_THRESHOLD = 8;
const HIT_STROKE_WIDTH = 14;
const WAYPOINT_RADIUS = 4;

function materializeWaypoints(V: XYPosition[]): XYPosition[] {
  return V.slice(1, -1);
}

export function StraightEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps) {
  const edgeData = (data ?? {}) as StraightEdgeData;
  const waypoints: XYPosition[] = edgeData.waypoints ?? [];

  const sourcePos: XYPosition = { x: sourceX, y: sourceY };
  const targetPos: XYPosition = { x: targetX, y: targetY };
  const V = expandPoints(waypoints, sourcePos, targetPos);
  const path = buildOrthogonalPath(V);

  const dragRef = useRef<{
    V: XYPosition[];
    segmentIndex: number;
    isHorizontal: boolean;
    mode: 'translate' | 'bend';
  } | null>(null);

  const { screenToFlowPosition } = useReactFlow();

  const updateEdgeWaypoints = useCallback(
    (newWaypoints: XYPosition[]) => {
      const edges = useDiagramStore.getState().edges;
      const edge = edges.find((e) => e.id === id);
      if (!edge) return;
      useDiagramStore.getState().setEdges(
        edges.map((e) =>
          e.id === id
            ? { ...e, data: { ...e.data, waypoints: newWaypoints } }
            : e,
        ),
      );
    },
    [id],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const flowPos = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      let currentV = V;
      const segmentIndex = hitTestSegment(currentV, flowPos, HIT_THRESHOLD);
      if (segmentIndex === null) return;

      if (waypoints.length === 0) {
        const frozenWp = materializeWaypoints(currentV);
        updateEdgeWaypoints(frozenWp);
        currentV = expandPoints(frozenWp, sourcePos, targetPos);
      }

      const a = currentV[segmentIndex];
      const b = currentV[segmentIndex + 1];
      const isHorizontal = Math.abs(a.y - b.y) < 0.5;
      const hasInteriorStart = segmentIndex > 0;
      const hasInteriorEnd = segmentIndex + 1 < currentV.length - 1;

      if (!hasInteriorStart && !hasInteriorEnd) {
        currentV = insertWaypoint(currentV, segmentIndex, flowPos);
        updateEdgeWaypoints(materializeWaypoints(currentV));
        dragRef.current = {
          V: currentV,
          segmentIndex,
          isHorizontal,
          mode: 'translate',
        };
      } else {
        dragRef.current = { V: currentV, segmentIndex, isHorizontal, mode: 'translate' };
      }

      (e.target as Element).setPointerCapture?.(e.pointerId);

      const edges = useDiagramStore.getState().edges;
      const edge = edges.find((ed) => ed.id === id);
      if (edge && !edge.selected) {
        useDiagramStore.getState().setEdges(
          edges.map((ed) =>
            ed.id === id ? { ...ed, selected: true } : { ...ed, selected: false },
          ),
        );
      }
    },
    [id, V, waypoints, sourcePos, targetPos, screenToFlowPosition, updateEdgeWaypoints]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const dr = dragRef.current;
      if (!dr) return;

      const flowPos = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const a = dr.V[dr.segmentIndex];
      const delta: XYPosition = dr.isHorizontal
        ? { x: 0, y: flowPos.y - a.y }
        : { x: flowPos.x - a.x, y: 0 };

      const newV = translateSegment(dr.V, dr.segmentIndex, delta);
      dr.V = newV;

      updateEdgeWaypoints(materializeWaypoints(newV));
    },
    [screenToFlowPosition, updateEdgeWaypoints],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onWaypointDoubleClick = useCallback(
    (waypointIndex: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const newWp = removeWaypoint(waypoints, waypointIndex);
      updateEdgeWaypoints(newWp);
    },
    [waypoints, updateEdgeWaypoints],
  );

  return (
    <g>
      <BaseEdge
        id={id}
        path={path}
        style={{
          strokeWidth: 2,
          stroke: selected ? '#3b82f6' : '#94a3b8',
        }}
      />

      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={HIT_STROKE_WIDTH}
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {selected &&
        waypoints.map((wp, i) => (
          <circle
            key={i}
            cx={wp.x}
            cy={wp.y}
            r={WAYPOINT_RADIUS}
            fill="#60a5fa"
            stroke="#fff"
            strokeWidth={1.5}
            style={{ pointerEvents: 'all', cursor: 'pointer' }}
            onDoubleClick={(e) => onWaypointDoubleClick(i, e)}
          />
        ))}
    </g>
  );
}
