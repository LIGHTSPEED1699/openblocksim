import { describe, it, expect } from 'vitest';
import type { NodeChange } from '@xyflow/react';
import { partitionNodeChanges } from '../../src/utils/groupNodeChanges';

const isGrp = (id: string) => id.startsWith('grp-');

describe('partitionNodeChanges', () => {
  it('passes user-node changes through untouched', () => {
    const changes: NodeChange[] = [
      { id: 'Gain-1', type: 'position', position: { x: 5, y: 6 } },
      { id: 'Gain-1', type: 'select', selected: true },
    ];
    const { nodeChanges, groupChanges } = partitionNodeChanges(changes, isGrp);
    expect(nodeChanges).toEqual(changes);
    expect(groupChanges).toEqual([]);
  });

  it('maps a position-only group change to a move', () => {
    const changes: NodeChange[] = [
      { id: 'grp-1', type: 'position', position: { x: 120, y: 90 } },
      { id: 'Gain-1', type: 'position', position: { x: 5, y: 6 } },
    ];
    const { nodeChanges, groupChanges } = partitionNodeChanges(changes, isGrp);
    expect(nodeChanges).toEqual([{ id: 'Gain-1', type: 'position', position: { x: 5, y: 6 } }]);
    expect(groupChanges).toEqual([{ kind: 'move', id: 'grp-1', x: 120, y: 90 }]);
  });

  it('merges position + resizing dimensions into a single resize', () => {
    const changes: NodeChange[] = [
      { id: 'grp-1', type: 'position', position: { x: 40, y: 60 } },
      { id: 'grp-1', type: 'dimensions', resizing: true, dimensions: { width: 320, height: 210 } },
    ];
    const { groupChanges } = partitionNodeChanges(changes, isGrp);
    expect(groupChanges).toEqual([
      { kind: 'resize', id: 'grp-1', x: 40, y: 60, width: 320, height: 210 },
    ]);
  });

  it('maps dimensions-only resizing to a partial resize (right/bottom handles)', () => {
    const changes: NodeChange[] = [
      { id: 'grp-1', type: 'dimensions', resizing: true, dimensions: { width: 400, height: 220 } },
    ];
    const { groupChanges } = partitionNodeChanges(changes, isGrp);
    expect(groupChanges).toEqual([{ kind: 'resize', id: 'grp-1', width: 400, height: 220 }]);
  });

  it('ignores measurement dimension events and remove/add/replace on groups', () => {
    const changes: NodeChange[] = [
      { id: 'grp-1', type: 'dimensions', dimensions: { width: 280, height: 180 } }, // resizing undefined
      { id: 'grp-1', type: 'dimensions', resizing: false, dimensions: { width: 280, height: 180 } }, // resizer end
      { id: 'grp-1', type: 'remove' },
    ];
    const { nodeChanges, groupChanges } = partitionNodeChanges(changes, isGrp);
    expect(nodeChanges).toEqual([]);
    expect(groupChanges).toEqual([]);
  });

  it('maps selection changes to select gestures', () => {
    const changes: NodeChange[] = [
      { id: 'grp-1', type: 'select', selected: true },
      { id: 'grp-1', type: 'select', selected: false },
    ];
    const { groupChanges } = partitionNodeChanges(changes, isGrp);
    expect(groupChanges).toEqual([
      { kind: 'select', id: 'grp-1', selected: true },
      { kind: 'select', id: 'grp-1', selected: false },
    ]);
  });

  it('one gesture per group id per batch (move only, even with duplicates)', () => {
    const changes: NodeChange[] = [
      { id: 'grp-1', type: 'position', position: { x: 1, y: 1 } },
      { id: 'grp-1', type: 'position', position: { x: 9, y: 9 } }, // last wins
    ];
    const { groupChanges } = partitionNodeChanges(changes, isGrp);
    expect(groupChanges).toEqual([{ kind: 'move', id: 'grp-1', x: 9, y: 9 }]);
  });
});
