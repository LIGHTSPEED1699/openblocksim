import {
  BaseEdge,
  useReactFlow,
  type EdgeProps,
  type XYPosition,
} from '@xyflow/react';
import { useCallback, useRef, useState } from 'react';
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

const HIT_THRESHOLD_SCREEN_PX = 10;
const HIT_STROKE_WIDTH = 14;
const WAYPOINT_RADIUS = 4;
const ARROW_COLOR_SELECTED = '#3b82f6';
const ARROW_COLOR_DEFAULT = '#94a3b8';

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

  const [hovered, setHovered] = useState(false);
  const showHandles = selected || hovered;

  const dragRef = useRef<{
    V: XYPosition[];
    segmentIndex: number;
    isHorizontal: boolean;
    mode: 'translate' | 'bend' | 'vertex';
    materialized: boolean;
    lastPos: XYPosition;
  } | null>(null);

  const { screenToFlowPosition, getZoom } = useReactFlow();

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
      const zoom = getZoom();
      const threshold = HIT_THRESHOLD_SCREEN_PX / zoom;

      let currentV = V;
      const segmentIndex = hitTestSegment(currentV, flowPos, threshold);
      if (segmentIndex === null) return;

      const a = currentV[segmentIndex];
      const b = currentV[segmentIndex + 1];
      const isHorizontal = Math.abs(a.y - b.y) < 0.5;
      const hasInteriorStart = segmentIndex > 0;
      const hasInteriorEnd = segmentIndex + 1 < currentV.length - 1;

      dragRef.current = {
        V: currentV,
        segmentIndex,
        isHorizontal,
        mode: !hasInteriorStart && !hasInteriorEnd ? 'bend' : 'translate',
        materialized: waypoints.length > 0,
        lastPos: flowPos,
      };

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
    [id, V, waypoints, screenToFlowPosition, getZoom],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const dr = dragRef.current;
      if (!dr) return;

      const flowPos = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      // Defer materialization to first move with delta > 0
      const delta = Math.abs(flowPos.x - dr.lastPos.x) + Math.abs(flowPos.y - dr.lastPos.y);
      if (delta < 0.5) return;
      dr.lastPos = flowPos;

      let currentV = dr.V;
      if (!dr.materialized) {
        if (waypoints.length === 0) {
          const frozenWp = materializeWaypoints(currentV);
          updateEdgeWaypoints(frozenWp);
          currentV = expandPoints(frozenWp, sourcePos, targetPos);
          dr.V = currentV;
        }
        dr.materialized = true;

        if (dr.mode === 'bend') {
          currentV = insertWaypoint(currentV, dr.segmentIndex, flowPos);
          updateEdgeWaypoints(materializeWaypoints(currentV));
          dr.V = currentV;
          dr.mode = 'translate';
          return;
        }
      }

      const a = dr.V[dr.segmentIndex];
      const deltaMove: XYPosition = dr.isHorizontal
        ? { x: 0, y: flowPos.y - a.y }
        : { x: flowPos.x - a.x, y: 0 };

      const newV = translateSegment(dr.V, dr.segmentIndex, deltaMove);
      dr.V = newV;
      updateEdgeWaypoints(materializeWaypoints(newV));
    },
    [screenToFlowPosition, updateEdgeWaypoints, waypoints, sourcePos, targetPos],
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

  const strokeColor = selected ? ARROW_COLOR_SELECTED : ARROW_COLOR_DEFAULT;
  const markerId = `edge-arrow-${id}`;

  return (
    <g>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={7}
          markerHeight={7}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={strokeColor} />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={`url(#${markerId})`}
        style={{
          strokeWidth: 2,
          stroke: strokeColor,
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
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      />

      {showHandles &&
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