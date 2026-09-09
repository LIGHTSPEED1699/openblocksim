import type { XYPosition } from '@xyflow/react';

/** A grouping box is a store-owned colored rectangle in flow coordinates. */
export interface GroupBox {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GroupBoxRect = Pick<GroupBox, 'x' | 'y' | 'width' | 'height'>;

export const GROUP_BOX_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'] as const;

export const GROUP_BOX_MIN_WIDTH = 120;
export const GROUP_BOX_MIN_HEIGHT = 80;

/** Normalized rect from two corner points (e.g. a marquee drag). */
export function rectFromCorners(a: XYPosition, b: XYPosition): GroupBoxRect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

/** Half-open containment: [x, x+w) x [y, y+h). */
export function rectContains(rect: GroupBoxRect, p: XYPosition): boolean {
  return (
    p.x >= rect.x && p.x < rect.x + rect.width &&
    p.y >= rect.y && p.y < rect.y + rect.height
  );
}

/**
 * Membership rule (Stage 1): a node belongs to a group when its top-left
 * anchor (node.position) is inside the group rect. Membership is a pure
 * function of (group, node positions) — nothing extra to persist, and it is
 * always consistent because it is re-derived from live state at every use.
 */
export function groupMemberIds(
  group: GroupBox,
  nodes: { id: string; position: XYPosition }[],
): string[] {
  return nodes.filter((n) => rectContains(group, n.position)).map((n) => n.id);
}
