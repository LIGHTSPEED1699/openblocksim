import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wireGesture } from '../../src/components/edges/wireGesture';

describe('wireGesture', () => {
  beforeEach(() => {
    wireGesture.reset();
  });

  it('starts inactive', () => {
    expect(wireGesture.get().active).toBe(false);
    expect(wireGesture.get().source).toBeNull();
    expect(wireGesture.get().planted).toEqual([]);
  });

  it('set updates state and fires listeners', () => {
    const listener = vi.fn();
    wireGesture.subscribe(listener);
    wireGesture.set({ active: true, source: { nodeId: 'n1', handleId: 'out-0' } });
    expect(wireGesture.get().active).toBe(true);
    expect(wireGesture.get().source).toEqual({ nodeId: 'n1', handleId: 'out-0' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('subscribe returns unsubscribe function', () => {
    const listener = vi.fn();
    const unsub = wireGesture.subscribe(listener);
    unsub();
    wireGesture.set({ active: true });
    expect(listener).not.toHaveBeenCalled();
  });

  it('plant appends to planted array', () => {
    wireGesture.set({ active: true, source: { nodeId: 'n1', handleId: 'out-0' } });
    const p1 = { x: 100, y: 200 };
    wireGesture.set({ planted: [...wireGesture.get().planted, p1] });
    const p2 = { x: 150, y: 250 };
    wireGesture.set({ planted: [...wireGesture.get().planted, p2] });
    expect(wireGesture.get().planted).toEqual([p1, p2]);
  });

  it('reset clears all fields', () => {
    wireGesture.set({
      active: true,
      source: { nodeId: 'n1', handleId: 'out-0' },
      planted: [{ x: 100, y: 200 }],
      cursor: { x: 150, y: 250 },
      pointerId: 1,
    });
    wireGesture.reset();
    expect(wireGesture.get()).toEqual({
      active: false,
      source: null,
      planted: [],
      cursor: null,
      pointerId: null,
    });
  });

  it('cursor updates independently of planted', () => {
    wireGesture.set({ active: true });
    wireGesture.set({ cursor: { x: 50, y: 50 } });
    expect(wireGesture.get().cursor).toEqual({ x: 50, y: 50 });
    expect(wireGesture.get().planted).toEqual([]);
  });
});