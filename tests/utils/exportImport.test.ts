import { describe, it, expect, beforeEach } from 'vitest';
import { importModel } from '../../src/utils/exportImport';
import { useDiagramStore } from '../../src/store/diagramStore';

function makeModelJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    blocks: [
      { id: 'Constant-1', type: 'Constant', params: { value: 1 }, position: { x: 100, y: 100 } },
      { id: 'Scope-1', type: 'Scope', params: {}, position: { x: 400, y: 100 } },
    ],
    edges: [
      { id: 'e1', source: 'Constant-1', sourcePort: 0, target: 'Scope-1', targetPort: 0 },
    ],
    simConfig: { dt: 0.01, duration: 10 },
    ...overrides,
  });
}

describe('importModel', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
  });

  it('imports blocks, edges, params, and simConfig', async () => {
    const json = makeModelJson();
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    const state = useDiagramStore.getState();
    expect(state.nodes).toHaveLength(2);
    expect(state.nodes[0].data.type).toBe('Constant');
    expect(state.nodes[1].data.type).toBe('Scope');
    expect(state.edges).toHaveLength(1);
    expect(state.edges[0].source).toBe('Constant-1');
    expect(state.edges[0].target).toBe('Scope-1');
    expect(state.params['Constant-1']).toEqual({ value: 1 });
    expect(state.simConfig).toEqual({ dt: 0.01, duration: 10 });
  });

  it('sets correct IO counts from TYPE_IO lookup', async () => {
    const json = makeModelJson();
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    const state = useDiagramStore.getState();
    expect(state.nodes[0].data.inputs).toBe(0);
    expect(state.nodes[0].data.outputs).toBe(1);
    expect(state.nodes[1].data.inputs).toBe(1);
    expect(state.nodes[1].data.outputs).toBe(0);
  });

  it('maps sourcePort/targetPort to sourceHandle/targetHandle strings', async () => {
    const json = makeModelJson();
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    const edge = useDiagramStore.getState().edges[0];
    expect(edge.sourceHandle).toBe('out-0');
    expect(edge.targetHandle).toBe('in-0');
  });

  it('clears existing state before import', async () => {
    useDiagramStore.getState().addNode(
      { id: 'old', type: 'Source', position: { x: 0, y: 0 }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } },
      'Constant' as any,
      {},
    );

    const json = makeModelJson();
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    const state = useDiagramStore.getState();
    expect(state.nodes.find(n => n.id === 'old')).toBeUndefined();
    expect(state.nodes).toHaveLength(2);
  });

  it('throws on missing blocks', async () => {
    const json = JSON.stringify({ edges: [] });
    const file = new File([json], 'bad.json', { type: 'application/json' });
    await expect(importModel(file)).rejects.toThrow('Invalid model file');
  });

  it('throws on missing edges', async () => {
    const json = JSON.stringify({ blocks: [] });
    const file = new File([json], 'bad.json', { type: 'application/json' });
    await expect(importModel(file)).rejects.toThrow('Invalid model file');
  });

  it('throws on invalid JSON', async () => {
    const file = new File(['not json'], 'bad.json', { type: 'application/json' });
    await expect(importModel(file)).rejects.toThrow();
  });

  it('defaults simConfig when not present in imported file', async () => {
    const json = JSON.stringify({
      blocks: [{ id: 'Constant-1', type: 'Constant', params: {}, position: { x: 0, y: 0 } }],
      edges: [],
    });
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    const state = useDiagramStore.getState();
    expect(state.simConfig.dt).toBe(0.01);
  });

  it('imports a graph with all block types and verifies category mapping', async () => {
    const blocks = [
      { id: 's1', type: 'Sine', params: {}, position: { x: 0, y: 0 } },
      { id: 'sc1', type: 'Scope', params: {}, position: { x: 100, y: 0 } },
      { id: 'sum1', type: 'Sum', params: {}, position: { x: 200, y: 0 } },
      { id: 'tf1', type: 'TransferFunction', params: {}, position: { x: 300, y: 0 } },
      { id: 'sat1', type: 'Saturation', params: {}, position: { x: 400, y: 0 } },
      { id: 'pid1', type: 'PID', params: {}, position: { x: 500, y: 0 } },
    ];
    const json = JSON.stringify({ blocks, edges: [] });
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    const state = useDiagramStore.getState();
    expect(state.nodes[0].type).toBe('Source');
    expect(state.nodes[1].type).toBe('Sink');
    expect(state.nodes[2].type).toBe('Math');
    expect(state.nodes[3].type).toBe('Linear');
    expect(state.nodes[4].type).toBe('Nonlinear');
    expect(state.nodes[5].type).toBe('Control');
    // PID (ISA form): 2 inputs (error + PV), 1 output
    expect(state.nodes[5].data.inputs).toBe(2);
    expect(state.nodes[5].data.outputs).toBe(1);
  });

  it('handles unknown block type gracefully (falls back to Math category)', async () => {
    const json = JSON.stringify({
      blocks: [{ id: 'x1', type: 'UnknownBlock', params: {}, position: { x: 0, y: 0 } }],
      edges: [],
    });
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    const node = useDiagramStore.getState().nodes[0];
    expect(node.type).toBe('Math');
    expect(node.data.inputs).toBe(1);
    expect(node.data.outputs).toBe(1);
  });

  it('round-trips waypoints through export/import', async () => {
    const modelWithWaypoints = {
      blocks: [
        { id: 'src', type: 'Constant', params: { value: 1 }, position: { x: 300, y: 100 } },
        { id: 'tgt', type: 'Scope', params: {}, position: { x: 100, y: 100 } },
      ],
      edges: [
        {
          id: 'e1', source: 'src', sourcePort: 0, target: 'tgt', targetPort: 0,
          waypoints: [{ x: 350, y: 100 }, { x: 350, y: 200 }, { x: 50, y: 200 }, { x: 50, y: 100 }],
        },
      ],
    };
    const json = JSON.stringify(modelWithWaypoints);
    const file = new File([json], 'model.json', { type: 'application/json' });
    await importModel(file);

    const edge = useDiagramStore.getState().edges[0];
    expect((edge.data as any).waypoints).toEqual(modelWithWaypoints.edges[0].waypoints);
    expect(edge.type).toBe('straight');
  });

  it('imports old-format JSON (no waypoints) with empty array', async () => {
    const json = JSON.stringify({
      blocks: [
        { id: 'src', type: 'Constant', params: {}, position: { x: 0, y: 0 } },
        { id: 'tgt', type: 'Scope', params: {}, position: { x: 100, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'src', sourcePort: 0, target: 'tgt', targetPort: 0 }],
    });
    const file = new File([json], 'old.json', { type: 'application/json' });
    await importModel(file);

    const edge = useDiagramStore.getState().edges[0];
    expect((edge.data as any).waypoints).toEqual([]);
    expect(edge.type).toBe('straight');
  });
});
