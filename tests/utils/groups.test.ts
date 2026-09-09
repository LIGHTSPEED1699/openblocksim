import { describe, it, expect } from 'vitest';
import {
  rectFromCorners, rectContains, groupMemberIds,
  GROUP_BOX_MIN_WIDTH, GROUP_BOX_MIN_HEIGHT, GROUP_BOX_COLORS,
} from '../../src/utils/groups';

describe('rectFromCorners', () => {
  it('normalizes corners drawn in any direction', () => {
    const a = { x: 200, y: 150 }, b = { x: 50, y: 20 };
    const r = rectFromCorners(a, b);
    expect(r).toEqual({ x: 50, y: 20, width: 150, height: 130 });
  });
});

describe('rectContains', () => {
  it('contains points inside [x, x+w) x [y, y+h)', () => {
    const rect = { x: 10, y: 10, width: 100, height: 50 };
    expect(rectContains(rect, { x: 10, y: 10 })).toBe(true);   // inclusive low edge
    expect(rectContains(rect, { x: 109.9, y: 59.9 })).toBe(true);
    expect(rectContains(rect, { x: 110, y: 10 })).toBe(false); // exclusive high edge
    expect(rectContains(rect, { x: 10, y: 60 })).toBe(false);
  });
});

describe('groupMemberIds', () => {
  const group = { id: 'grp-1', name: 'Group 1', color: '#3b82f6', x: 0, y: 0, width: 200, height: 100 };

  it('returns ids of nodes whose top-left anchor is inside the rect', () => {
    const nodes = [
      { id: 'in', position: { x: 10, y: 10 } },      // inside
      { id: 'edgeX', position: { x: 200, y: 10 } },  // anchor on high edge → outside
      { id: 'out', position: { x: 400, y: 400 } },   // outside
    ];
    expect(groupMemberIds(group, nodes)).toEqual(['in']);
  });

  it('empty membership for empty node list', () => {
    expect(groupMemberIds(group, [])).toEqual([]);
  });
});

describe('constants', () => {
  it('group box palette has 6 distinct colors', () => {
    expect(GROUP_BOX_COLORS).toHaveLength(6);
    expect(new Set(GROUP_BOX_COLORS).size).toBe(6);
  });
  it('min sizes are exported', () => {
    expect(GROUP_BOX_MIN_WIDTH).toBe(120);
    expect(GROUP_BOX_MIN_HEIGHT).toBe(80);
  });
});
