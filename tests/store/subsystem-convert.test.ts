import { describe, it, expect, beforeEach } from 'vitest';
import { useDiagramStore } from '../../src/store/diagramStore';
import type { SerializedGraph } from '../../src/engine/types';

function seedGroupInsideBox(): string {
  const s = useDiagramStore.getState();
  s.clear();
  s.setNodes([
    { id: 'src', type: 'Source', position: { x: 10, y: 10 }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } },
    { id: 'member', type: 'Math', position: { x: 80, y: 80 }, data: { type: 'Gain', inputs: 1, outputs: 1, color: '' } },
    { id: 'dst', type: 'Sink', position: { x: 500, y: 80 }, data: { type: 'Scope', inputs: 1, outputs: 0, color: '' } },
  ]);
  s.setEdges([
    { id: 'e1', source: 'src', target: 'member', sourceHandle: 'out-0', targetHandle: 'in-0', type: 'straight', data: { waypoints: [] } },
    { id: 'e2', source: 'member', target: 'dst', sourceHandle: 'out-0', targetHandle: 'in-0', type: 'straight', data: { waypoints: [] } },
  ]);
  s.updateParams('src', { value: 2 });
  s.updateParams('member', { gain: 5 });
  s.addGroup({ x: 40, y: 40, width: 300, height: 200 }); // only 'member' anchor (80,80) is inside
  const gid = useDiagramStore.getState().groups[0].id;
  s.selectGroup(gid);
  return gid;
}

describe('convertGroupToSubsystem', () => {
  beforeEach(() => useDiagramStore.getState().clear());

  it('replaces the group box and members with one Subsystem node wired through its ports', () => {
    const gid = seedGroupInsideBox();
    useDiagramStore.getState().convertGroupToSubsystem(gid);
    const s = useDiagramStore.getState();
    expect(s.groups).toHaveLength(0);
    const ids = s.nodes.map((n) => n.id).sort();
    expect(ids).toEqual([expect.stringMatching(/^Subsystem-/), 'dst', 'src']);
    const sub = s.nodes.find((n) => n.data.type === 'Subsystem')!;
    expect(sub.type).toBe('Hierarchy');
    expect((sub.data as any).inputs).toBe(1);
    expect((sub.data as any).outputs).toBe(1);
    expect(s.edges.map((e) => `${e.source}->${e.target}`).sort()).toEqual([`src->${sub.id}`, `${sub.id}->dst`].sort());
    const inEdge = s.edges.find((e) => e.target === sub.id)!;
    expect(inEdge.targetHandle).toBe('in-0');
    expect(inEdge.source).toBe('src');
    const outEdge = s.edges.find((e) => e.source === sub.id)!;
    expect(outEdge.sourceHandle).toBe('out-0');
    expect(outEdge.target).toBe('dst');
  });

  it('keeps member params inside the persisted inner graph (gain survives the move)', () => {
    const gid = seedGroupInsideBox();
    useDiagramStore.getState().convertGroupToSubsystem(gid);
    const s = useDiagramStore.getState();
    const sub = s.nodes.find((n) => n.data.type === 'Subsystem')!;
    const inner = JSON.parse(s.params[sub.id].subsystem as string) as SerializedGraph;
    const gain = inner.blocks.find((b) => b.type === 'Gain')!;
    expect(gain.id).toBe('member');
    expect(gain.params.gain).toBe(5);
    // member node/params are gone from the outer store
    expect(s.nodes.find((n) => n.id === 'member')).toBeUndefined();
    expect(s.params.member).toBeUndefined();
  });

  it('clears group/block selection after conversion', () => {
    const gid = seedGroupInsideBox();
    useDiagramStore.getState().convertGroupToSubsystem(gid);
    const s = useDiagramStore.getState();
    expect(s.selectedGroupId).toBeNull();
    expect(s.selectedBlockId).toBeNull();
  });
});
