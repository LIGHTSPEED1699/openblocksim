import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ConnectionPreview } from '../../src/components/ConnectionPreview';
import { wireGesture } from '../../src/components/edges/wireGesture';
import React from 'react';

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<any>('@xyflow/react');
  return {
    ...actual,
    useReactFlow: () => ({
      getNode: vi.fn((id: string) => {
        if (id === 'src-1') return {
          position: { x: 300, y: 100 },
          measured: { width: 120, height: 60 },
          data: { outputs: 1 },
        };
        if (id === 'tgt-1') return {
          position: { x: 100, y: 200 },
          measured: { width: 120, height: 60 },
          data: { inputs: 1 },
        };
        return undefined;
      }),
    }),
  };
});

describe('ConnectionPreview', () => {
  beforeEach(() => {
    wireGesture.reset();
  });

  it('renders nothing when inactive', () => {
    const { container } = render(React.createElement(ConnectionPreview, {} as any));
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when source node is not found', () => {
    wireGesture.set({ active: true, source: { nodeId: 'missing', handleId: 'out-0' }, cursor: { x: 500, y: 100 } });
    const { container } = render(React.createElement(ConnectionPreview, {} as any));
    expect(container.innerHTML).toBe('');
  });

  it('renders a straight line + arrow with no planted vertices', () => {
    wireGesture.set({ active: true, source: { nodeId: 'src-1', handleId: 'out-0' }, cursor: { x: 500, y: 100 } });
    const { container } = render(React.createElement(ConnectionPreview, {} as any));
    const path = container.querySelector('path[marker-end]');
    expect(path).toBeTruthy();
    expect(path!.getAttribute('d')).toMatch(/^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/);
    expect(path!.getAttribute('marker-end')).toContain('conn-preview-arrow');
    expect(path!.getAttribute('d')).not.toMatch(/[CSQTA]/);
  });

  it('renders orthogonal polyline through planted vertices', () => {
    wireGesture.set({
      active: true,
      source: { nodeId: 'src-1', handleId: 'out-0' },
      planted: [{ x: 450, y: 100 }, { x: 450, y: 200 }],
      cursor: { x: 200, y: 200 },
    });
    const { container } = render(React.createElement(ConnectionPreview, {} as any));
    const path = container.querySelector('path[marker-end]');
    const d = path!.getAttribute('d')!;
    expect(d).toContain('450');
  });

  it('renders arrow marker defs', () => {
    wireGesture.set({ active: true, source: { nodeId: 'src-1', handleId: 'out-0' }, cursor: { x: 500, y: 100 } });
    const { container } = render(React.createElement(ConnectionPreview, {} as any));
    const marker = container.querySelector('#conn-preview-arrow');
    expect(marker).toBeTruthy();
  });
});