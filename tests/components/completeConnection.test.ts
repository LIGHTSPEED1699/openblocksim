import { describe, it, expect, beforeEach } from 'vitest';
import { completeConnection } from '../../src/components/edges/completeConnection';
import { wireGesture } from '../../src/components/edges/wireGesture';
import { useDiagramStore } from '../../src/store/diagramStore';
import type { Connection } from '@xyflow/react';

describe('completeConnection', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
    wireGesture.reset();
  });

  it('creates exactly one edge when called twice with the same connection', () => {
    // Set up a gesture so the completion path is active
    wireGesture.set({
      active: true,
      source: { nodeId: 'src-1', handleId: 'out-0' },
      planted: [],
      cursor: null,
      pointerId: null,
      completed: false,
    });

    // Mock getNode — forward edge (no feedback route)
    const mockGetNode = (id: string) => ({
      position: { x: 100, y: 100 },
      measured: { height: 40 },
      data: { outputs: 1, inputs: 1 },
    });

    const connection: Connection = {
      source: 'src-1',
      target: 'tgt-1',
      sourceHandle: 'out-0',
      targetHandle: 'in-0',
    };

    const firstResult = completeConnection(connection, mockGetNode);
    expect(firstResult).toBe(true);

    // Second call should be blocked by the completed flag
    // Reset gesture active to simulate the race: both paths fire
    wireGesture.set({ active: true, completed: true });
    const secondResult = completeConnection(connection, mockGetNode);
    expect(secondResult).toBe(false);

    // Only one edge should exist in the store
    const edges = useDiagramStore.getState().edges;
    expect(edges).toHaveLength(1);
  });

  it('returns false when gesture is not active', () => {
    wireGesture.reset();

    const connection: Connection = {
      source: 'src-1',
      target: 'tgt-1',
      sourceHandle: 'out-0',
      targetHandle: 'in-0',
    };

    const mockGetNode = (id: string) => ({
      position: { x: 100, y: 100 },
      measured: { height: 40 },
      data: { outputs: 1, inputs: 1 },
    });

    const result = completeConnection(connection, mockGetNode);
    expect(result).toBe(false);
  });

  it('uses planted waypoints when available', () => {
    const planted = [{ x: 150, y: 100 }, { x: 150, y: 200 }];
    wireGesture.set({
      active: true,
      source: { nodeId: 'src-1', handleId: 'out-0' },
      planted,
      cursor: null,
      pointerId: null,
      completed: false,
    });

    const mockGetNode = (id: string) => ({
      position: { x: 100, y: 100 },
      measured: { height: 40 },
      data: { outputs: 1, inputs: 1 },
    });

    const connection: Connection = {
      source: 'src-1',
      target: 'tgt-1',
      sourceHandle: 'out-0',
      targetHandle: 'in-0',
    };

    const result = completeConnection(connection, mockGetNode);
    expect(result).toBe(true);

    const edges = useDiagramStore.getState().edges;
    expect(edges).toHaveLength(1);
    expect(edges[0].data?.waypoints).toEqual(planted);
  });
});