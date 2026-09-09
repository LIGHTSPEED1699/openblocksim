import type { SerializedGraph, SerializedBlock, SerializedEdge } from './types';
import type { Params } from '../blocks/types';

export const SUBSYSTEM_TYPE = 'Subsystem';
export const INPORT_TYPE = 'Inport';
export const OUTPORT_TYPE = 'Outport';
const FORBIDDEN_INNER = new Set(['Scope', 'ToWorkspace', 'StopSimulation']);

/** Parse params.subsystem (a JSON string) into a SerializedGraph. */
export function parseInnerGraph(params: Params): SerializedGraph {
  const raw = params.subsystem;
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error('Subsystem block has no inner diagram (params.subsystem missing)');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Subsystem block has invalid inner diagram JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  const graph = parsed as SerializedGraph;
  if (!graph || !Array.isArray(graph.blocks) || !Array.isArray(graph.edges)) {
    throw new Error('Subsystem inner diagram must be a SerializedGraph { blocks, edges }');
  }
  return graph;
}

/** Input/output counts = 1 + max Inport/Outport port param (0 when none). */
export function subsystemPortCounts(inner: SerializedGraph): { inputs: number; outputs: number } {
  let inputs = 0;
  let outputs = 0;
  for (const blk of inner.blocks) {
    const port = typeof blk.params.port === 'number' ? (blk.params.port as number) : -1;
    if (String(blk.type) === INPORT_TYPE) inputs = Math.max(inputs, port + 1);
    else if (String(blk.type) === OUTPORT_TYPE) outputs = Math.max(outputs, port + 1);
  }
  return { inputs, outputs };
}

type PortRef = { id: string; port: number };
type Expansion = {
  subsystemId: string;
  prefix: string;
  innerBlocks: SerializedBlock[];      // non-port inner blocks, ids prefixed
  innerEdges: SerializedEdge[];        // inner edges not touching any port, endpoints prefixed
  inputTargets: Map<number, PortRef[]>; // subsystem input port k → inner consumer(s)
  outputSources: Map<number, PortRef[]>; // subsystem output port m → inner producer(s)
  declaredInputs: Set<number>;         // Inport params.port values present in the inner diagram
  declaredOutputs: Set<number>;        // Outport params.port values present in the inner diagram
  singleOrdinary: string | null;       // sole non-port inner block id (prefixed), else null
};

/** One-port helper (params.port number, else index within its own port list). */
function portIndexOf(blk: SerializedBlock, siblings: SerializedBlock[]): number {
  return typeof blk.params.port === 'number' ? (blk.params.port as number) : siblings.indexOf(blk);
}

function pushRef(map: Map<number, PortRef[]>, k: number, ref: PortRef): void {
  const list = map.get(k) ?? [];
  list.push(ref);
  map.set(k, list);
}

/** Expand one subsystem (its inner graph already recursively flattened). */
function expandSubsystem(id: string, inner: SerializedGraph): Expansion {
  const prefix = `${id}::`;
  const rename = (x: string) => prefix + x;
  const inports = inner.blocks.filter((x) => String(x.type) === INPORT_TYPE);
  const outports = inner.blocks.filter((x) => String(x.type) === OUTPORT_TYPE);
  const inIds = new Set(inports.map((x) => x.id));
  const outIds = new Set(outports.map((x) => x.id));

  const inputTargets = new Map<number, PortRef[]>();
  const outputSources = new Map<number, PortRef[]>();
  for (const e of inner.edges) {
    if (inIds.has(e.source)) {
      const src = inports.find((x) => x.id === e.source)!;
      pushRef(inputTargets, portIndexOf(src, inports), { id: rename(e.target), port: e.targetPort });
    } else if (outIds.has(e.target)) {
      const dst = outports.find((x) => x.id === e.target)!;
      pushRef(outputSources, portIndexOf(dst, outports), { id: rename(e.source), port: e.sourcePort });
    }
  }

  const innerBlocks: SerializedBlock[] = [];
  for (const blk of inner.blocks) {
    if (inIds.has(blk.id) || outIds.has(blk.id)) continue;
    innerBlocks.push({ ...blk, id: rename(blk.id) });
  }
  const innerEdges: SerializedEdge[] = [];
  for (const e of inner.edges) {
    if (inIds.has(e.source) || outIds.has(e.target) || outIds.has(e.source) || inIds.has(e.target)) continue;
    innerEdges.push({ ...e, id: e.id, source: rename(e.source), target: rename(e.target) });
  }

  const declaredInputs = new Set<number>();
  const declaredOutputs = new Set<number>();
  for (const blk of inner.blocks) {
    const port = typeof blk.params.port === 'number' ? (blk.params.port as number) : -1;
    if (String(blk.type) === INPORT_TYPE && port >= 0) declaredInputs.add(port);
    else if (String(blk.type) === OUTPORT_TYPE && port >= 0) declaredOutputs.add(port);
  }
  // ponytail: port-less single-block inners (not authorable via the editor —
  // Inport/Outport are always created there) route interface port k straight
  // to the one inner block's port k. This is what lets a nested Subsystem sit
  // directly on an enclosing Inport/Outport wire (G2-T1 nested test); multi-block
  // port-less inners are unrepresentable and stay a flatten error.
  const ordinary = innerBlocks.filter((x) => String(x.type) !== INPORT_TYPE && String(x.type) !== OUTPORT_TYPE);
  const singleOrdinary = ordinary.length === 1 ? ordinary[0].id : null;

  return { subsystemId: id, prefix, innerBlocks, innerEdges, inputTargets, outputSources, declaredInputs, declaredOutputs, singleOrdinary };
}

export function flattenGraph(graph: SerializedGraph): SerializedGraph {
  const subsystemBlocks = graph.blocks.filter((x) => String(x.type) === SUBSYSTEM_TYPE);
  if (subsystemBlocks.length === 0) {
    return { blocks: [...graph.blocks], edges: [...graph.edges] };
  }

  const used = new Set<string>(graph.blocks.map((x) => x.id));
  for (const e of graph.edges) used.add(e.id);
  const claimId = (base: string): string => {
    if (!used.has(base)) {
      used.add(base);
      return base;
    }
    let i = 1;
    let cand = `${base}#${i}`;
    while (used.has(cand)) cand = `${base}#${++i}`;
    used.add(cand);
    return cand;
  };

  const expansions = subsystemBlocks.map((sub) => {
    const inner = parseInnerGraph(sub.params);
    for (const blk of inner.blocks) {
      if (FORBIDDEN_INNER.has(String(blk.type))) {
        throw new Error(`Subsystem "${sub.id}" contains a ${String(blk.type)} block — route the signal to an Outport and scope it at the top level instead`);
      }
    }
    // recursively flatten (nested subsystems) before splicing
    const flat = flattenGraph(inner);
    return expandSubsystem(sub.id, flat);
  });
  const expansionById = new Map(expansions.map((x) => [x.subsystemId, x]));

  // Check prefix collisions before mutating the used-set further. (Inner
  // edge ids are NOT claimed here — they are claimed exactly once at push time
  // below so that a subsystem-internal edge whose id happens to equal an outer
  // edge id (or a splice id) is renamed instead of duplicated.)
  for (const ex of expansions) {
    for (const blk of ex.innerBlocks) {
      if (used.has(blk.id)) throw new Error(`Subsystem "${ex.subsystemId}" inner block id "${blk.id}" collides with an existing block id`);
    }
  }

  const blocksOut = graph.blocks.filter((x) => String(x.type) !== SUBSYSTEM_TYPE);
  for (const ex of expansions) blocksOut.push(...ex.innerBlocks);

  const edgesOut: SerializedEdge[] = [];
  for (const e of graph.edges) {
    const srcSub = expansionById.get(e.source);
    const dstSub = expansionById.get(e.target);
    if (dstSub) {
      let consumers = dstSub.inputTargets.get(e.targetPort);
      if (!consumers || consumers.length === 0) {
        if (dstSub.declaredInputs.has(e.targetPort) || !dstSub.singleOrdinary) {
          throw new Error(`Subsystem "${dstSub.subsystemId}" input port ${e.targetPort} has a parent wire but nothing consumes it inside`);
        }
        consumers = [{ id: dstSub.singleOrdinary, port: e.targetPort }];
      }
      consumers.forEach((c, idx) => {
        edgesOut.push({ ...e, id: idx === 0 ? e.id : claimId(`${e.id}#${idx}`), target: c.id, targetPort: c.port });
      });
    } else if (srcSub) {
      let producers = srcSub.outputSources.get(e.sourcePort);
      if (!producers || producers.length === 0) {
        if (srcSub.declaredOutputs.has(e.sourcePort) || !srcSub.singleOrdinary) {
          throw new Error(`Subsystem "${srcSub.subsystemId}" output port ${e.sourcePort} is wired but nothing produces it inside`);
        }
        producers = [{ id: srcSub.singleOrdinary, port: e.sourcePort }];
      }
      const p = producers[0];
      edgesOut.push({ ...e, source: p.id, sourcePort: p.port });
    } else {
      edgesOut.push(e);
    }
  }
  for (const ex of expansions) {
    for (const e of ex.innerEdges) edgesOut.push({ ...e, id: claimId(e.id) });
  }

  return { blocks: blocksOut, edges: edgesOut };
}
