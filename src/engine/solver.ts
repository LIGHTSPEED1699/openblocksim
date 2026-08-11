import type { CompiledModel, SimResult } from './types';

const MAX_DURATION = 600;
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

  // Initialize previous-step outputs for feedback edges
  if (model.updatePrevOutputs) {
    model.updatePrevOutputs(t, state);
  }

  // Initialize scope traces at t=0 — capture initial input values
  if (model.getOutputs) {
    const initOutputs = model.getOutputs(0, state);
    for (const scopeId of model.scopeBlockIds) {
      const inputWires = model.scopeInputs?.get(scopeId);
      if (inputWires && inputWires.length > 0) {
        const wire = inputWires[0];
        const srcOut = initOutputs.get(wire.source) ?? [];
        scopes[scopeId][0] = srcOut[wire.sourcePort] ?? 0;
      } else {
        scopes[scopeId][0] = 0;
      }
    }
  } else {
    for (const scopeId of model.scopeBlockIds) {
      scopes[scopeId][0] = 0;
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

    // Capture scope traces — record the input value feeding each scope block
    if (model.getOutputs) {
      const allOutputs = model.getOutputs(t, state);
      for (const scopeId of model.scopeBlockIds) {
        // Scope has 1 input — find which block feeds it
        const inputWires = model.scopeInputs?.get(scopeId);
        if (inputWires && inputWires.length > 0) {
          const wire = inputWires[0];
          const srcOut = allOutputs.get(wire.source) ?? [];
          scopes[scopeId][step + 1] = srcOut[wire.sourcePort] ?? 0;
        } else {
          scopes[scopeId][step + 1] = 0;
        }
      }
    }

    // Update previous-step outputs for next step's feedback edges
    if (model.updatePrevOutputs) {
      model.updatePrevOutputs(t, state);
    }
  }

  return {
    time,
    traces: {},
    scopes,
  };
}