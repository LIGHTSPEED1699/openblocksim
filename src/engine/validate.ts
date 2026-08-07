import { SerializedGraph } from './types';
import { BlockRegistry } from '../blocks/registry';
import { Block } from '../blocks/types';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

enum Color { White, Gray, Black }

export function validateGraph(graph: SerializedGraph, registry: BlockRegistry): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build adjacency list and instantiate blocks
  const adj = new Map<string, string[]>();
  const blocks = new Map<string, Block>();
  for (const b of graph.blocks) {
    adj.set(b.id, []);
    blocks.set(b.id, registry.create(b.type, b.params));
  }
  for (const e of graph.edges) {
    adj.get(e.source)?.push(e.target);
  }

  // Check for disconnected (unwired) input ports
  const wiredInputs = new Set<string>();
  for (const e of graph.edges) {
    wiredInputs.add(`${e.target}:${e.targetPort}`);
  }
  for (const b of graph.blocks) {
    const block = blocks.get(b.id)!;
    for (let port = 0; port < block.inputs; port++) {
      if (!wiredInputs.has(`${b.id}:${port}`)) {
        warnings.push(`Block ${b.id} (${block.type}) has unwired input port ${port}`);
      }
    }
  }

  // Algebraic loop detection via DFS with white/gray/black coloring
  const color = new Map<string, Color>();
  for (const b of graph.blocks) color.set(b.id, Color.White);

  const path: string[] = [];

  function dfs(nodeId: string): boolean {
    color.set(nodeId, Color.Gray);
    path.push(nodeId);

    for (const neighbor of adj.get(nodeId) ?? []) {
      if (color.get(neighbor) === Color.Gray) {
        // Found a back edge → cycle detected
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        // A cycle is an algebraic loop only if no block in it is dynamic
        // (integrator, transport delay, etc. break algebraic dependencies)
        const hasDynamic = cycle.some((id) => blocks.get(id)?.isDynamic);
        if (!hasDynamic) {
          errors.push(
            `Algebraic loop detected: ${cycle.join(' → ')} → ${neighbor}. Insert an Integrator or Transport Delay to break the loop.`,
          );
          return false;
        }
      } else if (color.get(neighbor) === Color.White) {
        if (!dfs(neighbor)) return false;
      }
    }

    path.pop();
    color.set(nodeId, Color.Black);
    return true;
  }

  for (const b of graph.blocks) {
    if (color.get(b.id) === Color.White) {
      if (!dfs(b.id)) break;
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}