import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Worker solver routing', () => {
  let postMessageSpy: ReturnType<typeof vi.fn>;
  let onmessageHandler: (e: MessageEvent) => void;

  // Step → Integrator → Scope — simple dynamic graph that all solvers handle
  const graph = {
    blocks: [
      { id: 'step', type: 'Step' as const, params: { stepTime: 0, stepValue: 1 }, position: { x: 0, y: 0 } },
      { id: 'integ', type: 'Integrator' as const, params: {}, position: { x: 100, y: 0 } },
      { id: 'scope', type: 'Scope' as const, params: {}, position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'step', sourcePort: 0, target: 'integ', targetPort: 0 },
      { id: 'e2', source: 'integ', sourcePort: 0, target: 'scope', targetPort: 0 },
    ],
  };

  beforeEach(async () => {
    postMessageSpy = vi.fn();
    (globalThis as any).postMessage = postMessageSpy;
    await import('../../src/engine/worker');
    onmessageHandler = (self as any).onmessage;
  });

  it('routes solverType=bdf to solveBDF', async () => {
    const msg: MessageEvent = {
      data: { type: 'run', graph, dt: 0.01, duration: 0.1, solverType: 'bdf' },
    } as MessageEvent;

    onmessageHandler(msg);

    await vi.waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalled();
    }, { timeout: 5000 });

    const doneCall = postMessageSpy.mock.calls.find((c: any[]) => c[0].type === 'done');
    expect(doneCall).toBeDefined();
    expect(doneCall[0].results.actualSteps).toBeGreaterThan(0);
  });

  it('routes solverType=fixed to solve (no actualSteps field)', async () => {
    const msg: MessageEvent = {
      data: { type: 'run', graph, dt: 0.01, duration: 0.1, solverType: 'fixed' },
    } as MessageEvent;

    onmessageHandler(msg);

    await vi.waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalled();
    }, { timeout: 5000 });

    const doneCall = postMessageSpy.mock.calls.find((c: any[]) => c[0].type === 'done');
    expect(doneCall).toBeDefined();
    expect(doneCall[0].results.time.length).toBeGreaterThan(0);
  });

  it('routes solverType=adaptive to solveAdaptive', async () => {
    const msg: MessageEvent = {
      data: { type: 'run', graph, dt: 0.01, duration: 0.1, solverType: 'adaptive' },
    } as MessageEvent;

    onmessageHandler(msg);

    await vi.waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalled();
    }, { timeout: 5000 });

    const doneCall = postMessageSpy.mock.calls.find((c: any[]) => c[0].type === 'done');
    expect(doneCall).toBeDefined();
    expect(doneCall[0].results.actualSteps).toBeGreaterThan(0);
  });
});