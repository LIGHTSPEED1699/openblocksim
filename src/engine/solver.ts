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

// DOPRI5 (Dormand-Prince RK4(5)) coefficients
const C2 = 1 / 5, C3 = 3 / 10, C4 = 4 / 5, C5 = 8 / 9;
const A21 = 1 / 5;
const A31 = 3 / 40, A32 = 9 / 40;
const A41 = 44 / 45, A42 = -56 / 15, A43 = 32 / 9;
const A51 = 19372 / 6561, A52 = -25360 / 2187, A53 = 64448 / 6561, A54 = -212 / 729;
const A61 = 9017 / 3168, A62 = -355 / 33, A63 = 46732 / 5247, A64 = 49 / 176, A65 = -5103 / 18656;
const A71 = 35 / 384, A73 = 500 / 1113, A74 = 125 / 192, A75 = -2187 / 6784, A76 = 11 / 84;
const E1 = 71 / 57600, E3 = -71 / 16695, E4 = 71 / 1920, E5 = -17253 / 339200, E6 = 22 / 525, E7 = -1 / 40;

export function solveAdaptive(
  model: CompiledModel,
  config: { dt: number; duration: number; rtol: number; atol: number },
  initialState: number[]
): SimResult {
  const { dt: hMax, duration, rtol, atol } = config;
  const n = model.stateSize;

  if (duration > MAX_DURATION) {
    throw new Error(`Simulation duration ${duration}s exceeds maximum of ${MAX_DURATION}s`);
  }

  const time: number[] = [0];
  const scopes: Record<string, number[]> = {};
  for (const scopeId of model.scopeBlockIds) {
    scopes[scopeId] = [];
  }

  let state = [...initialState];
  let t = 0;
  let h = Math.min(hMax, duration);
  let actualSteps = 0;
  let totalEvaluations = 0;

  const FAC = 0.9, FACMIN = 0.2, FACMAX = 5.0;

  // Initialize prevOutputs and scope capture at t=0
  if (model.updatePrevOutputs) model.updatePrevOutputs(t, state);
  if (model.getOutputs) {
    const initOutputs = model.getOutputs(0, state);
    for (const scopeId of model.scopeBlockIds) {
      const wires = model.scopeInputs?.get(scopeId);
      if (wires && wires.length > 0) {
        const srcOut = initOutputs.get(wires[0].source) ?? [];
        scopes[scopeId].push(srcOut[wires[0].sourcePort] ?? 0);
      } else {
        scopes[scopeId].push(0);
      }
    }
  }

  while (t < duration - 1e-12) {
    if (totalEvaluations > MAX_STEPS * 7) {
      throw new Error(`Step count exceeds maximum of ${MAX_STEPS} (adaptive solver stuck)`);
    }

    // Don't overshoot end time
    if (t + h > duration) h = duration - t;

    // DOPRI5 stages
    const k1 = model.f(t, state);
    const k2 = model.f(t + C2 * h, state.map((s, i) => s + h * A21 * k1[i]));
    const k3 = model.f(t + C3 * h, state.map((s, i) => s + h * (A31 * k1[i] + A32 * k2[i])));
    const k4 = model.f(t + C4 * h, state.map((s, i) => s + h * (A41 * k1[i] + A42 * k2[i] + A43 * k3[i])));
    const k5 = model.f(t + C5 * h, state.map((s, i) => s + h * (A51 * k1[i] + A52 * k2[i] + A53 * k3[i] + A54 * k4[i])));
    const k6 = model.f(t + h, state.map((s, i) => s + h * (A61 * k1[i] + A62 * k2[i] + A63 * k3[i] + A64 * k4[i] + A65 * k5[i])));

    // 5th order solution
    const y5 = state.map((s, i) => s + h * (A71 * k1[i] + A73 * k3[i] + A74 * k4[i] + A75 * k5[i] + A76 * k6[i]));

    // Early NaN check on proposed state (before error norm computation)
    for (let i = 0; i < n; i++) {
      if (!isFinite(y5[i])) {
        throw new Error(
          `Simulation diverged at t=${(t + h).toFixed(3)}s. State variable ${i} produced ${isNaN(y5[i]) ? 'NaN' : 'Infinity'}. Check parameters for instability.`
        );
      }
    }

    // k7 = f(t+h, y5) — FSAL
    const k7 = model.f(t + h, y5);
    totalEvaluations += 7;

    // Error estimate
    const err = state.map((_s, i) => h * (E1 * k1[i] + E3 * k3[i] + E4 * k4[i] + E5 * k5[i] + E6 * k6[i] + E7 * k7[i]));

    // Error norm (RMS of scaled errors)
    let errNorm = 0;
    for (let i = 0; i < n; i++) {
      const sc = atol + rtol * Math.max(Math.abs(state[i]), Math.abs(y5[i]));
      errNorm += (err[i] / sc) ** 2;
    }
    errNorm = Math.sqrt(errNorm / Math.max(n, 1));

    if (errNorm <= 1 || h < 1e-14) {
      // Accept step (or force accept if h is tiny to avoid infinite loop)
      state = y5;
      t += h;
      actualSteps++;

      // Apply absolute state updates (TransportDelay, Relay, etc.)
      if (model.applyAbsoluteState) model.applyAbsoluteState(t, state);

      // NaN check
      for (let i = 0; i < n; i++) {
        if (!isFinite(state[i])) {
          throw new Error(
            `Simulation diverged at t=${t.toFixed(3)}s. State variable ${i} produced ${isNaN(state[i]) ? 'NaN' : 'Infinity'}. Check parameters for instability.`
          );
        }
      }

      // Capture scope traces
      if (model.getOutputs) {
        const allOutputs = model.getOutputs(t, state);
        for (const scopeId of model.scopeBlockIds) {
          const wires = model.scopeInputs?.get(scopeId);
          if (wires && wires.length > 0) {
            const srcOut = allOutputs.get(wires[0].source) ?? [];
            scopes[scopeId].push(srcOut[wires[0].sourcePort] ?? 0);
          } else {
            scopes[scopeId].push(0);
          }
        }
      }

      time.push(t);

      // Update prevOutputs for feedback edges
      if (model.updatePrevOutputs) model.updatePrevOutputs(t, state);

      // Increase step size
      if (errNorm === 0) {
        h = h * FACMAX;
      } else {
        const fac = FAC * Math.pow(1 / errNorm, 1 / 5);
        h = Math.min(hMax, h * Math.min(FACMAX, Math.max(FACMIN, fac)));
      }
    } else {
      // Reject step — reduce h and retry
      const fac = FAC * Math.pow(1 / errNorm, 1 / 5);
      h = h * Math.max(FACMIN, fac);
      if (h < 1e-14) {
        throw new Error(`Step size underflow at t=${t.toFixed(3)}s. System may be stiff.`);
      }
    }
  }

  return { time, traces: {}, scopes, actualSteps };
}