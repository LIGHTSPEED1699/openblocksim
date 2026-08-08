import { useDiagramStore } from '../store/diagramStore';
import type { SerializedGraph } from '../engine/types';
import type { Node, Edge } from '@xyflow/react';
import type { BlockType } from '../blocks/types';
import { BlockCategory } from '../blocks/types';

interface ExportedModel {
  blocks: SerializedGraph['blocks'];
  edges: SerializedGraph['edges'];
  simConfig: { dt: number; duration: number };
}

function parsePort(handle: string | null | undefined): number {
  if (!handle) return 0;
  const parts = handle.split('-');
  const n = parseInt(parts[parts.length - 1], 10);
  return isNaN(n) ? 0 : n;
}

export function exportModel(): void {
  const { nodes, edges, params, simConfig } = useDiagramStore.getState();
  const model: ExportedModel = {
    blocks: nodes.map((n) => ({
      id: n.id,
      type: n.data?.type as BlockType,
      params: params[n.id] ?? {},
      position: n.position,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourcePort: parsePort(e.sourceHandle),
      target: e.target,
      targetPort: parsePort(e.targetHandle),
    })),
    simConfig,
  };

  const json = JSON.stringify(model, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'model.json';
  a.click();
  URL.revokeObjectURL(url);
}

export async function importModel(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text) as ExportedModel;
  if (!data.blocks || !data.edges) {
    throw new Error('Invalid model file: missing blocks or edges');
  }

  const store = useDiagramStore.getState();
  store.clear();

  const nodes: Node[] = data.blocks.map((b) => {
    const io = TYPE_IO[b.type] ?? { inputs: 1, outputs: 1 };
    return {
      id: b.id,
      type: categoryForType(b.type),
      position: b.position,
      data: { type: b.type, inputs: io.inputs, outputs: io.outputs, color: '' },
    };
  });

  const edges: Edge[] = data.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: `out-${e.sourcePort}`,
    targetHandle: `in-${e.targetPort}`,
  }));

  store.setNodes(nodes);
  store.setEdges(edges);
  for (const b of data.blocks) {
    store.updateParams(b.id, b.params);
  }
  if (data.simConfig) {
    store.setSimConfig(data.simConfig);
  }
}

const TYPE_IO: Record<string, { inputs: number; outputs: number }> = {
  Constant: { inputs: 0, outputs: 1 }, Step: { inputs: 0, outputs: 1 },
  Ramp: { inputs: 0, outputs: 1 }, Sine: { inputs: 0, outputs: 1 },
  Square: { inputs: 0, outputs: 1 },
  Scope: { inputs: 1, outputs: 0 }, ToWorkspace: { inputs: 1, outputs: 0 },
  Sum: { inputs: 2, outputs: 1 }, Gain: { inputs: 1, outputs: 1 }, Product: { inputs: 2, outputs: 1 },
  TransferFunction: { inputs: 1, outputs: 1 }, StateSpace: { inputs: 1, outputs: 1 },
  Integrator: { inputs: 1, outputs: 1 }, Derivative: { inputs: 1, outputs: 1 },
  TransportDelay: { inputs: 1, outputs: 1 },
  Saturation: { inputs: 1, outputs: 1 }, Deadzone: { inputs: 1, outputs: 1 },
  PID: { inputs: 1, outputs: 1 }, Relay: { inputs: 1, outputs: 1 },
};

const CATEGORY_FOR_TYPE: Record<string, BlockCategory> = {
  Constant: BlockCategory.Source, Step: BlockCategory.Source, Ramp: BlockCategory.Source,
  Sine: BlockCategory.Source, Square: BlockCategory.Source,
  Scope: BlockCategory.Sink, ToWorkspace: BlockCategory.Sink,
  Sum: BlockCategory.Math, Gain: BlockCategory.Math, Product: BlockCategory.Math,
  TransferFunction: BlockCategory.Linear, StateSpace: BlockCategory.Linear,
  Integrator: BlockCategory.Linear, Derivative: BlockCategory.Linear, TransportDelay: BlockCategory.Linear,
  Saturation: BlockCategory.Nonlinear, Deadzone: BlockCategory.Nonlinear,
  PID: BlockCategory.Control, Relay: BlockCategory.Control,
};

function categoryForType(type: BlockType): string {
  return CATEGORY_FOR_TYPE[type] ?? BlockCategory.Math;
}