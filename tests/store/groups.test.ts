import { describe, it, expect, beforeEach } from 'vitest';
import { useDiagramStore } from '../../src/store/diagramStore';
import { GROUP_BOX_COLORS } from '../../src/utils/groups';

function seed(): void {
  const s = useDiagramStore.getState();
  s.clear();
  s.setNodes([
    { id: 'n-in', type: 'Math', position: { x: 10, y: 10 }, data: { type: 'Gain', inputs: 1, outputs: 1, color: '' } },
    { id: 'n-out', type: 'Math', position: { x: 300, y: 10 }, data: { type: 'Gain', inputs: 1, outputs: 1, color: '' } },
  ]);
  s.setEdges([{ id: 'e1', source: 'n-in', target: 'n-out', type: 'straight', data: { waypoints: [] } }]);
  s.updateParams('n-in', { gain: 2 });
}

describe('groups slice', () => {
  beforeEach(seed);

  it('addGroup creates a default box inside all partial overrides', () => {
    useDiagramStore.getState().addGroup({ x: 500, y: 600 });
    const g = useDiagramStore.getState().groups[0];
    expect(g.id).toMatch(/^grp-/);
    expect(g.name).toBe('Group 1');
    expect(g.x).toBe(500);
    expect(g.y).toBe(600);
    expect(g.width).toBe(280);
    expect(g.height).toBe(180);
    expect(g.color).toBe(GROUP_BOX_COLORS[0]);
  });

  it('addGroup cascades defaults from the group count and cycles colors', () => {
    const s = useDiagramStore.getState();
    s.addGroup(); s.addGroup(); s.addGroup();
    const groups = useDiagramStore.getState().groups;
    expect(groups[0].x).toBe(60);            // first box
    expect(groups[1].x).toBe(groups[0].x + 28); // cascade
    expect(groups[2].color).toBe(GROUP_BOX_COLORS[2]);
  });

  it('moveGroupTo translates the rect and every member node by the same delta', () => {
    const s = useDiagramStore.getState();
    s.addGroup({ x: 0, y: 0, width: 200, height: 100 }); // n-in (10,10) inside; n-out outside
    const gid = useDiagramStore.getState().groups[0].id;
    s.moveGroupTo(gid, 100, 50); // dx=100, dy=50
    const state = useDiagramStore.getState();
    const g = state.groups[0];
    expect(g.x).toBe(100);
    expect(g.y).toBe(50);
    expect(state.nodes.find((n) => n.id === 'n-in')!.position).toEqual({ x: 110, y: 60 });
    expect(state.nodes.find((n) => n.id === 'n-out')!.position).toEqual({ x: 300, y: 10 });
    expect(state.edges[0].source).toBe('n-in'); // edges untouched
  });

  it('resizeGroup changes the rect only and clamps to min size', () => {
    const s = useDiagramStore.getState();
    s.addGroup({ x: 0, y: 0, width: 200, height: 100 });
    const gid = useDiagramStore.getState().groups[0].id;
    s.resizeGroup(gid, { width: 320, height: 60 }); // height clamps to 80
    const state = useDiagramStore.getState();
    expect(state.groups[0].width).toBe(320);
    expect(state.groups[0].height).toBe(80);
    expect(state.groups[0].x).toBe(0);
    expect(state.nodes.find((n) => n.id === 'n-in')!.position).toEqual({ x: 10, y: 10 });
  });

  it('deleteGroup removes the group, its members, their edges and params', () => {
    const s = useDiagramStore.getState();
    s.addGroup({ x: 0, y: 0, width: 200, height: 100 }); // contains n-in
    const gid = useDiagramStore.getState().groups[0].id;
    s.selectGroup(gid);
    s.deleteGroup(gid);
    const state = useDiagramStore.getState();
    expect(state.groups).toHaveLength(0);
    expect(state.nodes.map((n) => n.id)).toEqual(['n-out']);
    expect(state.edges).toHaveLength(0);        // e1 touches n-in
    expect(state.params['n-in']).toBeUndefined();
    expect(state.selectedGroupId).toBeNull();
  });

  it('deleteGroup leaves non-member nodes alone', () => {
    const s = useDiagramStore.getState();
    s.addGroup({ x: 900, y: 900, width: 200, height: 100 }); // contains neither seeded node
    s.deleteGroup(useDiagramStore.getState().groups[0].id);
    expect(useDiagramStore.getState().nodes).toHaveLength(2);
  });

  it('selectGroup clears selectedBlockId; selectBlock clears selectedGroupId', () => {
    const s = useDiagramStore.getState();
    s.addGroup();
    const gid = useDiagramStore.getState().groups[0].id;
    s.selectBlock('n-in');
    s.selectGroup(gid);
    expect(useDiagramStore.getState().selectedGroupId).toBe(gid);
    expect(useDiagramStore.getState().selectedBlockId).toBeNull();
    s.selectBlock('n-in');
    expect(useDiagramStore.getState().selectedGroupId).toBeNull();
    expect(useDiagramStore.getState().selectedBlockId).toBe('n-in');
  });

  it('clear resets groups and group selection', () => {
    const s = useDiagramStore.getState();
    s.addGroup();
    s.selectGroup(useDiagramStore.getState().groups[0].id);
    s.clear();
    expect(useDiagramStore.getState().groups).toEqual([]);
    expect(useDiagramStore.getState().selectedGroupId).toBeNull();
  });
});
