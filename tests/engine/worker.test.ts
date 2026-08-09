import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Worker message handler (integration wiring)', () => {
  let postMessageSpy: ReturnType<typeof vi.fn>;
  let onmessageHandler: (e: MessageEvent) => void;

  const validGraph = {
    blocks: [
      { id: 'Constant-1', type: 'Constant' as const, params: { value: 1 }, position: { x: 0, y: 0 } },
      { id: 'Scope-1', type: 'Scope' as const, params: {}, position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'Constant-1', sourcePort: 0, target: 'Scope-1', targetPort: 0 },
    ],
  };

  beforeEach(async () => {
    postMessageSpy = vi.fn();
    (globalThis as any).postMessage = postMessageSpy;

    await import('../../src/engine/worker');
    onmessageHandler = (self as any).onmessage;
  });

  it('dispatches done message for a valid graph', async () => {
    const msg: MessageEvent = {
      data: { type: 'run', graph: validGraph, dt: 0.01, duration: 0.1 },
    } as MessageEvent;

    onmessageHandler(msg);

    await vi.waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalled();
    }, { timeout: 5000 });

    const call = postMessageSpy.mock.calls.find(
      (c: any[]) => c[0].type === 'done'
    );
    expect(call).toBeDefined();
    expect(call[0].results).toBeDefined();
    expect(call[0].results.time).toBeInstanceOf(Array);
    expect(call[0].results.scopes).toBeDefined();
  });

  it('ignores non-run messages', async () => {
    const msg: MessageEvent = {
      data: { type: 'cancel' },
    } as MessageEvent;

    onmessageHandler(msg);

    await new Promise(r => setTimeout(r, 100));
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it('dispatches error for invalid graph (algebraic loop)', async () => {
    const invalidGraph = {
      blocks: [
        { id: 'Gain-1', type: 'Gain' as const, params: { gain: 1 }, position: { x: 0, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'Gain-1', sourcePort: 0, target: 'Gain-1', targetPort: 0 },
      ],
    };

    const msg: MessageEvent = {
      data: { type: 'run', graph: invalidGraph, dt: 0.01, duration: 0.1 },
    } as MessageEvent;

    onmessageHandler(msg);

    await vi.waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalled();
    }, { timeout: 5000 });

    const errorCall = postMessageSpy.mock.calls.find(
      (c: any[]) => c[0].type === 'error'
    );
    expect(errorCall).toBeDefined();
    expect(typeof errorCall[0].message).toBe('string');
  });

  it('dispatches error when graph has algebraic loop (two non-dynamic blocks)', async () => {
    const badGraph = {
      blocks: [
        { id: 'Gain-1', type: 'Gain' as const, params: { gain: 1 }, position: { x: 0, y: 0 } },
        { id: 'Gain-2', type: 'Gain' as const, params: { gain: 2 }, position: { x: 100, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'Gain-1', sourcePort: 0, target: 'Gain-2', targetPort: 0 },
        { id: 'e2', source: 'Gain-2', sourcePort: 0, target: 'Gain-1', targetPort: 0 },
      ],
    };

    const msg: MessageEvent = {
      data: { type: 'run', graph: badGraph, dt: 0.01, duration: 0.1 },
    } as MessageEvent;

    onmessageHandler(msg);

    await vi.waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalled();
    }, { timeout: 5000 });

    const errorCall = postMessageSpy.mock.calls.find(
      (c: any[]) => c[0].type === 'error'
    );
    expect(errorCall).toBeDefined();
  });

  it('result has correct structure: time array and scopes map', async () => {
    const msg: MessageEvent = {
      data: { type: 'run', graph: validGraph, dt: 0.01, duration: 0.1 },
    } as MessageEvent;

    onmessageHandler(msg);

    await vi.waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalled();
    }, { timeout: 5000 });

    const doneCall = postMessageSpy.mock.calls.find(
      (c: any[]) => c[0].type === 'done'
    );
    expect(doneCall).toBeDefined();
    const results = doneCall[0].results;
    expect(results.time.length).toBeGreaterThan(0);
    expect(results.time[0]).toBe(0);
    expect(results.scopes['Scope-1']).toBeDefined();
    expect(results.scopes['Scope-1'].length).toBe(results.time.length);
  });
});
