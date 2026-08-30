import { describe, it, expect } from 'vitest';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { Constant } from '../../src/blocks/sources/Constant';
import { Scope } from '../../src/blocks/sinks/Scope';
import { ToWorkspace } from '../../src/blocks/sinks/ToWorkspace';
import { Sum } from '../../src/blocks/math/Sum';
import { Gain } from '../../src/blocks/math/Gain';
import { Product } from '../../src/blocks/math/Product';
import { Divide } from '../../src/blocks/math/Divide';
import { MathFunction } from '../../src/blocks/math/MathFunction';
import { Integrator } from '../../src/blocks/linear/Integrator';
import { Relay } from '../../src/blocks/control/Relay';
import { compileGraph } from '../../src/engine/compiler';
import { solve } from '../../src/engine/solver';
import { validateGraph } from '../../src/engine/validate';
import { EXAMPLES, Example } from '../../src/examples';

function createRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  const regs: Array<[BlockType, any]> = [
    [BlockType.Constant, Constant],
    [BlockType.Scope, Scope],
    [BlockType.ToWorkspace, ToWorkspace],
    [BlockType.Sum, Sum],
    [BlockType.Gain, Gain],
    [BlockType.Product, Product],
    [BlockType.Divide, Divide],
    [BlockType.MathFunction, MathFunction],
    [BlockType.Integrator, Integrator],
    [BlockType.Relay, Relay],
  ];
  for (const [t, f] of regs) r.register(t, f);
  return r;
}

function buildGraph(model: Example['model']) {
  return {
    blocks: model.blocks.map((b) => ({ id: b.id, type: b.type, params: b.params })),
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
});
