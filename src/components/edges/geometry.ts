import type { XYPosition } from '@xyflow/react';

export function expandPoints(
  waypoints: XYPosition[],
  sourcePos: XYPosition,
  targetPos: XYPosition,
): XYPosition[] {
  if (waypoints.length > 0) {
    return [sourcePos, ...waypoints, targetPos];
  }
  if (Math.abs(sourcePos.y - targetPos.y) < 0.5) {
    return [sourcePos, targetPos];
  }
  const mx = (sourcePos.x + targetPos.x) / 2;
  return [sourcePos, { x: mx, y: sourcePos.y }, { x: mx, y: targetPos.y }, targetPos];
}

export function buildOrthogonalPath(V: XYPosition[]): string {
  if (V.length < 2) return '';
  let d = `M ${V[0].x} ${V[0].y}`;
  for (let i = 1; i < V.length; i++) {
    d += ` L ${V[i].x} ${V[i].y}`;
  }
  return d;
}

export function hitTestSegment(
  V: XYPosition[],
  cursor: XYPosition,
  threshold: number,
): number | null {
  for (let i = 0; i < V.length - 1; i++) {
    const a = V[i];
    const b = V[i + 1];
    const isHorizontal = Math.abs(a.y - b.y) < 0.5;
    if (isHorizontal) {
      const dist = Math.abs(cursor.y - a.y);
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      if (dist <= threshold && cursor.x >= minX && cursor.x <= maxX) {
        return i;
      }
    } else {
      const dist = Math.abs(cursor.x - a.x);
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      if (dist <= threshold && cursor.y >= minY && cursor.y <= maxY) {
        return i;
      }
    }
  }
  return null;
}

export function insertWaypoint(
  V: XYPosition[],
  segmentIndex: number,
  pos: XYPosition,
): XYPosition[] {
  const a = V[segmentIndex];
  const b = V[segmentIndex + 1];
  const isHorizontal = Math.abs(a.y - b.y) < 0.5;
  const snapped: XYPosition = isHorizontal
    ? { x: pos.x, y: a.y }
    : { x: a.x, y: pos.y };

  const result = [...V];
  result.splice(segmentIndex + 1, 0, snapped);
  return result;
}

export function translateSegment(
  V: XYPosition[],
  segmentIndex: number,
  delta: XYPosition,
): XYPosition[] {
  const result = V.map((v) => ({ ...v }));
  const isFirst = segmentIndex === 0;
  const isLast = segmentIndex === V.length - 2;

  if (isFirst && !isLast) {
    result[1] = { x: result[1].x + delta.x, y: result[1].y + delta.y };
  } else if (isLast && !isFirst) {
    result[segmentIndex] = {
      x: result[segmentIndex].x + delta.x,
      y: result[segmentIndex].y + delta.y,
    };
  } else {
    result[segmentIndex] = {
      x: result[segmentIndex].x + delta.x,
      y: result[segmentIndex].y + delta.y,
    };
    result[segmentIndex + 1] = {
      x: result[segmentIndex + 1].x + delta.x,
      y: result[segmentIndex + 1].y + delta.y,
    };
  }
  return result;
}

export function removeWaypoint(
  waypoints: XYPosition[],
  waypointIndex: number,
): XYPosition[] {
  return waypoints.filter((_, i) => i !== waypointIndex);
}
