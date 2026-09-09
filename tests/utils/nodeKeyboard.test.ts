import { describe, it, expect, beforeEach } from 'vitest';
import { flipOnKeydown, isEditableTarget } from '../../src/utils/nodeKeyboard';
import { useDiagramStore } from '../../src/store/diagramStore';

function seedSelectedGain() {
  useDiagramStore.getState().setNodes([
    { id: 'g1', type: 'Math', position: { x: 0, y: 0 }, data: { type: 'Gain', inputs: 1, outputs: 1, color: '' } },
  ]);
  useDiagramStore.getState().selectBlock('g1');
}

describe('flipOnKeydown', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
  });

  it('flips the selected node on f', () => {
    seedSelectedGain();
    const e = new KeyboardEvent('keydown', { key: 'f' });
    expect(flipOnKeydown(e)).toBe(true);
    expect((useDiagramStore.getState().nodes[0].data as any).flipped).toBe(true);
  });

  it('toggles on repeated f presses', () => {
    seedSelectedGain();
    flipOnKeydown(new KeyboardEvent('keydown', { key: 'f' }));
    flipOnKeydown(new KeyboardEvent('keydown', { key: 'f' }));
    expect((useDiagramStore.getState().nodes[0].data as any).flipped).toBe(false);
  });

  it('ignores other keys', () => {
    seedSelectedGain();
    expect(flipOnKeydown(new KeyboardEvent('keydown', { key: 'x' }))).toBe(false);
  });

  it('ignores ctrl/meta-modified keys (no collision with undo shortcuts)', () => {
    seedSelectedGain();
    expect(flipOnKeydown(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true }))).toBe(false);
    expect(flipOnKeydown(new KeyboardEvent('keydown', { key: 'f', metaKey: true }))).toBe(false);
  });

  it('ignores keystrokes while typing in an input', () => {
    seedSelectedGain();
    const input = document.createElement('input');
    const e = new KeyboardEvent('keydown', { key: 'f', bubbles: true });
    input.dispatchEvent(e);
    expect(isEditableTarget(e.target)).toBe(true);
    expect(flipOnKeydown(e)).toBe(false);
  });

  it('does nothing with no selection', () => {
    useDiagramStore.getState().setNodes([
      { id: 'g1', type: 'Math', position: { x: 0, y: 0 }, data: { type: 'Gain', inputs: 1, outputs: 1, color: '' } },
    ]);
    expect(flipOnKeydown(new KeyboardEvent('keydown', { key: 'f' }))).toBe(false);
  });

  it('does not flip Comment nodes (no ports)', () => {
    useDiagramStore.getState().setNodes([
      { id: 'c1', type: 'Annotation', position: { x: 0, y: 0 }, data: { type: 'Comment', inputs: 0, outputs: 0, color: '' } },
    ]);
    useDiagramStore.getState().selectBlock('c1');
    expect(flipOnKeydown(new KeyboardEvent('keydown', { key: 'f' }))).toBe(false);
  });
});
