import { useEffect, useRef } from 'react';

export interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  nodeType: string;
  onFlip: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeContextMenu({ x, y, nodeId, nodeType, onFlip, onClose }: NodeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on Escape or on a mousedown outside the menu (App.tsx menu pattern).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [onClose]);

  const flipable = nodeType !== 'Comment';

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded shadow-lg py-1 min-w-[140px]"
      style={{ left: x, top: y }}
    >
      {flipable && (
        <button
          role="menuitem"
          onClick={() => {
            onFlip(nodeId);
            onClose();
          }}
          className="block w-full text-left px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
        >
          Flip ⇄
        </button>
      )}
    </div>
  );
}
