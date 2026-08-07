import { SerializedGraph, CompiledModel } from './types';
import { BlockRegistry } from '../blocks/registry';
import { Block, BlockType } from '../blocks/types';

export function compileGraph(
  graph: SerializedGraph,
  registry: BlockRegistry,
  dt: number
): CompiledModel {
  // Create block instances
  const blocks = new Map<string, Block>();
  for (const b of graph.blocks) {
    blocks.set(b.id, registry.create(b.type, b.params));
  }

  // Build adjacency: input edges (target ← source)
  const inputsFrom = new Map<string, { source: string; sourcePort: number; targetPort: number }[]>();
  for (const b of graph.blocks) inputsFrom.set(b.id, []);
  for (const e of graph.edges) {
    inputsFrom.get(e.target)?.push({ source: e.source, sourcePort: e.sourcePort, targetPort: e.targetPort });
  }

  // Topological sort (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  for (const b of graph.blocks) inDegree.set(b.id, 0);
  for (const e of graph.edges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  const order: string[] = [];
  const adj = new Map<string, string[]>();
  for (const b of graph.blocks) adj.set(b.id, []);
  for (const e of graph.edges) adj.get(e.source)?.push(e.target);

  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    for (const neighbor of adj.get(node) ?? []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) - 1);
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    }
  }

  // Helper: compute state size for a block (TransportDelay has dynamic size)
  const getStateSize = (id: string): number => {
    const block = blocks.get(id)!;
    if (block.type === BlockType.TransportDelay) {
      const blockParams = graph.blocks.find((b) => b.id === id)!.params;
      const delayTime = blockParams.delayTime as number;
      return Math.max(1, Math.ceil(delayTime / dt));
    }
    return block.stateSize;
  };

  // Assign state indices to dynamic blocks
  let stateOffset = 0;
  const stateOffsets = new Map<string, number>();
  for (const id of order) {
    const block = blocks.get(id)!;
    if (block.isDynamic) {
      stateOffsets.set(id, stateOffset);
      stateOffset += getStateSize(id);
    }
  }

  // Identify scopes and workspace blocks
  const scopeBlockIds: string[] = [];
  const workspaceBlockIds: string[] = [];
  for (const id of order) {
    const block = blocks.get(id)!;
    if (block.type === BlockType.Scope) scopeBlockIds.push(id);
    if (block.type === BlockType.ToWorkspace) workspaceBlockIds.push(id);
  }

  // Helper: gather inputs for a block
  const gatherInputs = (
    id: string,
    outputs: Map<string, number[]>
  ): number[] => {
    const block = blocks.get(id)!;
    const inputWires = inputsFrom.get(id) ?? [];
    const inputValues: number[] = [];
    for (let port = 0; port < block.inputs; port++) {
      const wire = inputWires.find((w) => w.targetPort === port);
      if (wire) {
        const srcOutputs = outputs.get(wire.source) ?? [];
        inputValues.push(srcOutputs[wire.sourcePort] ?? 0);
      } else {
        inputValues.push(0);
      }
    }
    return inputValues;
  };

  // Helper: extract block state from global state vector
  const getBlockState = (id: string, state: number[]): number[] => {
    const block = blocks.get(id)!;
    if (!block.isDynamic) return [];
    const offset = stateOffsets.get(id)!;
    return state.slice(offset, offset + getStateSize(id));
  };

  // Generate f(t, state) → state_dot
  const f = (t: number, state: number[]): number[] => {
    const outputs = new Map<string, number[]>();
    const stateDot = new Array(stateOffset).fill(0);

    for (const id of order) {
      const block = blocks.get(id)!;
      const blockParams = graph.blocks.find((b) => b.id === id)!.params;
      const blockState = getBlockState(id, state);
      const inputValues = gatherInputs(id, outputs);

      const [output, newStateOrDot] = block.compute(dt, inputValues, blockState, blockParams, t);
      outputs.set(id, output);

      if (block.isDynamic) {
        const offset = stateOffsets.get(id)!;
        for (let i = 0; i < newStateOrDot.length; i++) {
          stateDot[offset + i] = newStateOrDot[i];
        }
      }
    }

    return stateDot;
  };

  // getOutputs(t, state) — evaluates block outputs without computing state_dot
  // Used by solver to capture scope traces at each step
  const getOutputs = (t: number, state: number[]): Map<string, number[]> => {
    const outputs = new Map<string, number[]>();
    for (const id of order) {
      const block = blocks.get(id)!;
      const blockParams = graph.blocks.find((b) => b.id === id)!.params;
      const blockState = getBlockState(id, state);
      const inputValues = gatherInputs(id, outputs);
      const [output] = block.compute(dt, inputValues, blockState, blockParams, t);
      outputs.set(id, output);
    }
    return outputs;
  };

  // Track which blocks use absolute state updates (TransportDelay, Relay)
  const absoluteBlockIds = new Set<string>();
  for (const id of order) {
    const block = blocks.get(id)!;
    if (block.isDynamic && block.stateUpdateMode === 'absolute') {
      absoluteBlockIds.add(id);
    }
  }

  // applyAbsoluteState(t, state) — for blocks with absolute state updates,
  // compute the new state directly (not via RK4 integration)
  const applyAbsoluteState = (t: number, state: number[]): void => {
    const allOutputs = getOutputs(t, state);
    for (const id of order) {
      if (!absoluteBlockIds.has(id)) continue;
      const block = blocks.get(id)!;
      const blockParams = graph.blocks.find((b) => b.id === id)!.params;
      const offset = stateOffsets.get(id)!;
      const sz = getStateSize(id);
      const blockState = state.slice(offset, offset + sz);
      const inputValues = gatherInputs(id, allOutputs);
      const [, newState] = block.compute(dt, inputValues, blockState, blockParams, t);
      for (let i = 0; i < sz; i++) {
        state[offset + i] = newState[i];
      }
    }
  };

  return {
    stateSize: stateOffset,
    f,
    getOutputs,
    absoluteBlockIds,
    applyAbsoluteState,
    outputMap: new Map(),
    scopeBlockIds,
    workspaceBlockIds,
    blockOrder: order,
  };
}