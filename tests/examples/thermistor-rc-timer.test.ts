import { describe, it, expect } from 'vitest';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { Constant } from '../../src/blocks/sources/Constant';
import { Scope } from '../../src/blocks/sinks/Scope';
import { TransferFunction } from '../../src/blocks/linear/TransferFunction';
import { Relay } from '../../src/blocks/control/Relay';
import { Switch } from '../../src/blocks/routing/Switch';
import { Comment } from '../../src/blocks/annotation/Comment';
import { compileGraph } from '../../src/engine/compiler';
import { solve } from '../../src/engine/solver';
import { validateGraph } from '../../src/engine/validate';
import { EXAMPLES, Example } from '../../src/examples';

function createRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  const regs: Array<[BlockType, any]> = [
    [BlockType.Constant, Constant],
    [BlockType.Scope, Scope],
    [BlockType.TransferFunction, TransferFunction],
    [BlockType.Relay, Relay],
    [BlockType.Switch, Switch],
    [BlockType.Comment, Comment],
  ];
  for (const [t, f] of regs) r.register(t, f);
  return r;
}

function buildGraph(model: Example['model']): import('../../src/engine/types').SerializedGraph {
  return {
    blocks: model.blocks.map((b) => ({ id: b.id, type: b.type, params: b.params, position: b.position })),
    edges: model.edges.map((e) => ({
      id: e.id, source: e.source, sourcePort: e.sourcePort,
      target: e.target, targetPort: e.targetPort,
    })),
  };
}

describe('Thermistor RC charge/discharge example', () => {
  const example = EXAMPLES.find((e) => e.id === 'thermistor-rc-timer');
  const registry = createRegistry();

  // Model constants.
  const V_S = 24, V_L1 = 12, tau = 2.0;

  it('is registered in the gallery', () => {
    expect(example).toBeDefined();
  });

  it('validates and solves without error', () => {
    expect(example).toBeDefined();
    const ex = example!;
    const graph = buildGraph(ex.model);
    const validation = validateGraph(graph, registry);
    expect(validation.valid, validation.errors.join('; ')).toBe(true);

    const compiled = compileGraph(graph, registry, ex.model.simConfig.dt);
    const state = new Array(compiled.stateSize).fill(0);
    const result = solve(compiled, ex.model.simConfig, state);

    const vTrace = result.scopes['scope_v'];
    expect(vTrace).toBeDefined();
    expect(vTrace!.length).toBeGreaterThan(0);
  });

  it('charges V_C to V_L1=12V at t_L ≈ τ·ln(2) ≈ 1.39s on first cycle', () => {
    expect(example).toBeDefined();
    const ex = example!;
    const graph = buildGraph(ex.model);
    const compiled = compileGraph(graph, registry, ex.model.simConfig.dt);
    const state = new Array(compiled.stateSize).fill(0);
    const result = solve(compiled, ex.model.simConfig, state);

    const vTrace = result.scopes['scope_v']!;
    const relayTrace = result.scopes['scope_r'];

    // First threshold crossing: V_C reaches 12 V.
    const idx = vTrace.findIndex((v) => v >= V_L1);
    expect(idx).toBeGreaterThan(-1);
    const simTL = result.time[idx];
    const anaTL = tau * Math.log(V_S / (V_S - V_L1)); // 2*ln(2) ≈ 1.386
    expect(Math.abs(simTL - anaTL) / anaTL).toBeLessThan(0.02);

    // Relay should fire (output 1) after V_C crosses 12 V.
    if (relayTrace) {
      const relayIdx = relayTrace.findIndex((v) => v >= 0.5);
      expect(relayIdx).toBeGreaterThan(-1);
    }
  });

  it('discharges V_C back below switchOff after relay fires (charge/discharge cycle)', () => {
    expect(example).toBeDefined();
    const ex = example!;
    const graph = buildGraph(ex.model);
    const compiled = compileGraph(graph, registry, ex.model.simConfig.dt);
    const state = new Array(compiled.stateSize).fill(0);
    const result = solve(compiled, ex.model.simConfig, state);

    const vTrace = result.scopes['scope_v']!;

    // V_C must rise above 12V (charge), then fall below 12V (discharge).
    const firstCross = vTrace.findIndex((v) => v >= V_L1);
    expect(firstCross).toBeGreaterThan(-1);

    // After firstCross, look for V_C dropping below switchOff=1V (discharge complete).
    let foundDischarge = false;
    for (let i = firstCross + 1; i < vTrace.length; i++) {
      if (vTrace[i] < 1.0) {
        foundDischarge = true;
        break;
      }
    }
    expect(foundDischarge).toBe(true);

    // And then V_C must rise again (second charge cycle begins).
    const dischargeIdx = vTrace.findIndex((v, i) => i > firstCross && v < 1.0);
    if (dischargeIdx > -1) {
      const secondCharge = vTrace.findIndex((v, i) => i > dischargeIdx && v > 1.0);
      expect(secondCharge).toBeGreaterThan(-1);
    }
  });

  it('uses a TransferFunction block for the RC plant (not ODE integrator)', () => {
    expect(example).toBeDefined();
    const ex = example!;
    const types = ex.model.blocks.map((b) => b.type as string);
    expect(types).toContain('TransferFunction');
    // The old ODE chain is gone — no Sum, Product, Integrator, Divide, MathFunction.
    expect(types).not.toContain('Integrator');
    expect(types).not.toContain('Sum');
    expect(types).not.toContain('Product');
    expect(types).not.toContain('Divide');
    expect(types).not.toContain('MathFunction');
  });

  it('has a Switch + Relay feedback loop for charge/discharge routing', () => {
    expect(example).toBeDefined();
    const ex = example!;
    const types = ex.model.blocks.map((b) => b.type as string);
    expect(types).toContain('Switch');
    expect(types).toContain('Relay');

    // Verify the feedback loop: TF output → Relay → Switch control input.
    // TF → Relay edge exists.
    const tfToRelay = ex.model.edges.find(
      (e) => e.source === 'tf' && e.target === 'relay'
    );
    expect(tfToRelay).toBeDefined();

    // Relay → Switch control (port 1) edge exists.
    const relayToSw = ex.model.edges.find(
      (e) => e.source === 'relay' && e.target === 'sw' && e.targetPort === 1
    );
    expect(relayToSw).toBeDefined();

    // Switch → TF edge exists.
    const swToTf = ex.model.edges.find(
      (e) => e.source === 'sw' && e.target === 'tf'
    );
    expect(swToTf).toBeDefined();
  });

  it('annotates blocks with comments mapping them to circuit elements', () => {
    expect(example).toBeDefined();
    const ex = example!;
    const comments = ex.model.blocks.filter(
      (b) => (b.type as string) === 'Comment'
    ) as unknown as Array<{ id: string; params: { text?: string }; position: { x: number; y: number } }>;
    expect(comments.length).toBeGreaterThanOrEqual(5);
    const texts = comments.map((c) => (c.params.text ?? '').toLowerCase()).join('\n');
    expect(texts).toContain('out1');
    expect(texts).toContain('out2');
    expect(texts).toContain('g(s)');
    expect(texts).toContain('relay');
    expect(texts).toContain('switch');
    // Every comment has a position.
    for (const c of comments) {
      expect(typeof c.position.x).toBe('number');
    }
  });
});