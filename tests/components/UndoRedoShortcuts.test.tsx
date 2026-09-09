import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { UndoRedoShortcuts } from '../../src/components/UndoRedoShortcuts';
import { useDiagramStore } from '../../src/store/diagramStore';

function renderWithInput() {
  render(
    <>
      <UndoRedoShortcuts />
      <input aria-label="field" />
    </>
  );
  return screen.getByLabelText('field') as HTMLInputElement;
}

describe('UndoRedoShortcuts', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
  });

  it('Ctrl+Z undoes and Ctrl+Y / Ctrl+Shift+Z redo', () => {
    render(<UndoRedoShortcuts />);
    const store = useDiagramStore.getState();
    store.setNodes([{ id: 'a', type: 'Source', position: { x: 0, y: 0 }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } }]);
    expect(useDiagramStore.getState().nodes).toHaveLength(1);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(useDiagramStore.getState().nodes).toHaveLength(0);

    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(useDiagramStore.getState().nodes).toHaveLength(1);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(useDiagramStore.getState().nodes).toHaveLength(0);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(useDiagramStore.getState().nodes).toHaveLength(1);
  });

  it('Ctrl+Z is ignored while typing in an editable element (native text undo)', () => {
    const input = renderWithInput();
    const store = useDiagramStore.getState();
    store.setNodes([{ id: 'a', type: 'Source', position: { x: 0, y: 0 }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } }]);
    input.focus();
    fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
    expect(useDiagramStore.getState().nodes).toHaveLength(1); // untouched
  });

  it('plain z (no modifier) does nothing', () => {
    render(<UndoRedoShortcuts />);
    const store = useDiagramStore.getState();
    store.setNodes([{ id: 'a', type: 'Source', position: { x: 0, y: 0 }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } }]);
    fireEvent.keyDown(window, { key: 'z' });
    expect(useDiagramStore.getState().nodes).toHaveLength(1);
  });

  it('supports Cmd (metaKey) as the modifier on macOS-style keyboards', () => {
    render(<UndoRedoShortcuts />);
    const store = useDiagramStore.getState();
    store.setNodes([{ id: 'a', type: 'Source', position: { x: 0, y: 0 }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } }]);
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(useDiagramStore.getState().nodes).toHaveLength(0);
  });

  it('removes the listener on unmount', () => {
    const { unmount } = render(<UndoRedoShortcuts />);
    unmount();
    const store = useDiagramStore.getState();
    store.setNodes([{ id: 'a', type: 'Source', position: { x: 0, y: 0 }, data: { type: 'Constant', inputs: 0, outputs: 1, color: '' } }]);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(useDiagramStore.getState().nodes).toHaveLength(1);
  });
});
