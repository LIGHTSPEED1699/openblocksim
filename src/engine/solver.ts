import type { CompiledModel, SimResult, SolverStats, SimConfig } from './types';

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
  const wallStart = Date.now();

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
  let rejectedSteps = 0;
  let minStep = h;
  let maxStep = h;
  const crossingTimes: number[] = [];
  let consecutiveTinySteps = 0;
  const STALL_THRESHOLD = 100; // consecutive tiny steps before stall
  const TINY_STEP = 1e-10;

  const events = model.events ?? [];

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

    const t0 = t;
    const state0 = [...state];

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
      // Zero-crossing detection: check each event for sign change across [t0, t]
      if (events.length > 0) {
        for (const ev of events) {
          const s0 = ev.sign(t0, state0);
          const s1 = ev.sign(t + h, y5);
          if (s0 * s1 < 0) {
            // Bisect to locate the exact crossing time
            let a = t0, b = t + h, fa = s0;
            for (let iter = 0; iter < 60; iter++) {
              const m = (a + b) / 2;
              const fm = ev.sign(m, state0.map((s, i) => s + (m - t0) * (y5[i] - s) / h));
              if (fa * fm <= 0) { b = m; } else { a = m; fa = fm; }
              if (Math.abs(b - a) < 1e-12) break;
            }
            crossingTimes.push((a + b) / 2);
          }
        }
      }

      state = y5;
      t += h;
      actualSteps++;
      if (h < minStep) minStep = h;
      if (h > maxStep) maxStep = h;

      // Stall detection
      if (h < TINY_STEP) {
        consecutiveTinySteps++;
        if (consecutiveTinySteps > STALL_THRESHOLD) {
          throw new Error(`Solver stalled at t=${t.toFixed(3)}s — system may be stiff. Try the BDF solver.`);
        }
      } else {
        consecutiveTinySteps = 0;
      }

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
      rejectedSteps++;
      const fac = FAC * Math.pow(1 / errNorm, 1 / 5);
      h = h * Math.max(FACMIN, fac);
      if (h < 1e-14) {
        throw new Error(`Step size underflow at t=${t.toFixed(3)}s. System may be stiff. Try the BDF solver.`);
      }
    }
  }

  const stats: SolverStats = {
    acceptedSteps: actualSteps,
    rejectedSteps,
    minStep: actualSteps > 0 ? minStep : 0,
    maxStep: actualSteps > 0 ? maxStep : 0,
    rhsEvals: totalEvaluations,
    wallMs: Date.now() - wallStart,
  };

  return { time, traces: {}, scopes, actualSteps, crossingTimes, stats };
}

const BDF_NEWTON_TOL = 1e-9;
const BDF_NEWTON_MAX_ITER = 50;
const BDF_H_MIN = 1e-14;

export function solveBDF(
  model: CompiledModel,
  config: SimConfig & { rtol?: number; atol?: number },
  initialState: number[]
): SimResult {
  const { dt, duration } = config;
  const n = model.stateSize;
  const wallStart = Date.now();

  if (duration > MAX_DURATION) {
    throw new Error(`Simulation duration ${duration}s exceeds maximum of ${MAX_DURATION}s`);
  }

  const numSteps = Math.ceil(duration / dt);
  if (numSteps > MAX_STEPS) {
    throw new Error(`step count ${numSteps} exceeds maximum of ${MAX_STEPS} (dt=${dt}, duration=${duration})`);
  }

  const time: number[] = new Array(numSteps + 1);
  const scopes: Record<string, number[]> = {};
  for (const scopeId of model.scopeBlockIds) {
    scopes[scopeId] = new Array(numSteps + 1);
  }

  let state = [...initialState];
  let t = 0;
  let actualSteps = 0;
  let minStep = dt;
  let maxStep = dt;

  time[0] = t;

  const captureScopes = (tt: number, st: number[], idx: number) => {
    if (model.getOutputs) {
      const allOutputs = model.getOutputs(tt, st);
      for (const scopeId of model.scopeBlockIds) {
        const wires = model.scopeInputs?.get(scopeId);
        if (wires && wires.length > 0) {
          const srcOut = allOutputs.get(wires[0].source) ?? [];
          scopes[scopeId][idx] = srcOut[wires[0].sourcePort] ?? 0;
        } else {
          scopes[scopeId][idx] = 0;
        }
      }
    }
  };

  if (model.updatePrevOutputs) model.updatePrevOutputs(t, state);
  captureScopes(0, state, 0);

  let h = dt;

  for (let step = 0; step < numSteps; step++) {
    const tNext = (step + 1) * dt;
    let accepted = false;

    while (!accepted) {
      const hTry = Math.min(h, tNext - t);
      if (hTry < BDF_H_MIN) {
        throw new Error(`Step size underflow at t=${t.toFixed(3)}s. System may be stiff. Try the BDF solver.`);
      }

      // BDF-1 (backward Euler): x_{n+1} = x_n + h * f(t_{n+1}, x_{n+1})
      // Newton: residual R(x) = x - x_n - h*f(t_{n+1}, x)
      //         J = I - h * df/dx (finite-difference)
      let x = [...state];
      let converged = false;

      for (let iter = 0; iter < BDF_NEWTON_MAX_ITER; iter++) {
        const fNext = model.f(t + hTry, x);
        const R = x.map((xi, i) => xi - state[i] - hTry * fNext[i]);
        const rNorm = Math.sqrt(R.reduce((s, r) => s + r * r, 0)) / Math.max(n, 1);

        if (rNorm < BDF_NEWTON_TOL) {
          converged = true;
          break;
        }

        // Finite-difference Jacobian of f at x
        const eps = 1e-8;
        const J: number[][] = [];
        for (let j = 0; j < n; j++) {
          const xPert = [...x];
          xPert[j] += eps;
          const fPert = model.f(t + hTry, xPert);
          J.push(fPert.map((fp, i) => (fp - fNext[i]) / eps));
        }
        // J[j] is df/dx_j as column vector; build matrix M = I - h*df/dx
        // Solve M * dx = -R via Gaussian elimination (small n)
        const M: number[][] = [];
        for (let i = 0; i < n; i++) {
          const row = new Array(n).fill(0);
          row[i] = 1;
          for (let j = 0; j < n; j++) {
            row[j] -= hTry * J[j][i];
          }
          M.push(row);
        }

        const b = R.map((r) => -r);
        // Gaussian elimination with partial pivoting
        for (let col = 0; col < n; col++) {
          let pivot = col;
          for (let r = col + 1; r < n; r++) {
            if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
          }
          if (pivot !== col) {
            [M[col], M[pivot]] = [M[pivot], M[col]];
            [b[col], b[pivot]] = [b[pivot], b[col]];
          }
          const piv = M[col][col];
          if (Math.abs(piv) < 1e-15) break;
          for (let r = col + 1; r < n; r++) {
            const factor = M[r][col] / piv;
            for (let c = col; c < n; c++) M[r][c] -= factor * M[col][c];
            b[r] -= factor * b[col];
          }
        }
        const dx = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
          let s = b[i];
          for (let c = i + 1; c < n; c++) s -= M[i][c] * dx[c];
          dx[i] = M[i][i] !== 0 ? s / M[i][i] : 0;
        }

        for (let i = 0; i < n; i++) x[i] += dx[i];
      }

      if (converged) {
        state = x;
        t = t + hTry;
        actualSteps++;
        if (hTry < minStep) minStep = hTry;
        if (hTry > maxStep) maxStep = hTry;
        h = Math.min(dt, hTry * 1.5); // grow step tentatively
        accepted = true;
      } else {
        h = hTry * 0.5;
      }
    }

    // Snap t to exact dt grid to avoid drift
    t = tNext;
    time[step + 1] = t;

    if (model.applyAbsoluteState) model.applyAbsoluteState(t, state);

    for (let i = 0; i < n; i++) {
      if (!isFinite(state[i])) {
        throw new Error(
          `Simulation diverged at t=${t.toFixed(3)}s. State variable ${i} produced ${isNaN(state[i]) ? 'NaN' : 'Infinity'}. Check parameters for instability.`
        );
      }
    }

    captureScopes(t, state, step + 1);
    if (model.updatePrevOutputs) model.updatePrevOutputs(t, state);
  }

  const stats: SolverStats = {
    acceptedSteps: actualSteps,
    rejectedSteps: 0,
    minStep: actualSteps > 0 ? minStep : 0,
    maxStep: actualSteps > 0 ? maxStep : 0,
    rhsEvals: 0,
    wallMs: Date.now() - wallStart,
  };

  return { time, traces: {}, scopes, actualSteps, stats };
}