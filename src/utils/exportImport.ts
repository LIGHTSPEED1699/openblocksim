import { useDiagramStore } from '../store/diagramStore';
import type { SerializedGraph } from '../engine/types';
import type { Node, Edge, XYPosition } from '@xyflow/react';
import type { BlockType } from '../blocks/types';
import { BlockCategory } from '../blocks/types';

export interface ExportedModel {
  blocks: SerializedGraph['blocks'];
  edges: (SerializedGraph['edges'][number] & { waypoints?: XYPosition[] })[];
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
  const nodeIds = new Set(nodes.map((n) => n.id));
  // Filter out phantom edges whose source or target doesn't exist
  const cleanEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  const model: ExportedModel = {
    blocks: nodes.map((n) => ({
      id: n.id,
      type: n.data?.type as BlockType,
      params: params[n.id] ?? {},
      position: n.position,
    })),
    edges: cleanEdges.map((e) => ({
      id: e.id,
      source: e.source,
      sourcePort: parsePort(e.sourceHandle),
      target: e.target,
      targetPort: parsePort(e.targetHandle),
      waypoints: (e.data as any)?.waypoints ?? [],
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
  loadModel(data);
}

/**
 * Load a parsed model into the diagram store, replacing the current model.
 * Used by both file import and the built-in example gallery.
 */
export function loadModel(data: ExportedModel): void {
  if (!data.blocks || !data.edges) {
    throw new Error('Invalid model file: missing blocks or edges');
  }

  const store = useDiagramStore.getState();
  store.clear();

  const blockIds = new Set(data.blocks.map((b) => b.id));

  const nodes: Node[] = data.blocks.map((b) => {
    const io = TYPE_IO[b.type] ?? { inputs: 1, outputs: 1 };
    // Variable-input blocks: override inputs from saved params
    let inputs = io.inputs;
    if ((b.type === 'Sum' || b.type === 'Product') && b.params?.inputCount) {
      const max = b.type === 'Sum' ? 8 : 4;
      inputs = Math.max(2, Math.min(max, b.params.inputCount as number));
    }
    return {
      id: b.id,
      type: categoryForType(b.type),
      position: b.position,
      data: { type: b.type, inputs, outputs: io.outputs, color: '' },
    };
  });

  // Filter out phantom edges whose source or target doesn't exist in blocks
  const edges: Edge[] = data.edges
    .filter((e) => blockIds.has(e.source) && blockIds.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: `out-${e.sourcePort}`,
      targetHandle: `in-${e.targetPort}`,
      type: 'straight',
      data: { waypoints: (e as any).waypoints ?? [] },
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
  PID: { inputs: 2, outputs: 1 }, Relay: { inputs: 1, outputs: 1 },
  Abs: { inputs: 1, outputs: 1 }, Sign: { inputs: 1, outputs: 1 },
  Bias: { inputs: 1, outputs: 1 }, UnaryMinus: { inputs: 1, outputs: 1 },
  Divide: { inputs: 2, outputs: 1 }, MinMax: { inputs: 2, outputs: 1 },
  RoundingFunction: { inputs: 1, outputs: 1 }, MathFunction: { inputs: 1, outputs: 1 },
  TrigFunction: { inputs: 1, outputs: 1 },
  Switch: { inputs: 3, outputs: 1 },
  UnitDelay: { inputs: 1, outputs: 1 },
  DiscreteIntegrator: { inputs: 1, outputs: 1 },
  DiscreteTransferFcn: { inputs: 1, outputs: 1 },
  Memory: { inputs: 1, outputs: 1 },
  RateLimiter: { inputs: 1, outputs: 1 },
  Quantizer: { inputs: 1, outputs: 1 },
  Backlash: { inputs: 1, outputs: 1 },
  PulseGenerator: { inputs: 0, outputs: 1 },
  Clock: { inputs: 0, outputs: 1 },
  ChirpSignal: { inputs: 0, outputs: 1 },
  RepeatingSequence: { inputs: 0, outputs: 1 },
  RandomNumber: { inputs: 0, outputs: 1 },
  Terminator: { inputs: 1, outputs: 0 },
  Display: { inputs: 1, outputs: 0 },
  StopSimulation: { inputs: 1, outputs: 0 },
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
  Abs: BlockCategory.Math, Sign: BlockCategory.Math, Bias: BlockCategory.Math,
  UnaryMinus: BlockCategory.Math, Divide: BlockCategory.Math, MinMax: BlockCategory.Math,
  RoundingFunction: BlockCategory.Math, MathFunction: BlockCategory.Math, TrigFunction: BlockCategory.Math,
  Switch: BlockCategory.Routing,
  UnitDelay: BlockCategory.Discrete, DiscreteIntegrator: BlockCategory.Discrete,
  DiscreteTransferFcn: BlockCategory.Discrete, Memory: BlockCategory.Discrete,
  RateLimiter: BlockCategory.Nonlinear, Quantizer: BlockCategory.Nonlinear,
  Backlash: BlockCategory.Nonlinear,
  PulseGenerator: BlockCategory.Source, Clock: BlockCategory.Source,
  ChirpSignal: BlockCategory.Source, RepeatingSequence: BlockCategory.Source,
  RandomNumber: BlockCategory.Source,
  Terminator: BlockCategory.Sink, Display: BlockCategory.Sink,
  StopSimulation: BlockCategory.Sink,
};

function categoryForType(type: BlockType): string {
  return CATEGORY_FOR_TYPE[type] ?? BlockCategory.Math;
}