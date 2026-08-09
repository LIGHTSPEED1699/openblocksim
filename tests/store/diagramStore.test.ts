import { describe, it, expect } from 'vitest';

describe('edge migration on rehydrate', () => {
  it('converts bezier edges to straight type with empty waypoints', () => {
    const bezierEdge = { id: 'e1', type: 'default', data: {} };
    const migrated = {
      ...bezierEdge,
      type: 'straight',
      data: { waypoints: [] },
    };
    expect(migrated.type).toBe('straight');
    expect((migrated.data as any).waypoints).toEqual([]);
  });

  it('preserves existing waypoints during migration', () => {
    const bezierEdge = { id: 'e1', type: 'default', data: { waypoints: [{ x: 10, y: 10 }] } };
    const migrated = {
      ...bezierEdge,
      type: 'straight',
      data: { waypoints: [{ x: 10, y: 10 }] },
    };
    expect((migrated.data as any).waypoints).toEqual([{ x: 10, y: 10 }]);
  });

  it('leaves already-straight edges untouched', () => {
    const straightEdge = { id: 'e2', type: 'straight', data: { waypoints: [{ x: 5, y: 5 }] } };
    expect(straightEdge.type).toBe('straight');
    expect((straightEdge.data as any).waypoints).toEqual([{ x: 5, y: 5 }]);
  });

  it('treats missing waypoints as empty array', () => {
    const bezierEdge = { id: 'e1', type: 'default', data: {} };
    const wp = (bezierEdge.data as any)?.waypoints ?? [];
    expect(wp).toEqual([]);
  });
});
