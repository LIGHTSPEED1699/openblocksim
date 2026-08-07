import type { CompiledModel, SimResult } from './types';

const MAX_DURATION = 60;
const MAX_STEPS = 100000;

export function solve(
  model: CompiledModel,
  config: { dt: number; duration: number },
  initialState: number[]
): SimResult {
  const { dt, duration } = config;

  const numSteps = Math.ceil(duration / dt);
  if (numSteps > MAX_STEPS) {
    throw new Error(
      `step count ${numSteps} exceeds maximum of ${MAX_STEPS} (dt=${dt}, duration=${duration})`
    );
  }

  if (duration > MAX_DURATION) {
    throw new Error(
      `Simulation duration ${duration}s exceeds maximum of ${MAX_DURATION}s`
    );
  }

  const time: number[] = new Array(numSteps + 1);
  const scopes: Record<string, number[]> = {};
  for (const scopeId of model.scopeBlockIds) {
    scopes[scopeId] = new Array(numSteps + 1);
  }

  let state = [...initialState];
  let t = 0;

  time[0] = t;

  // Capture initial outputs for scopes
  if (model.getOutputs) {
    const initialOutputs = model.getOutputs(t, state);
    for (const scopeId of model.scopeBlockIds) {
      // Scope block has 1 input — find which block feeds it
      const scopeBlock = model.blockOrder.find((id) => id === scopeId);
      if (scopeBlock) {
        // The scope's input comes from its source block
        // We need to find the wire feeding the scope and read that source's output
        // For now, use getOutputs which returns all block outputs
        // The scope trace = the output of whatever block feeds it
        // This is handled by the compiler's input wire tracking
      }
      scopes[scopeId][0] = 0; // will be filled by getOutputs logic
    }
  }

  for (let step = 0; step < numSteps; step++) {
    // RK4 for derivative-mode blocks
    const k1 = model.f(t, state);
    const k2 = model.f(t + dt / 2, state.map((s, i) => s + (dt / 2) * k1[i]));
    const k3 = model.f(t + dt / 2, state.map((s, i) => s + (dt / 2) * k2[i]));
    const k4 = model.f(t + dt, state.map((s, i) => s + dt * k3[i]));

    for (let i = 0; i < state.length; i++) {
      state[i] += (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    }

    // Apply absolute state updates (TransportDelay, Relay) after RK4 step
    if (model.applyAbsoluteState) {
      model.applyAbsoluteState(t + dt, state);
    }

    t += dt;
    time[step + 1] = t;

    // NaN/Infinity check
    for (let i = 0; i < state.length; i++) {
      if (!isFinite(state[i])) {
        throw new Error(
          `Simulation diverged at t=${t.toFixed(3)}s. State variable ${i} produced ${isNaN(state[i]) ? 'NaN' : 'Infinity'}. Check parameters for instability.`
        );
      }
    }

    // Capture scope traces
    if (model.getOutputs) {
      const outputs = model.getOutputs(t, state);
      for (const scopeId of model.scopeBlockIds) {
        // Find which block's output feeds this scope
        // The compiler stored scope inputs in the block order
        // The scope's input value = the output of its source block
        // For MVP: read the first input to the scope block
        // This requires the compiler to expose input mapping
        // For now: the scope trace is the output of the block preceding it
        // TODO: compiler should expose a getScopeValues function
      }
    }
  }

  return {
    time,
    traces: {},
    scopes,
  };
}