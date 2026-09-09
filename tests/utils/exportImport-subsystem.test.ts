import { describe, it, expect, beforeEach } from 'vitest';
import { importModel } from '../../src/utils/exportImport';
import { useDiagramStore } from '../../src/store/diagramStore';
import { BlockType } from '../../src/blocks/types';

describe('subsystem JSON round-trip through importModel (R-G3)', () => {
  beforeEach(() => useDiagramStore.getState().clear());

  it('restores a subsystem node with IO derived from the inner ports and keeps params.subsystem intact', async () => {
    const inner = JSON.stringify({
      blocks: [
        { id: 'ip0', type: 'Inport', params: { port: 0 }, position: { x: 0, y: 0 } },
        { id: 'ip1', type: 'Inport', params: { port: 1 }, position: { x: 0, y: 0 } },
        { id: 'g', type: 'Gain', params: { gain: 2 }, position: { x: 100, y: 0 } },
        { id: 'op0', type: 'Outport', params: { port: 0 }, position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: 'a', source: 'ip0', sourcePort: 0, target: 'g', targetPort: 0 },
        { id: 'b', source: 'g', sourcePort: 0, target: 'op0', targetPort: 0 },
      ],
    });
    const file = new File([JSON.stringify({
      blocks: [
        { id: 'c', type: 'Constant', params: { value: 1 }, position: { x: 0, y: 0 } },
        { id: 'sub', type: 'Subsystem', params: { subsystem: inner }, position: { x: 200, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'c', sourcePort: 0, target: 'sub', targetPort: 0 }],
    })], 'model.json', { type: 'application/json' });

    await importModel(file);
    const state = useDiagramStore.getState();
    const sub = state.nodes.find((n) => n.data?.type === BlockType.Subsystem)!;
    expect(sub.type).toBe('Hierarchy');
    expect((sub.data as any).inputs).toBe(2);
    expect((sub.data as any).outputs).toBe(1);
    expect(state.params.sub.subsystem).toBe(inner); // byte-identical inner graph
    expect(state.edges[0].target).toBe('sub');
  });

  it('legacy models (no subsystem anywhere) still import', async () => {
    const file = new File([JSON.stringify({
      blocks: [{ id: 'c', type: 'Constant', params: {}, position: { x: 0, y: 0 } }],
      edges: [],
    })], 'old.json', { type: 'application/json' });
    await importModel(file);
    expect(useDiagramStore.getState().nodes).toHaveLength(1);
  });
});
