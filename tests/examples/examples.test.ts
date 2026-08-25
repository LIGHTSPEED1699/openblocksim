import { describe, it, expect } from 'vitest';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { Constant } from '../../src/blocks/sources/Constant';
import { Step } from '../../src/blocks/sources/Step';
import { Ramp } from '../../src/blocks/sources/Ramp';
import { Sine } from '../../src/blocks/sources/Sine';
import { Square } from '../../src/blocks/sources/Square';
import { Scope } from '../../src/blocks/sinks/Scope';
import { ToWorkspace } from '../../src/blocks/sinks/ToWorkspace';
import { Sum } from '../../src/blocks/math/Sum';
import { Gain } from '../../src/blocks/math/Gain';
import { Product } from '../../src/blocks/math/Product';
import { Integrator } from '../../src/blocks/linear/Integrator';
import { Derivative } from '../../src/blocks/linear/Derivative';
import { TransferFunction } from '../../src/blocks/linear/TransferFunction';
import { StateSpace } from '../../src/blocks/linear/StateSpace';
import { TransportDelay } from '../../src/blocks/linear/TransportDelay';
import { Saturation } from '../../src/blocks/nonlinear/Saturation';
import { Deadzone } from '../../src/blocks/nonlinear/Deadzone';
import { PID } from '../../src/blocks/control/PID';
import { Relay } from '../../src/blocks/control/Relay';
import { RoundingFunction } from '../../src/blocks/math/RoundingFunction';
import { Comment } from '../../src/blocks/annotation/Comment';
import { compileGraph } from '../../src/engine/compiler';
import { solve } from '../../src/engine/solver';
import { validateGraph } from '../../src/engine/validate';
import { EXAMPLES } from '../../src/examples';

function createRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(BlockType.Constant, Constant);
  r.register(BlockType.Step, Step);
  r.register(BlockType.Ramp, Ramp);
  r.register(BlockType.Sine, Sine);
  r.register(BlockType.Square, Square);
  r.register(BlockType.Scope, Scope);
  r.register(BlockType.ToWorkspace, ToWorkspace);
  r.register(BlockType.Sum, Sum);
  r.register(BlockType.Gain, Gain);
  r.register(BlockType.Product, Product);
  r.register(BlockType.Integrator, Integrator);
  r.register(BlockType.Derivative, Derivative);
  r.register(BlockType.TransferFunction, TransferFunction);
  r.register(BlockType.StateSpace, StateSpace);
  r.register(BlockType.TransportDelay, TransportDelay);
  r.register(BlockType.Saturation, Saturation);
  r.register(BlockType.Deadzone, Deadzone);
  r.register(BlockType.PID, PID);
  r.register(BlockType.Relay, Relay);
  r.register(BlockType.RoundingFunction, RoundingFunction);
  r.register(BlockType.Comment, Comment);
  return r;
}

describe('prebuilt examples', () => {
  const registry = createRegistry();

  for (const example of EXAMPLES) {
    // Models imported from Simulink with unsupported blocks (Comment placeholders)
    // may contain algebraic loops through Simscape components that OpenBlockSim's
    // solver cannot break (no dynamic block in the loop). These models are topology
    // showcases, not runnable simulations. Skip the compile+solve test for them.
    const hasUnsupportedBlocks = example.model.blocks.some((b) => b.type === BlockType.Comment);

    if (hasUnsupportedBlocks) {
      it(`loads and validates topology of "${example.name}"`, () => {
        // Verify all edges reference existing blocks (no phantom edges)
        const blockIds = new Set(example.model.blocks.map((b) => b.id));
        for (const e of example.model.edges) {
          expect(blockIds.has(e.source)).toBe(true);
          expect(blockIds.has(e.target)).toBe(true);
        }
        // Verify at least some edges exist (not disconnected)
        expect(example.model.edges.length).toBeGreaterThan(0);
      });
    } else {
      it(`compiles and solves "${example.name}" without error`, () => {
        const graph = {
          blocks: example.model.blocks.map((b) => ({ id: b.id, type: b.type, params: b.params })),
          edges: example.model.edges.map((e) => ({
            id: e.id, source: e.source, sourcePort: e.sourcePort,
            target: e.target, targetPort: e.targetPort,
          })),
        };

        const validation = validateGraph(graph, registry);
        expect(validation.valid, validation.errors.join('; ')).toBe(true);

        const compiled = compileGraph(graph, registry, example.model.simConfig.dt);
        const state = new Array(compiled.stateSize).fill(0);
        const result = solve(compiled, example.model.simConfig, state);

        // At least one scope present and populated with finite values
        const scopeIds = compiled.scopeBlockIds;
        expect(scopeIds.length).toBeGreaterThan(0);
        for (const id of scopeIds) {
          const trace = result.scopes[id];
          expect(trace.length).toBeGreaterThan(0);
          for (const v of trace) {
            expect(Number.isFinite(v)).toBe(true);
          }
        }
      });
    }
  }
});