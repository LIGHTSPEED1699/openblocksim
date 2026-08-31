import { describe, it, expect } from 'vitest';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { Constant } from '../../src/blocks/sources/Constant';
import { Step } from '../../src/blocks/sources/Step';
import { Scope } from '../../src/blocks/sinks/Scope';
import { ToWorkspace } from '../../src/blocks/sinks/ToWorkspace';
import { Sum } from '../../src/blocks/math/Sum';
import { Gain } from '../../src/blocks/math/Gain';
import { Product } from '../../src/blocks/math/Product';
import { Divide } from '../../src/blocks/math/Divide';
import { MathFunction } from '../../src/blocks/math/MathFunction';
import { Integrator } from '../../src/blocks/linear/Integrator';
import { TransferFunction } from '../../src/blocks/linear/TransferFunction';
import { Relay } from '../../src/blocks/control/Relay';
import { Comment } from '../../src/blocks/annotation/Comment';
import { compileGraph } from '../../src/engine/compiler';
import { solve } from '../../src/engine/solver';
import { validateGraph } from '../../src/engine/validate';
import { EXAMPLES, Example } from '../../src/examples';

function createRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  const regs: Array<[BlockType, any]> = [
    [BlockType.Constant, Constant],
    [BlockType.Step, Step],
    [BlockType.Scope, Scope],
    [BlockType.ToWorkspace, ToWorkspace],
    [BlockType.Sum, Sum],
    [BlockType.Gain, Gain],
    [BlockType.Product, Product],
    [BlockType.Divide, Divide],
    [BlockType.MathFunction, MathFunction],
    [BlockType.Integrator, Integrator],
    [BlockType.TransferFunction, TransferFunction],
    [BlockType.Relay, Relay],
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

describe('Thermistor RC charge-time temperature example', () => {
  const example = EXAMPLES.find((e) => e.id === 'thermistor-rc-timer');
  const registry = createRegistry();

  // Model constants (mirror the diagram).
  const V_S = 24, V_L1 = 12, R1 = 10000, C = 0.0001, R0 = 10000, B = 3435, T0_K = 298.15, baseT_C = 25;

  function analyticTL(T_C: number): number {
    const T = T_C + 273.15;
    const RT = R0 * Math.exp(B * (1 / T - 1 / T0_K));
    const tau = (R1 + RT) * C;
    return tau * Math.log(V_S / (V_S - V_L1));
  }

  it('is registered in the gallery', () => {
    expect(example).toBeDefined();
  });

  it('validates and solves without error, and NTC is monotonic (t_L falls as T rises)', () => {
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

    // NTC monotonicity across a temperature sweep (analytic):
    const temps = [0, 10, 25, 40, 60];
    const times = temps.map((t) => analyticTL(t));
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeLessThan(times[i - 1]);
    }

    // Charge curve endpoint: at t=duration, V_C = V_S*(1 − e^(−duration/τ)).
    // We're at 2.5τ so it's NOT settled to 24 V yet — check the exact
    // exponential value instead of "≈ V_S" (that would be a false bug).
    const dur = ex.model.simConfig.duration;
    const tauAt25 = (R1 + R0 * Math.exp(B * (1 / (baseT_C + 273.15) - 1 / T0_K))) * C;
    const expectedVC = V_S * (1 - Math.exp(-dur / tauAt25));
    const finalVC = vTrace![vTrace!.length - 1];
    expect(Math.abs(finalVC - expectedVC)).toBeLessThan(0.1);
    // And it must have crossed the threshold by then (rising toward V_S).
    expect(finalVC).toBeGreaterThan(V_L1);
    expect(finalVC).toBeLessThan(V_S);

    // Threshold crossing: model t_L vs analytic t_L at t_c = 25 C.
    const idx = vTrace!.findIndex((v) => v >= V_L1);
    expect(idx).toBeGreaterThan(-1);
    const simTL = result.time[idx];
    const anaTL = analyticTL(baseT_C);
    const relErr = Math.abs(simTL - anaTL) / anaTL;
    expect(relErr).toBeLessThan(0.02);
  });

  it('has a transfer-function view: G(s)=1/(τs+1) matches the ODE path at 25 °C', () => {
    expect(example).toBeDefined();
    const ex = example!;
    const graph = buildGraph(ex.model);
    const validation = validateGraph(graph, registry);
    expect(validation.valid, validation.errors.join('; ')).toBe(true);

    const compiled = compileGraph(graph, registry, ex.model.simConfig.dt);
    const state = new Array(compiled.stateSize).fill(0);
    const result = solve(compiled, ex.model.simConfig, state);

    // TF row output must exist and be finite.
    const tfTrace = result.scopes['scope_tf'];
    expect(tfTrace).toBeDefined();

    // Both paths represent the same plant at 25 °C (τ = 2.0 s exactly:
    // R_T(25 °C) = R₀ = 10 kΩ, so τ = (R1 + R_T)·C = 2.0 s).
    // TF step response: V_C(t) = 24·(1 − e^(−t/2)) — identical ODE, so the
    // threshold crossing times must agree within one solver sample.
    const odeTrace = result.scopes['scope_v'];
    expect(odeTrace).toBeDefined();
    const iOde = odeTrace!.findIndex((v) => v >= V_L1);
    const iTf = tfTrace!.findIndex((v) => v >= V_L1);
    expect(iOde).toBeGreaterThan(-1);
    expect(iTf).toBeGreaterThan(-1);
    expect(Math.abs(iOde - iTf)).toBeLessThanOrEqual(1);

    // TF crossing vs analytic t_L (1.386 s at 25 °C).
    const tfTL = result.time[iTf];
    const anaTL = analyticTL(baseT_C);
    expect(Math.abs(tfTL - anaTL) / anaTL).toBeLessThan(0.02);

    // TF final value matches the exact exponential at t = duration.
    const dur = ex.model.simConfig.duration;
    const tauAt25 = (R1 + R0 * Math.exp(B * (1 / (baseT_C + 273.15) - 1 / T0_K))) * C;
    const expectedVC = V_S * (1 - Math.exp(-dur / tauAt25));
    expect(Math.abs(tfTrace![tfTrace!.length - 1] - expectedVC)).toBeLessThan(0.1);
  });

  it('annotates blocks with comments mapping them to circuit elements', () => {
    expect(example).toBeDefined();
    const ex = example!;
    const comments = ex.model.blocks.filter(
      (b) => (b.type as string) === 'Comment'
    ) as unknown as Array<{ id: string; params: { text?: string }; position: { x: number; y: number } }>;
    // At least one comment per physical concept we label: temperature,
    // thermistor, τ chain, capacitor, TF view, threshold pin, supply.
    expect(comments.length).toBeGreaterThanOrEqual(7);
    const texts = comments.map((c) => (c.params.text ?? '').toLowerCase()).join('\n');
    expect(texts).toContain('ambient temperature');
    expect(texts).toContain('thermistor');
    expect(texts).toContain('capacitor');
    expect(texts).toContain('g(s)');
    expect(texts).toContain('threshold');
    expect(texts).toContain('supply');
    // Every comment has a position (so it renders on canvas).
    for (const c of comments) {
      expect(typeof c.position.x).toBe('number');
    }
  });
});
