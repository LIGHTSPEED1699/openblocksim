import { describe, it, expect } from 'vitest';
import {
  expandPoints,
  buildOrthogonalPath,
  hitTestSegment,
  insertWaypoint,
  translateSegment,
  removeWaypoint,
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
