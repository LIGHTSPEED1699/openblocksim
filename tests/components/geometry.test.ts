import { describe, it, expect } from 'vitest';
import {
  expandPoints,
  buildOrthogonalPath,
  hitTestSegment,
  insertWaypoint,
  translateSegment,
  removeWaypoint,
  isBackwardEdge,
  nodePortPosition,
  computeFeedbackRoute,
} from '../../src/components/edges/geometry';
import type { XYPosition } from '@xyflow/react';

const SRC: XYPosition = { x: 100, y: 100 };
const TGT: XYPosition = { x: 300, y: 200 };

describe('expandPoints', () => {
  it('returns [source, target] when waypoints empty and ports share same y', () => {
    const result = expandPoints([], SRC, { x: 300, y: 100 });
    expect(result).toEqual([SRC, { x: 300, y: 100 }]);
  });

  it('returns 4 vertices (jogA, jogB) when waypoints empty and ports differ in y', () => {
    const result = expandPoints([], SRC, TGT);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual(SRC);
    expect(result[1]).toEqual({ x: 200, y: 100 });
    expect(result[2]).toEqual({ x: 200, y: 200 });
    expect(result[3]).toEqual(TGT);
  });

  it('returns [source, ...waypoints, target] when waypoints non-empty', () => {
    const wp: XYPosition[] = [{ x: 150, y: 150 }];
    const result = expandPoints(wp, SRC, TGT);
    expect(result).toEqual([SRC, ...wp, TGT]);
  });

  it('same-y detection uses 0.5 tolerance boundary', () => {
    const result = expandPoints([], SRC, { x: 300, y: 100.4 });
    expect(result).toHaveLength(2);
  });
});

describe('buildOrthogonalPath', () => {
  it('produces straight line for two vertices', () => {
    const path = buildOrthogonalPath([SRC, TGT]);
    expect(path).toBe('M 100 100 L 300 200');
  });

  it('produces polyline for multiple vertices (auto-routed different-y)', () => {
    const V = expandPoints([], SRC, TGT);
    const path = buildOrthogonalPath(V);
    expect(path).toBe('M 100 100 L 200 100 L 200 200 L 300 200');
  });

  it('returns empty string for fewer than 2 vertices', () => {
    expect(buildOrthogonalPath([])).toBe('');
    expect(buildOrthogonalPath([SRC])).toBe('');
  });

  it('all path commands are M and L (no bezier C/S/Q/T/A)', () => {
    const V = expandPoints([{ x: 150, y: 100 }, { x: 150, y: 200 }], SRC, TGT);
    const path = buildOrthogonalPath(V);
    expect(path).not.toMatch(/[CSQTA]/);
    expect(path).toMatch(/^M [\d.]+ [\d.]+( L [\d.]+ [\d.]+)+$/);
  });
});

describe('hitTestSegment', () => {
  const V: XYPosition[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ];

  it('hits horizontal segment when cursor is near vertically', () => {
    expect(hitTestSegment(V, { x: 50, y: 3 }, 5)).toBe(0);
  });

  it('hits vertical segment when cursor is near horizontally', () => {
    expect(hitTestSegment(V, { x: 97, y: 50 }, 5)).toBe(1);
  });

  it('returns null when cursor is far from all segments', () => {
    expect(hitTestSegment(V, { x: 50, y: 50 }, 5)).toBeNull();
  });

  it('returns null when cursor outside segment horizontal span', () => {
    expect(hitTestSegment(V, { x: 150, y: 0 }, 5)).toBeNull();
  });

  it('obeys threshold — close vs far', () => {
    const close = hitTestSegment(V, { x: 50, y: 3 }, 5);
    expect(close).toBe(0);
    const far = hitTestSegment(V, { x: 50, y: 6 }, 5);
    expect(far).toBeNull();
  });

  it('returns the correct segment index for middle segments', () => {
    const V2: XYPosition[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 200 },
      { x: 200, y: 200 },
    ];
    expect(hitTestSegment(V2, { x: 48, y: 100 }, 5)).toBe(1);
  });
});

describe('insertWaypoint', () => {
  const V: XYPosition[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it('inserts on horizontal segment and snaps y to segment axis', () => {
    const result = insertWaypoint(V, 0, { x: 50, y: 10 });
    expect(result).toHaveLength(4);
    expect(result[1]).toEqual({ x: 50, y: 0 });
  });

  it('inserts on vertical segment and snaps x to segment axis', () => {
    const result = insertWaypoint(V, 1, { x: 110, y: 50 });
    expect(result).toHaveLength(4);
    expect(result[2]).toEqual({ x: 100, y: 50 });
  });

  it('preserves all existing vertices', () => {
    const result = insertWaypoint(V, 0, { x: 25, y: 5 });
    expect(result[0]).toEqual(V[0]);
    expect(result[2]).toEqual(V[1]);
    expect(result[3]).toEqual(V[2]);
  });
});

describe('translateSegment', () => {
  it('moves both endpoint vertices for interior segment', () => {
    const V: XYPosition[] = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
    ];
    const result = translateSegment(V, 1, { x: 0, y: -20 });
    expect(result[1]).toEqual({ x: 0, y: 80 });
    expect(result[2]).toEqual({ x: 100, y: 80 });
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[3]).toEqual({ x: 100, y: 0 });
  });

  it('moves only interior vertex for source-adjacent segment', () => {
    const V: XYPosition[] = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    const result = translateSegment(V, 0, { x: 0, y: -20 });
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[1]).toEqual({ x: 0, y: 80 });
    expect(result[2]).toEqual({ x: 100, y: 100 });
  });

  it('moves only interior vertex for target-adjacent segment', () => {
    const V: XYPosition[] = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    const result = translateSegment(V, 1, { x: 10, y: 0 });
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[1]).toEqual({ x: 10, y: 100 });
    expect(result[2]).toEqual({ x: 100, y: 100 });
  });

  it('preserves orthogonality — all segments remain axis-aligned', () => {
    const V: XYPosition[] = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 0 },
    ];
    const result = translateSegment(V, 1, { x: 0, y: 30 });
    for (let i = 0; i < result.length - 1; i++) {
      const a = result[i];
      const b = result[i + 1];
      const isAxisAligned = Math.abs(a.x - b.x) < 0.01 || Math.abs(a.y - b.y) < 0.01;
      expect(isAxisAligned).toBe(true);
    }
  });
});

describe('removeWaypoint', () => {
  const wp: XYPosition[] = [
    { x: 10, y: 10 },
    { x: 20, y: 20 },
    { x: 30, y: 30 },
  ];

  it('removes a middle waypoint', () => {
    const result = removeWaypoint(wp, 1);
    expect(result).toEqual([{ x: 10, y: 10 }, { x: 30, y: 30 }]);
  });

  it('removes the only waypoint → returns empty array', () => {
    const result = removeWaypoint([{ x: 10, y: 10 }], 0);
    expect(result).toEqual([]);
  });

  it('removing from already-empty array returns empty', () => {
    const result = removeWaypoint([], 0);
    expect(result).toEqual([]);
  });
});

describe('isBackwardEdge', () => {
  it('true when source is right of target', () => {
    expect(isBackwardEdge(
      { position: { x: 300, y: 100 } },
      { position: { x: 100, y: 100 } },
    )).toBe(true);
  });

  it('false when source is left of target', () => {
    expect(isBackwardEdge(
      { position: { x: 100, y: 100 } },
      { position: { x: 300, y: 100 } },
    )).toBe(false);
  });

  it('false when x positions are equal', () => {
    expect(isBackwardEdge(
      { position: { x: 200, y: 100 } },
      { position: { x: 200, y: 300 } },
    )).toBe(false);
  });
});

describe('nodePortPosition', () => {
  const node = { position: { x: 100, y: 50 }, measured: { width: 120, height: 60 } };

  it('source port is on right edge', () => {
    const pos = nodePortPosition(node, 0, 1, true);
    expect(pos.x).toBe(220); // 100 + 120
  });

  it('target port is on left edge', () => {
    const pos = nodePortPosition(node, 0, 1, false);
    expect(pos.x).toBe(100);
  });

  it('y uses topPct formula: ((portIndex + 1) / (totalPorts + 1)) * height', () => {
    // port 0 of 2: (1/3)*60 = 20 → y = 50 + 20 = 70
    const pos = nodePortPosition(node, 0, 2, true);
    expect(pos.y).toBe(70);
    // port 1 of 2: (2/3)*60 = 40 → y = 50 + 40 = 90
    const pos2 = nodePortPosition(node, 1, 2, true);
    expect(pos2.y).toBe(90);
  });

  it('falls back to width=100, height=40 when measured is missing', () => {
    const bare = { position: { x: 0, y: 0 } };
    const pos = nodePortPosition(bare, 0, 1, true);
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(20); // (1/2)*40
  });
});

describe('computeFeedbackRoute', () => {
  it('returns 4 waypoints (source and target are implicit)', () => {
    const route = computeFeedbackRoute(
      { x: 300, y: 100 }, { x: 100, y: 100 },
      160, 140,
    );
    expect(route).toHaveLength(4);
  });

  it('waypoints form a downward U: right, down, across, up', () => {
    const route = computeFeedbackRoute(
      { x: 300, y: 100 }, { x: 100, y: 100 },
      160, 140, 60,
    );
    // wp0: right of source
    expect(route[0].x).toBe(360);
    expect(route[0].y).toBe(100);
    // wp1: down to bottomY = max(160,140) + 60 = 220
    expect(route[1].x).toBe(360);
    expect(route[1].y).toBe(220);
    // wp2: across to left of target
    expect(route[2].x).toBe(40);
    expect(route[2].y).toBe(220);
    // wp3: up to target y
    expect(route[3].x).toBe(40);
    expect(route[3].y).toBe(100);
  });

  it('with source+target via expandPoints produces 6-vertex path', () => {
    const route = computeFeedbackRoute(
      { x: 300, y: 100 }, { x: 100, y: 100 },
      160, 140,
    );
    const V = expandPoints(route, { x: 300, y: 100 }, { x: 100, y: 100 });
    expect(V).toHaveLength(6);
    // All consecutive pairs are axis-aligned
    for (let i = 0; i < V.length - 1; i++) {
      const hor = Math.abs(V[i].x - V[i + 1].x) < 0.01;
      const ver = Math.abs(V[i].y - V[i + 1].y) < 0.01;
      expect(hor || ver).toBe(true);
    }
  });

  it('bottomY is max(sourceBottom, targetBottom) + clearance', () => {
    const route = computeFeedbackRoute(
      { x: 300, y: 100 }, { x: 100, y: 100 },
      200, 150, 50,
    );
    // bottomY = max(200,150) + 50 = 250
    expect(route[1].y).toBe(250);
    expect(route[2].y).toBe(250);
  });
});
