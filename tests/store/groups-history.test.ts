import { useDiagramStore } from '../../src/store/diagramStore';

describe('groups undo/redo via Feature F seam', () => {
  beforeEach(() => useDiagramStore.getState().clear());
  it('undo restores an added group box', () => {
    const s = useDiagramStore.getState();
    s.addGroup({ x: 0, y: 0, width: 200, height: 100 });
    expect(useDiagramStore.getState().groups).toHaveLength(1);
    useDiagramStore.getState().undo();
    expect(useDiagramStore.getState().groups).toHaveLength(0);
    useDiagramStore.getState().redo();
    expect(useDiagramStore.getState().groups).toHaveLength(1);
  });
  it('undo restores a moved/resized group rect', () => {
    const s = useDiagramStore.getState();
    s.addGroup({ x: 0, y: 0, width: 200, height: 100 });
    const id = useDiagramStore.getState().groups[0].id;
    s.moveGroupTo(id, 50, 60);
    s.resizeGroup(id, { width: 300 });
    useDiagramStore.getState().undo(); // undo resize
    expect(useDiagramStore.getState().groups[0].width).toBe(200);
    useDiagramStore.getState().undo(); // undo move
    expect(useDiagramStore.getState().groups[0].x).toBe(0);
  });
});
