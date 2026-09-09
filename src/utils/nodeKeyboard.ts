import { useDiagramStore } from '../store/diagramStore';

/** True when the keydown target is a text-entry control (ParameterPanel etc.). */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Feature H R-H2 — keyboard shortcut: F flips the selected block.
 * Returns true when the event was handled. Guarded against:
 * ctrl/meta/alt chords (Feature F owns those), editable targets (typing), no
 * selection, and Comment nodes (they expose no ports to mirror).
 */
export function flipOnKeydown(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (e.key !== 'f' && e.key !== 'F') return false;
  if (isEditableTarget(e.target)) return false;
  const { nodes, selectedBlockId, flipNode } = useDiagramStore.getState();
  if (!selectedBlockId) return false;
  const node = nodes.find((n) => n.id === selectedBlockId);
  if (!node) return false;
  if ((node.data as { type?: string })?.type === 'Comment') return false;
  e.preventDefault();
  flipNode(node.id);
  return true;
}
