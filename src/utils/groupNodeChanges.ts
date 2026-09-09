import type { NodeChange } from '@xyflow/react';

export type GroupMoveChange = { kind: 'move'; id: string; x: number; y: number };
export type GroupResizeChange = { kind: 'resize'; id: string; x?: number; y?: number; width?: number; height?: number };
export type GroupSelectChange = { kind: 'select'; id: string; selected: boolean };
export type GroupNodeChange = GroupMoveChange | GroupResizeChange | GroupSelectChange;

/**
 * Splits an onNodesChange batch (React Flow v12; shape verified against
 * @xyflow/system NodeChange union: 'position' | 'dimensions'(resizing?) |
 * 'select' | 'remove' | 'add' | 'replace') into:
 *  - nodeChanges: changes for ordinary user nodes — caller applies these with
 *    applyNodeChanges as today;
 *  - groupChanges: one gesture per group id per batch. A position change alone
 *    is a MOVE (drag the box: caller translates members). A position + a
 *    resizing dimensions change in the same batch is a RESIZE (NodeResizer on
 *    a left/top handle moves x/y AND changes size; members must NOT move). A
 *    dimensions(resizing:true)-only change is a RESIZE from right/bottom.
 *    Measurement dimension events (resizing undefined/false) and remove/add/
 *    replace on group nodes are dropped: group nodes are re-derived from the
 *    store on every render.
 */
export function partitionNodeChanges(
  changes: NodeChange[],
  isGroupNode: (id: string) => boolean,
): { nodeChanges: NodeChange[]; groupChanges: GroupNodeChange[] } {
  const nodeChanges: NodeChange[] = [];
  const positions = new Map<string, { x: number; y: number }>();
  const dimensions = new Map<string, { width: number; height: number }>();
  const selections: { id: string; selected: boolean }[] = [];

  for (const c of changes) {
    if (!isGroupNode(c.id)) {
      nodeChanges.push(c);
      continue;
    }
    if (c.type === 'position' && c.position) {
      positions.set(c.id, { x: c.position.x, y: c.position.y });
    } else if (
      c.type === 'dimensions' &&
      c.resizing === true &&
      c.dimensions?.width !== undefined &&
      c.dimensions.height !== undefined
    ) {
      dimensions.set(c.id, { width: c.dimensions.width, height: c.dimensions.height });
    } else if (c.type === 'select') {
      selections.push({ id: c.id, selected: c.selected });
    }
    // other change kinds on group nodes are intentionally ignored.
  }

  const groupChanges: GroupNodeChange[] = [];
  for (const [id, pos] of positions) {
    const dim = dimensions.get(id);
    groupChanges.push(
      dim
        ? { kind: 'resize', id, x: pos.x, y: pos.y, width: dim.width, height: dim.height }
        : { kind: 'move', id, x: pos.x, y: pos.y },
    );
  }
  for (const [id, dim] of dimensions) {
    if (!positions.has(id)) {
      groupChanges.push({ kind: 'resize', id, width: dim.width, height: dim.height });
    }
  }
  for (const sel of selections) {
    groupChanges.push({ kind: 'select', id: sel.id, selected: sel.selected });
  }
  return { nodeChanges, groupChanges };
}
