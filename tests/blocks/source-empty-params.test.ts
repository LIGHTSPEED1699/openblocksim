import { describe, it, expect } from 'vitest';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { compileGraph } from '../../src/engine/compiler';
import { solve } from '../../src/engine/solver';
import type { SerializedGraph } from '../../src/engine/types';

import { Constant } from '../../src/blocks/sources/Constant';
import { Step } from '../../src/blocks/sources/Step';
import { Ramp } from '../../src/blocks/sources/Ramp';
import { Sine } from '../../src/blocks/sources/Sine';
import { Square } from '../../src/blocks/sources/Square';
import { PulseGenerator } from '../../src/blocks/sources/PulseGenerator';
import { Clock } from '../../src/blocks/sources/Clock';
import { ChirpSignal } from '../../src/blocks/sources/ChirpSignal';
import { RepeatingSequence } from '../../src/blocks/sources/RepeatingSequence';
import { RandomNumber } from '../../src/blocks/sources/RandomNumber';
import { Scope } from '../../src/blocks/sinks/Scope';

function createRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(BlockType.Constant, Constant);
  r.register(BlockType.Step, Step);
  r.register(BlockType.Ramp, Ramp);
  r.register(BlockType.Sine, Sine);
  r.register(BlockType.Square, Square);
  r.register(BlockType.PulseGenerator, PulseGenerator);
  r.register(BlockType.Clock, Clock);
  r.register(BlockType.ChirpSignal, ChirpSignal);
  r.register(BlockType.RepeatingSequence, RepeatingSequence);
  r.register(BlockType.RandomNumber, RandomNumber);
  r.register(BlockType.Scope, Scope);
  return r;
}

/** Build a graph: source → scope, with empty params (simulates drag-drop). */
function buildGraph(sourceType: BlockType): SerializedGraph {
  const sourceId = `${sourceType}-1`;
  const scopeId = 'Scope-1';
  return {
    blocks: [
      { id: sourceId, type: sourceType, params: {}, position: { x: 0, y: 0 } },
      { id: scopeId, type: BlockType.Scope, params: {}, position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: sourceId, sourcePort: 0, target: scopeId, targetPort: 0 },
    ],
  };
}

/** Run simulation and return scope trace. */
function runSim(graph: SerializedGraph): number[] {
  const registry = createRegistry();
  const model = compileGraph(graph, registry, 0.01);
  const result = solve(model, { dt: 0.01, duration: 5 }, new Array(model.stateSize).fill(0));
  const scopeId = model.scopeBlockIds[0];
  return result.scopes[scopeId];
}

describe('Source blocks with empty params — defaults applied by compiler', () => {
  it('Sine produces valid sine wave with empty params', () => {
    const trace = runSim(buildGraph(BlockType.Sine));
    // No NaN allowed — defaults: amplitude=1, frequency=1, phase=0, bias=0
    const hasNaN = trace.some((v) => isNaN(v));
    expect(hasNaN).toBe(false);
    // sin(2*pi*1*0) = 0 at t=0
    expect(trace[0]).toBeCloseTo(0, 5);
    // sin(2*pi*1*0.25) = sin(pi/2) = 1 at t=0.25
    const idx25 = Math.round(0.25 / 0.01);
    expect(trace[idx25]).toBeCloseTo(1, 1);
  });

  it('Square produces valid square wave with empty params', () => {
    const trace = runSim(buildGraph(BlockType.Square));
    const hasNaN = trace.some((v) => isNaN(v));
    expect(hasNaN).toBe(false);
    // At t=0.25, sin(pi/2)=1 >= 0 → amplitude=1
    const idx25 = Math.round(0.25 / 0.01);
    expect(trace[idx25]).toBe(1);
    // At t=0.75, sin(3pi/2)=-1 < 0 → -amplitude=-1
    const idx75 = Math.round(0.75 / 0.01);
    expect(trace[idx75]).toBe(-1);
  });

  it('Constant outputs default value 1 with empty params', () => {
    const trace = runSim(buildGraph(BlockType.Constant));
    const hasNaN = trace.some((v) => isNaN(v));
    expect(hasNaN).toBe(false);
    expect(trace.every((v) => v === 1)).toBe(true);
  });

  it('Step produces actual step at t=1 with empty params', () => {
    const trace = runSim(buildGraph(BlockType.Step));
    const hasNaN = trace.some((v) => isNaN(v));
    expect(hasNaN).toBe(false);
    // Before step time (default=1): 0
    expect(trace[0]).toBe(0);
    // After step time: 1
    const afterStep = Math.round(1.5 / 0.01);
    expect(trace[afterStep]).toBe(1);
  });

  it('Ramp produces actual ramp with empty params', () => {
    const trace = runSim(buildGraph(BlockType.Ramp));
    const hasNaN = trace.some((v) => isNaN(v));
    expect(hasNaN).toBe(false);
    // Default: startTime=0, slope=1 → at t=3, output=3
    const idx3 = Math.round(3 / 0.01);
    expect(trace[idx3]).toBeCloseTo(3, 1);
  });

  it('PulseGenerator produces pulses with empty params', () => {
    const trace = runSim(buildGraph(BlockType.PulseGenerator));
    const hasNaN = trace.some((v) => isNaN(v));
    expect(hasNaN).toBe(false);
    // Default: amplitude=1, period=1, duty=50% → at t=0.2, should be 1 (on)
    const idx02 = Math.round(0.2 / 0.01);
    expect(trace[idx02]).toBe(1);
  });

  it('Clock outputs simulation time with empty params', () => {
    const trace = runSim(buildGraph(BlockType.Clock));
    const hasNaN = trace.some((v) => isNaN(v));
    expect(hasNaN).toBe(false);
    expect(trace[trace.length - 1]).toBeCloseTo(5, 1);
  });

  it('ChirpSignal produces valid signal with empty params', () => {
    const trace = runSim(buildGraph(BlockType.ChirpSignal));
    const hasNaN = trace.some((v) => isNaN(v));
    expect(hasNaN).toBe(false);
    expect(trace.every((v) => isFinite(v))).toBe(true);
  });

  it('RepeatingSequence produces valid signal with empty params', () => {
    const trace = runSim(buildGraph(BlockType.RepeatingSequence));
    const hasNaN = trace.some((v) => isNaN(v));
    expect(hasNaN).toBe(false);
    expect(trace.every((v) => isFinite(v))).toBe(true);
  });

  it('RandomNumber produces finite values with empty params', () => {
    const trace = runSim(buildGraph(BlockType.RandomNumber));
    const hasNaN = trace.some((v) => isNaN(v));
    expect(hasNaN).toBe(false);
    expect(trace.every((v) => isFinite(v))).toBe(true);
  });
});