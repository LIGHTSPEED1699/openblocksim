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
import { Comment } from '../blocks/annotation/Comment';
import { Abs } from '../blocks/math/Abs';
import { Sign } from '../blocks/math/Sign';
import { Bias } from '../blocks/math/Bias';
import { UnaryMinus } from '../blocks/math/UnaryMinus';
import { Divide } from '../blocks/math/Divide';
import { MinMax } from '../blocks/math/MinMax';
import { RoundingFunction } from '../blocks/math/RoundingFunction';
import { MathFunction } from '../blocks/math/MathFunction';
import { TrigFunction } from '../blocks/math/TrigFunction';
import { Switch } from '../blocks/routing/Switch';
import { UnitDelay } from '../blocks/discrete/UnitDelay';
import { DiscreteIntegrator } from '../blocks/discrete/DiscreteIntegrator';
import { DiscreteTransferFcn } from '../blocks/discrete/DiscreteTransferFcn';
import { Memory } from '../blocks/discrete/Memory';
import { RateLimiter } from '../blocks/nonlinear/RateLimiter';
import { Quantizer } from '../blocks/nonlinear/Quantizer';
import { Backlash } from '../blocks/nonlinear/Backlash';
import { PulseGenerator } from '../blocks/sources/PulseGenerator';
import { Clock } from '../blocks/sources/Clock';
import { ChirpSignal } from '../blocks/sources/ChirpSignal';
import { RepeatingSequence } from '../blocks/sources/RepeatingSequence';
import { RandomNumber } from '../blocks/sources/RandomNumber';
import { Terminator } from '../blocks/sinks/Terminator';
import { Display } from '../blocks/sinks/Display';
import { StopSimulation } from '../blocks/sinks/StopSimulation';
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
  r.register(BlockType.Comment, Comment);
  r.register(BlockType.Abs, Abs);
  r.register(BlockType.Sign, Sign);
  r.register(BlockType.Bias, Bias);
  r.register(BlockType.UnaryMinus, UnaryMinus);
  r.register(BlockType.Divide, Divide);
  r.register(BlockType.MinMax, MinMax);
  r.register(BlockType.RoundingFunction, RoundingFunction);
  r.register(BlockType.MathFunction, MathFunction);
  r.register(BlockType.TrigFunction, TrigFunction);
  r.register(BlockType.Switch, Switch);
  r.register(BlockType.UnitDelay, UnitDelay);
  r.register(BlockType.DiscreteIntegrator, DiscreteIntegrator);
  r.register(BlockType.DiscreteTransferFcn, DiscreteTransferFcn);
  r.register(BlockType.Memory, Memory);
  r.register(BlockType.RateLimiter, RateLimiter);
  r.register(BlockType.Quantizer, Quantizer);
  r.register(BlockType.Backlash, Backlash);
  r.register(BlockType.PulseGenerator, PulseGenerator);
  r.register(BlockType.Clock, Clock);
  r.register(BlockType.ChirpSignal, ChirpSignal);
  r.register(BlockType.RepeatingSequence, RepeatingSequence);
  r.register(BlockType.RandomNumber, RandomNumber);
  r.register(BlockType.Terminator, Terminator);
  r.register(BlockType.Display, Display);
  r.register(BlockType.StopSimulation, StopSimulation);
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