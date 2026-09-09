import { describe, it, expect, beforeEach } from 'vitest';
import { exportModel, importModel } from '../../src/utils/exportImport';
import { useDiagramStore } from '../../src/store/diagramStore';

// NOTE: exportModel() downloads a Blob (exportImport.ts:43-50) — not callable
// headlessly. The export shape is therefore asserted by rebuilding the exact
// object exportModel constructs (documented at exportImport.ts:25-41) and
// importing it; the import side is the behavior under test here.
function exportShapedModel() {
  const state = useDiagramStore.getState();
  return {
    blocks: state.nodes.map((n) => ({
      id: n.id,
      type: n.data?.type,
      params: state.params[n.id] ?? {},
      position: n.position,
    })),
    edges: state.edges.map((e) => ({
      id: e.id, source: e.source, sourcePort: 0, target: e.target, targetPort: 0, waypoints: [],
    })),
    groups: state.groups.map((g) => ({ ...g })),
  };
}

describe('group round-trip', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
  });

  it('restores groups and derives membership from geometry after import', async () => {
    const s = useDiagramStore.getState();
    s.setNodes([
      { id: 'c1', type: 'Source', position: { x: 70, y: 70 }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } },
      { id: 'g2', type: 'Math', position: { x: 400, y: 400 }, data: { type: 'Gain', inputs: 1, outputs: 1, color: '' } },
    ]);
    s.addGroup({ x: 0, y: 0, width: 300, height: 200 }); // contains c1, not g2

    const file = new File([JSON.stringify(exportShapedModel())], 'model.json', { type: 'application/json' });
    await importModel(file);

    const state = useDiagramStore.getState();
    expect(state.groups).toHaveLength(1);
    const g = state.groups[0];
    expect(g.id).toMatch(/^grp-/);
    expect(g.x).toBe(0);
    expect(g.width).toBe(300);
    expect(g.name).toBe('Group 1');

    // membership is pure geometry over the *restored* nodes
    const { groupMemberIds } = await import('../../src/utils/groups');
    expect(groupMemberIds(g, state.nodes)).toEqual(['c1']);
  });

  it('addGroup after import continues numbering and colors', async () => {
    const s = useDiagramStore.getState();
    s.addGroup({ x: 0, y: 0 });
    const file = new File([JSON.stringify(exportShapedModel())], 'model.json', { type: 'application/json' });
    await importModel(file);
    useDiagramStore.getState().addGroup({ x: 10, y: 10 });
    expect(useDiagramStore.getState().groups[1].name).toBe('Group 2');
  });

  it('imports legacy files without a groups key as empty', async () => {
    const legacy = JSON.stringify({
      blocks: [{ id: 'c1', type: 'Constant', params: {}, position: { x: 0, y: 0 } }],
      edges: [],
    });
    const file = new File([legacy], 'old.json', { type: 'application/json' });
    await importModel(file);
    expect(useDiagramStore.getState().groups).toEqual([]);
  });

  it('import clears any previous groups', async () => {
    useDiagramStore.getState().addGroup();
    const file = new File([JSON.stringify({ blocks: [], edges: [] })], 'empty.json', { type: 'application/json' });
    await importModel(file);
    expect(useDiagramStore.getState().groups).toEqual([]);
  });
});
