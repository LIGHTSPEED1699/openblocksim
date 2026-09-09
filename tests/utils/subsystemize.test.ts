import { describe, it, expect } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import type { SerializedGraph } from '../../src/engine/types';
import { subsystemizeGroup } from '../../src/utils/subsystemize';

const n = (id: string, x: number, y: number): Node =>
  ({ id, type: 'Math', position: { x, y }, data: { type: 'Gain', inputs: 1, outputs: 1, color: '' } });
const e = (id: string, source: string, target: string): Edge =>
  ({ id, source, target, sourceHandle: 'out-0', targetHandle: 'in-0', type: 'straight', data: { waypoints: [] } });

describe('subsystemizeGroup', () => {
  const group = { id: 'grp-1', name: 'Group 1', color: '#3b82f6', x: 40, y: 40, width: 300, height: 200 };
  const nodes = [
    n('src', 0, 0),        // outside (feeds member)
    n('member', 80, 80),   // inside
    n('dst', 600, 80),     // outside (fed by member)
  ];

  it('replaces the group with a subsystem node whose IO matches the boundary edges', () => {
    const edges = [e('e-in', 'src', 'member'), e('e-out', 'member', 'dst')];
    const r = subsystemizeGroup(group, nodes, edges);
    expect(r.newNodes).toHaveLength(3); // src, dst + subsystem node
    const sub = r.newNodes.find((x) => x.data.type === 'Subsystem')!;
    expect(sub.type).toBe('Hierarchy');
    expect(sub.id).toMatch(/^Subsystem-/);
    expect((sub.data as any).inputs).toBe(1);
    expect((sub.data as any).outputs).toBe(1);
    expect(sub.position).toEqual({ x: 40, y: 40 }); // group origin
    expect(r.removedMemberIds).toEqual(['member']);
    expect(r.newEdges).toHaveLength(2);
    const inEdge = r.newEdges.find((x) => x.id === 'e-in')!;
    expect(inEdge.target).toBe(sub.id);
    expect(inEdge.targetHandle).toBe('in-0');
    const outEdge = r.newEdges.find((x) => x.id === 'e-out')!;
    expect(outEdge.source).toBe(sub.id);
    expect(outEdge.sourceHandle).toBe('out-0');
  });

  it('builds an inner graph with one Inport and one Outport wired to the member', () => {
    const r = subsystemizeGroup(group, nodes, [e('e-in', 'src', 'member'), e('e-out', 'member', 'dst')]);
    expect(r.subsystemJson).toBeTruthy();
    const inner: SerializedGraph = JSON.parse(r.subsystemJson);
    const byType = (t: string) => inner.blocks.filter((b) => b.type === t);
    expect(byType('Inport')).toHaveLength(1);
    expect(byType('Outport')).toHaveLength(1);
    expect(byType('Gain').map((b) => b.id)).toEqual(['member']);
    expect((byType('Inport')[0].params as any).port).toBe(0);
    expect((byType('Outport')[0].params as any).port).toBe(0);
    // inner wiring: Inport 0 → member, member → Outport 0
    const inEdge = inner.edges.find((x) => x.source === 'sys-in-0')!;
    expect(inEdge.target).toBe('member');
    const outEdge = inner.edges.find((x) => x.target === 'sys-out-0')!;
    expect(outEdge.source).toBe('member');
    // member position is local to the member-bbox origin (80,80)
    expect(byType('Gain')[0].position).toEqual({ x: 0, y: 0 });
  });

  it('inner JSON round-trips through flattenGraph back to the original flat topology', async () => {
    const r = subsystemizeGroup(group, nodes, [e('e-in', 'src', 'member'), e('e-out', 'member', 'dst')]);
    // rebuild the outer graph exactly as the store persists it (G2-T3 action)
    const outerBlocks = r.newNodes.map((x) => ({
      id: x.id,
      type: x.data.type as string,
      params: x.data.type === 'Subsystem' ? { subsystem: r.subsystemJson } : {},
      position: x.position,
    }));
    const outerEdges = r.newEdges.map((x) => ({
      id: x.id,
      source: x.source,
      sourcePort: 0,
      target: x.target,
      targetPort: 0,
    }));
    const { flattenGraph } = await import('../../src/engine/subsystems');
    const flat = flattenGraph({ blocks: outerBlocks as never, edges: outerEdges as never });
    // flatten prefixes inner ids with the subsystem id (engine contract, G2-T1):
    // strip "Subsystem-…::" so the round-trip restores the pre-fold flat topology.
    const bare = (id: string) => (id.includes('::') ? id.slice(id.indexOf('::') + 2) : id);
    expect(flat.blocks.map((b: any) => bare(b.id)).sort()).toEqual(['dst', 'member', 'src']);
    expect(flat.edges.map((x: any) => `${bare(x.source)}->${bare(x.target)}`).sort()).toEqual(['member->dst', 'src->member']);
  });

  it('degrades gracefully for an empty group (nothing to convert)', () => {
    const r = subsystemizeGroup(group, [], []);
    expect(r.removedMemberIds).toEqual([]);
    expect(r.subsystemNode).toBeTruthy();
    expect(r.newEdges).toEqual([]);
    expect(JSON.parse(r.subsystemJson)).toEqual({ blocks: [], edges: [] });
  });
});
