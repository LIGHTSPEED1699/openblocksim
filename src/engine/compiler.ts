import { SerializedGraph, CompiledModel, CrossingEvent } from './types';
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

  // Filter out phantom edges whose source or target doesn't exist in blocks.
  // These can appear from edge wire redesign artifacts or corrupted imports.
  const validEdges = graph.edges.filter(
    (e) => blocks.has(e.source) && blocks.has(e.target),
  );

  // Build adjacency: input edges (target ← source)
  const inputsFrom = new Map<string, { source: string; sourcePort: number; targetPort: number }[]>();
  for (const b of graph.blocks) inputsFrom.set(b.id, []);
  for (const e of validEdges) {
    inputsFrom.get(e.target)?.push({ source: e.source, sourcePort: e.sourcePort, targetPort: e.targetPort });
  }

  // Topological sort (Kahn's algorithm) with feedback edge detection
  // For cyclic graphs (closed-loop), identify feedback edges and break the cycle
  const inDegree = new Map<string, number>();
  for (const b of graph.blocks) inDegree.set(b.id, 0);
  for (const e of validEdges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const adj = new Map<string, string[]>();
  for (const b of graph.blocks) adj.set(b.id, []);
  for (const e of validEdges) adj.get(e.source)?.push(e.target);

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  const order: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    for (const neighbor of adj.get(node) ?? []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) - 1);
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    }
  }

  // If there are blocks not yet ordered, they are part of cycles.
  // Break feedback edges to resolve the cycle.
  // Feedback edges use previous-step outputs (one-step delay).
  const feedbackEdges = new Set<string>();
  while (order.length < graph.blocks.length) {
    // Find edges within the remaining cyclic subgraph
    const unordered = new Set(graph.blocks.map((b) => b.id).filter((id) => !order.includes(id)));
    let broke = false;
    for (const e of validEdges) {
      if (unordered.has(e.source) && unordered.has(e.target) && !feedbackEdges.has(e.id)) {
        // Prefer breaking edges from dynamic blocks (they have state for delay)
        const srcBlock = blocks.get(e.source)!;
        if (!srcBlock.isDynamic) continue;
        feedbackEdges.add(e.id);
        inDegree.set(e.target, (inDegree.get(e.target) ?? 0) - 1);
        broke = true;
        break;
      }
    }
    if (!broke) {
      // No dynamic block edge to break — try any edge in the cycle
      for (const e of validEdges) {
        if (unordered.has(e.source) && unordered.has(e.target) && !feedbackEdges.has(e.id)) {
          feedbackEdges.add(e.id);
          inDegree.set(e.target, (inDegree.get(e.target) ?? 0) - 1);
          broke = true;
          break;
        }
      }
    }
    if (!broke) break; // Cannot resolve — should not happen if graph is validated
    // Continue Kahn's algorithm after breaking the feedback edge
    for (const [id, deg] of inDegree) {
      if (deg === 0 && !order.includes(id)) queue.push(id);
    }
    while (queue.length > 0) {
      const node = queue.shift()!;
      order.push(node);
      for (const neighbor of adj.get(node) ?? []) {
        const edge = validEdges.find(
          (e) => e.source === node && e.target === neighbor,
        );
        if (edge && feedbackEdges.has(edge.id)) continue;
        inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) - 1);
        if (inDegree.get(neighbor) === 0 && !order.includes(neighbor)) queue.push(neighbor);
      }
    }
  }

  // Classify feedback cycles as algebraic or dynamic.
  // For each feedback edge (source → target), walk the cycle from target back
  // to source through non-feedback edges. If no block in the cycle is dynamic
  // (stateUpdateMode derivative/absolute), the loop is algebraic.
  const algebraicLoops: string[][] = [];
  const dynamicLoops: string[][] = [];
  // Build adjacency excluding feedback edges for cycle walking
  const cycleAdj = new Map<string, string[]>();
  for (const b of graph.blocks) cycleAdj.set(b.id, []);
  for (const e of validEdges) {
    if (!feedbackEdges.has(e.id)) cycleAdj.get(e.source)?.push(e.target);
  }

  for (const feId of feedbackEdges) {
    const fe = validEdges.find((e) => e.id === feId);
    if (!fe) continue;
    const cycleStart = fe.target; // cycle: target → ... → source → target
    const cycleEnd = fe.source;
    // DFS from cycleStart to cycleEnd through non-feedback edges
    const visited = new Set<string>();
    let found: string[] | null = null;
    function dfsCycle(node: string, path: string[]): boolean {
      if (node === cycleEnd) {
        found = [...path, node];
        return true;
      }
      if (visited.has(node)) return false;
      visited.add(node);
      for (const next of cycleAdj.get(node) ?? []) {
        if (dfsCycle(next, [...path, node])) return true;
      }
      return false;
    }
    dfsCycle(cycleStart, []);
    if (!found) found = [cycleStart, cycleEnd];
    const hasDynamic = found.some((id) => blocks.get(id)?.isDynamic);
    if (hasDynamic) {
      dynamicLoops.push(found);
    } else {
      algebraicLoops.push(found);
    }
  }

  // Merge block parameter defaults with graph params.
  // Blocks dropped on canvas get params={} (factory create() ignores the
  // argument). Without this merge, compute() receives undefined for every
  // parameter, producing NaN in arithmetic. This is the single chokepoint
  // where all simulation params flow through, so it covers drag-drop,
  // saved models, and any other path that leaves params empty.
  const mergedParams = new Map<string, typeof graph.blocks[0]['params']>();
  for (const b of graph.blocks) {
    const block = blocks.get(b.id)!;
    const defaults: Record<string, number | number[] | string> = {};
    for (const [key, spec] of Object.entries(block.parameters)) {
      defaults[key] = spec.default;
    }
    mergedParams.set(b.id, { ...defaults, ...b.params });
  }

  // Helper: compute state size for a block (TransportDelay and TransferFunction have dynamic size)
  const getStateSize = (id: string): number => {
    const block = blocks.get(id)!;
    const blockParams = mergedParams.get(id)!;
    if (block.type === BlockType.TransportDelay) {
      const delayTime = blockParams.delayTime as number;
      return Math.max(1, Math.ceil(delayTime / dt));
    }
    if (block.type === BlockType.TransferFunction) {
      const den = (blockParams.den as number[]) ?? [1, 1];
      return Math.max(1, den.length - 1);
    }
    if (block.type === BlockType.StateSpace) {
      const A = (blockParams.A as number[]) ?? [0, 1, -1, -2];
      const n = Math.round(Math.sqrt(A.length));
      return Math.max(1, n);
    }
    if (block.type === BlockType.DiscreteTransferFcn) {
      const den = (blockParams.den as number[]) ?? [1, -0.5];
      const num = (blockParams.num as number[]) ?? [1];
      return Math.max(den.length - 1, num.length - 1, 1);
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

  // Previous-step outputs for feedback edges (one-step delay)
  let prevOutputs: Map<string, number[]> = new Map();

  // Build feedback edge lookup: "targetId:targetPort" → is feedback?
  const feedbackEdgeLookup = new Set<string>();
  // Algebraic-loop feedback edges: these read from current-iteration outputs
  // (fixed-point iteration) instead of prevOutputs (one-step delay).
  const algebraicFeedbackLookup = new Set<string>();
  for (const e of validEdges) {
    if (feedbackEdges.has(e.id)) {
      feedbackEdgeLookup.add(`${e.target}:${e.targetPort}`);
    }
  }
  // Mark feedback edges that belong to algebraic loops
  for (const cycle of algebraicLoops) {
    const cycleSet = new Set(cycle);
    for (const e of validEdges) {
      if (feedbackEdges.has(e.id) && cycleSet.has(e.source) && cycleSet.has(e.target)) {
        algebraicFeedbackLookup.add(`${e.target}:${e.targetPort}`);
      }
    }
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
        const isFeedback = feedbackEdgeLookup.has(`${id}:${port}`);
        const isAlgebraic = algebraicFeedbackLookup.has(`${id}:${port}`);
        // Algebraic-loop feedback: read current-iteration output (fixed-point)
        // Dynamic-loop feedback: read previous-step output (one-step delay)
        const sourceOutputs = isFeedback
          ? (isAlgebraic
              ? (outputs.get(wire.source) ?? prevOutputs.get(wire.source) ?? [0])
              : (prevOutputs.get(wire.source) ?? [0]))
          : (outputs.get(wire.source) ?? []);
        inputValues.push(sourceOutputs[wire.sourcePort] ?? 0);
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

  // Track which blocks use absolute state updates (TransportDelay, Relay)
  const absoluteBlockIds = new Set<string>();
  for (const id of order) {
    const block = blocks.get(id)!;
    if (block.isDynamic && block.stateUpdateMode === 'absolute') {
      absoluteBlockIds.add(id);
    }
  }

  // Generate f(t, state) → state_dot
  // For absolute-mode blocks (TransportDelay, Relay), return zero derivatives.
  // Their state is updated by applyAbsoluteState() after the RK4 step.
  // Returning non-zero "derivatives" for absolute blocks corrupts intermediate
  // RK4 evaluations (k2, k3, k4 use state + dt/2*k1, etc.) which produce
  // wrong outputs that propagate to dependent blocks.
  const f = (t: number, state: number[]): number[] => {
    const outputs = new Map<string, number[]>();
    const stateDot = new Array(stateOffset).fill(0);

    for (const id of order) {
      const block = blocks.get(id)!;
      const blockParams = mergedParams.get(id)!;
      const blockState = getBlockState(id, state);
      const inputValues = gatherInputs(id, outputs);

      const [output, newStateOrDot] = block.compute(dt, inputValues, blockState, blockParams, t);
      outputs.set(id, output);

      if (block.isDynamic && !absoluteBlockIds.has(id)) {
        const offset = stateOffsets.get(id)!;
        for (let i = 0; i < newStateOrDot.length; i++) {
          stateDot[offset + i] = newStateOrDot[i];
        }
      }
      // Absolute-mode blocks: stateDot stays zero — state updated by applyAbsoluteState
    }

    return stateDot;
  };

  // getOutputs(t, state) — evaluates block outputs without computing state_dot
  // Used by solver to capture scope traces at each step
  const getOutputs = (t: number, state: number[]): Map<string, number[]> => {
    const outputs = new Map<string, number[]>();
    for (const id of order) {
      const block = blocks.get(id)!;
      const blockParams = mergedParams.get(id)!;
      const blockState = getBlockState(id, state);
      const inputValues = gatherInputs(id, outputs);
      const [output] = block.compute(dt, inputValues, blockState, blockParams, t);
      outputs.set(id, output);
    }
    return outputs;
  };

  // applyAbsoluteState(t, state) — for blocks with absolute state updates,
  // compute the new state directly (not via RK4 integration)
  const applyAbsoluteState = (t: number, state: number[]): void => {
    const allOutputs = getOutputs(t, state);
    // Standard absolute-mode blocks (TransportDelay, Relay)
    for (const id of order) {
      if (!absoluteBlockIds.has(id)) continue;
      const block = blocks.get(id)!;
      const blockParams = mergedParams.get(id)!;
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

  // Update prevOutputs — called by solver after each completed step
  const updatePrevOutputs = (t: number, state: number[]): void => {
    prevOutputs = getOutputs(t, state);
  };

  // algebraicLoopSolver — iterates algebraic loop outputs to a fixed point.
  // Called by the solver before each step so that algebraic-loop feedback
  // edges see converged current-step values instead of one-step-delayed ones.
  // Gauss-Seidel: each getOutputs call walks the block order; algebraic
  // feedback edges read current-iteration outputs, so repeated calls converge.
  const algebraicLoopSolver = algebraicLoops.length > 0
    ? (t: number, state: number[]): void => {
        const maxIter = 50;
        const tol = 1e-9;
        let prev = getOutputs(t, state);
        for (let iter = 0; iter < maxIter; iter++) {
          // Update prevOutputs so the next getOutputs call reads this iteration's outputs
          prevOutputs = prev;
          const next = getOutputs(t, state);
          let maxDiff = 0;
          for (const [id, vals] of next) {
            const pv = prev.get(id) ?? [];
            for (let i = 0; i < vals.length; i++) {
              maxDiff = Math.max(maxDiff, Math.abs((vals[i] ?? 0) - (pv[i] ?? 0)));
            }
          }
          prev = next;
          if (maxDiff < tol) break;
        }
        prevOutputs = prev;
      }
    : undefined;

  // Map scope block IDs to their input wires (source + sourcePort)
  const scopeInputs = new Map<string, { source: string; sourcePort: number }[]>();
  for (const id of scopeBlockIds) {
    scopeInputs.set(id, (inputsFrom.get(id) ?? []).map((w) => ({ source: w.source, sourcePort: w.sourcePort })));
  }

  // Collect crossing events from blocks that declare crossingSign
  const events: CrossingEvent[] = [];
  for (const id of order) {
    const block = blocks.get(id)!;
    if (block.crossingSign) {
      const blockParams = mergedParams.get(id)!;
      // Capture current inputs at event registration time — the sign function
      // is a closure over the inputs snapshot. The solver re-evaluates it
      // at each step with interpolated state. For block-level crossing signs
      // that depend on inputs (not state), we pass the last-known inputs.
      // The compiler provides a function that evaluates inputs at (t, state)
      // via getOutputs.
      events.push({
        id,
        sign: (t: number, state: number[]) => {
          const outputs = getOutputs(t, state);
          const inputs = gatherInputs(id, outputs);
          const fn = block.crossingSign!(inputs, blockParams);
          return fn(t, state);
        },
      });
    }
  }

  // Collect periodic sample-time events for discrete blocks that declare a
  // sampleTime > 0 (ZOH semantics). Their zero-crossings sit exactly on the
  // sample boundaries so the adaptive solver records them (and caps its step
  // at dt), mirroring how Relay/Saturation register discontinuity events.
  const SAMPLE_BLOCK_TYPES = new Set([
    BlockType.UnitDelay,
    BlockType.DiscreteIntegrator,
    BlockType.DiscreteTransferFcn,
    BlockType.Memory,
  ]);
  for (const id of order) {
    const block = blocks.get(id)!;
    if (!SAMPLE_BLOCK_TYPES.has(block.type)) continue;
    const blockParams = mergedParams.get(id)!;
    const Ts = blockParams.sampleTime as number | undefined;
    if (typeof Ts === 'number' && Ts > 0) {
      events.push({
        id,
        // sin(pi t/Ts) changes sign exactly at t = k*Ts (sample boundaries)
        sign: (t: number) => Math.sin((Math.PI * t) / Ts),
      });
    }
  }

  return {
    stateSize: stateOffset,
    f,
    getOutputs,
    updatePrevOutputs,
    absoluteBlockIds,
    applyAbsoluteState,
    outputMap: new Map(),
    scopeBlockIds,
    scopeInputs,
    workspaceBlockIds,
    blockOrder: order,
    events,
    algebraicLoops,
    dynamicLoops,
    algebraicLoopSolver,
  };
}