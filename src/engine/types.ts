import { BlockType, Params } from '../blocks/types';

export interface SerializedBlock {
  id: string;
  type: BlockType;
  params: Params;
  position: { x: number; y: number };
}

export interface SerializedEdge {
  id: string;
  source: string;
  sourcePort: number;
  target: string;
  targetPort: number;
}

export interface SerializedGraph {
  blocks: SerializedBlock[];
  edges: SerializedEdge[];
}

export interface SimConfig {
  dt: number;
  duration: number;
}

export interface SimResult {
  time: number[];
  traces: Record<string, number[]>; // blockId → output values over time
  scopes: Record<string, number[]>; // scopeBlockId → input values over time
}

export interface CompiledModel {
  stateSize: number;
  f: (t: number, state: number[]) => number[]; // state_dot
  outputMap: Map<string, number[]>; // blockId → output indices in signal vector
  scopeBlockIds: string[];
  workspaceBlockIds: string[];
  blockOrder: string[]; // topological order of block IDs
  getOutputs: (t: number, state: number[]) => Map<string, number[]>; // blockId → output values
  updatePrevOutputs: (t: number, state: number[]) => void; // snapshot outputs for next step's feedback edges
  absoluteBlockIds: Set<string>; // blocks using absolute state updates (TransportDelay, Relay)
  applyAbsoluteState: (t: number, state: number[]) => void; // apply absolute state updates in-place
}

export type WorkerMessage =
  | { type: 'run'; graph: SerializedGraph; dt: number; duration: number }
  | { type: 'cancel' }
  | { type: 'progress'; percent: number }
  | { type: 'done'; results: SimResult }
  | { type: 'error'; message: string; blockId?: string; time?: number };
