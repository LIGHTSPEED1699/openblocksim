import { validateGraph } from './validate';
import { compileGraph } from './compiler';
import { solve } from './solver';
import { BlockRegistry } from '../blocks/registry';
import { BlockType } from '../blocks/types';
import { Constant } from '../blocks/sources/Constant';
import { Step } from '../blocks/sources/Step';
import { Ramp } from '../blocks/sources/Ramp';
import { Sine } from '../blocks/sources/Sine';
import { Square } from '../blocks/sources/Square';
import { Scope } from '../blocks/sinks/Scope';
import { ToWorkspace } from '../blocks/sinks/ToWorkspace';
import { Sum } from '../blocks/math/Sum';
import { Gain } from '../blocks/math/Gain';
import { Product } from '../blocks/math/Product';
import { Integrator } from '../blocks/linear/Integrator';
import { Derivative } from '../blocks/linear/Derivative';
import { TransferFunction } from '../blocks/linear/TransferFunction';
import { StateSpace } from '../blocks/linear/StateSpace';
import { TransportDelay } from '../blocks/linear/TransportDelay';
import { Saturation } from '../blocks/nonlinear/Saturation';
import { Deadzone } from '../blocks/nonlinear/Deadzone';
import { PID } from '../blocks/control/PID';
import { Relay } from '../blocks/control/Relay';
import type { WorkerMessage } from './types';

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
  return r;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;
  if (msg.type !== 'run') return;

  const registry = createRegistry();
  const validation = validateGraph(msg.graph, registry);
  if (!validation.valid) {
    const errorMsg: WorkerMessage = {
      type: 'error',
      message: validation.errors.join('; '),
    };
    (self as any).postMessage(errorMsg);
    return;
  }

  try {
    const model = compileGraph(msg.graph, registry, msg.dt);
    const result = solve(model, { dt: msg.dt, duration: msg.duration }, new Array(model.stateSize).fill(0));
    const doneMsg: WorkerMessage = { type: 'done', results: result };
    (self as any).postMessage(doneMsg);
  } catch (err) {
    const errorMsg: WorkerMessage = {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
    (self as any).postMessage(errorMsg);
  }
};