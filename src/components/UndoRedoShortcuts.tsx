import { useEffect } from 'react';
import { useDiagramStore } from '../store/diagramStore';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

/**
 * App-wide undo/redo keyboard shortcuts (R-F2).
 * Renders nothing; binds one window keydown listener while mounted.
 * Ctrl/Cmd+Z → undo, Ctrl/Cmd+Y → redo, Ctrl/Cmd+Shift+Z → redo.
 * Ignored when the focus is inside an editable field so text inputs keep
 * their native Ctrl+Z behavior.
 */
export function UndoRedoShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.altKey) return;
      if (isEditableTarget(e.target)) return;
      const store = useDiagramStore.getState();
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.undo();
      } else if (key === 'z' && e.shiftKey) {
        e.preventDefault();
        store.redo();
      } else if (key === 'y') {
        e.preventDefault();
        store.redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return null;
}
